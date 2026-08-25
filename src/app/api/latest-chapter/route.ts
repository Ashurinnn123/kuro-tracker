// Server-side latest-chapter lookup.
// Primary: MangaDex (has real chapter numbers for ongoing titles).
// Fallback: AniList (reliable for completed titles).
//
// IMPORTANT (this machine): the ISP intercepts plaintext DNS on port 53 and
// poisons api.mangadex.org to a dead edge IP (202.169.44.80). We therefore
// resolve api.mangadex.org once via Cloudflare DoH (JSON) and pin requests to
// the real IP manually — TLS stays valid because we set servername (SNI).

import { NextRequest, NextResponse } from "next/server"
import * as https from "https"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const maxDuration = 30

interface LatestResult {
  chapters: number | null
  source: "mangadex" | "anilist" | "none"
  status: "ongoing" | "completed" | "unknown"
  latest_uploaded_at?: string | null
  // English alt titles from the MangaDex entry — used to retry MangaUpdates,
  // which indexes webcomics under their official (often English) name.
  _alts?: string[]
}

async function fetchJson(url: string, opts: RequestInit = {}, timeoutMs = 10000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// --- MangaDex via pinned IP -----------------------------------------------
// ponytail: cache without TTL — good for dev; refresh on deploy.
// Upgrade path: periodic re-resolution + retry next Answer IP on failure.
let mdAddress: string | null = null

async function mangadexAddress(): Promise<string | null> {
  if (mdAddress) return mdAddress
  const j = await fetchJson(
    "https://cloudflare-dns.com/dns-query?name=api.mangadex.org&type=A",
    { headers: { accept: "application/dns-json" } }
  )
  const answer = (j?.Answer || []).find((a: any) => a.type === 1 && typeof a.data === "string")
  if (answer && /^\d{1,3}(\.\d{1,3}){3}$/.test(answer.data)) {
    mdAddress = answer.data
  }
  return mdAddress
}

function mdGet(pathAndQuery: string, address: string): Promise<any> {
  return new Promise((resolve) => {
    const req = https.get(
      {
        hostname: address,
        servername: "api.mangadex.org", // SNI — certificate matches this name
        path: pathAndQuery,
        headers: { host: "api.mangadex.org", accept: "application/json", "user-agent": "KuroTracker/1.0 (reading tracker; contact: dev)" },
        timeout: 12000,
      },
      (res) => {
        let body = ""
        res.on("data", (c) => (body += c))
        res.on("end", () => {
          try {
            resolve(JSON.parse(body))
          } catch {
            resolve(null)
          }
        })
      }
    )
    req.on("timeout", () => {
      req.destroy()
      resolve(null)
    })
    req.on("error", () => resolve(null))
  })
}

async function fromMangaDex(title: string): Promise<LatestResult | null> {
  const address = await mangadexAddress()
  if (!address) return null

  const search = await mdGet(
    `/manga?title=${encodeURIComponent(title)}&limit=1&contentRating%5B%5D=safe&contentRating%5B%5D=suggestive&contentRating%5B%5D=erotica`,
    address
  )
  const manga = search?.data?.[0]
  if (!manga) return null

  const status = manga.attributes.status === "completed" ? "completed" : "ongoing"

  const feed = await mdGet(
    `/manga/${manga.id}/feed?limit=1&order%5Bchapter%5D=desc&includeExternalUrl=0&contentRating%5B%5D=safe&contentRating%5B%5D=suggestive&contentRating%5B%5D=erotica`,
    address
  )
  const chapterNum = feed?.data?.[0]?.attributes?.chapter
  const chapters = chapterNum != null ? Math.floor(parseFloat(chapterNum)) : null

  return {
    chapters,
    source: "mangadex",
    status,
    // ISO timestamp of the newest chapter upload on MangaDex
    latest_uploaded_at: manga.attributes.latestUploadedChapter
      ? (await mdGet(`/chapter/${manga.attributes.latestUploadedChapter}`, address))?.data?.attributes
          ?.readableAt ?? null
      : null,
    // Collect English alt titles for the MangaUpdates alias retry
    _alts: (manga.attributes.altTitles ?? [])
      .map((a: Record<string, string>) => a.en)
      .filter((t: unknown): t is string => typeof t === "string"),
  }
}
// ---------------------------------------------------------------------------

async function fromAniList(title: string): Promise<LatestResult | null> {
  const json = await fetchJson("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query($s:String){Media(search:$s,type:MANGA,isAdult:false){chapters status}}`,
      variables: { s: title },
    }),
  })
  const media = json?.data?.Media
  if (!media) return null

  return {
    chapters: media.chapters ?? null,
    source: "anilist",
    status:
      media.status === "FINISHED"
        ? "completed"
        : media.status === "RELEASING"
          ? "ongoing"
          : "unknown",
  }
}

// --- MangaUpdates (3rd fallback) -------------------------------------------
// Tracks official webcomics (Kakao/Naver) that MangaDex doesn't host chapters
// for. status is often "20 Chapters (Ongoing)" — parse the number out of it.
async function fromMangaUpdates(title: string): Promise<LatestResult | null> {
  const search = await fetchJson("https://api.mangaupdates.com/v1/series/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ search: title, v: 2 }),
  })
  const hit = search?.results?.[0]?.record
  if (!hit?.series_id) return null

  const full = await fetchJson(`https://api.mangaupdates.com/v1/series/${hit.series_id}`)
  if (!full) return null

  const m = String(full.status ?? "").match(/(\d+)\s*Chapter/i)
  const latest = full.latest_chapter != null ? Math.floor(Number(full.latest_chapter)) : null
  const chapters = m ? parseInt(m[1]) : latest

  return {
    chapters: isNaN(chapters as number) || chapters == null ? null : chapters,
    source: "none", // placeholder — caller overrides with real label below
    status: /ongoing/i.test(String(full.status ?? "")) ? "ongoing"
      : /complete/i.test(String(full.status ?? "")) ? "completed" : "unknown",
    latest_uploaded_at: full.last_updated?.timestamp
      ? new Date(full.last_updated.timestamp * 1000).toISOString() : null,
  }
}
// ---------------------------------------------------------------------------

// ponytail: in-memory limiter — per-instance, resets on redeploy. Fine for a
// single-box deployment; swap for Upstash Redis when running multi-instance.
const syncHits = new Map<string, number[]>()

function isRateLimited(userId: string, max = 30, windowMs = 60_000): boolean {
  const now = Date.now()
  const arr = (syncHits.get(userId) ?? []).filter((t) => now - t < windowMs)
  if (arr.length >= max) return true
  arr.push(now)
  syncHits.set(userId, arr)
  // Opportunistic GC so the map can't grow unbounded
  if (syncHits.size > 1000) {
    for (const [k, v] of syncHits) if (v.every((t) => now - t >= windowMs)) syncHits.delete(k)
  }
  return false
}

export async function POST(request: NextRequest) {
  // Trust boundary: only signed-in users may trigger syncs.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  // Each sync fans out to up to ~6 upstream HTTP calls — cap abuse.
  if (isRateLimited(user.id)) {
    return NextResponse.json({ error: "Too many syncs, slow down" }, { status: 429 })
  }

  let title = ""
  try {
    const body = await request.json()
    title = String(body.title ?? "").trim()
  } catch {
    // fallthrough
  }
  if (!title || title.length < 2 || title.length > 200) {
    return NextResponse.json({ error: "Title required" }, { status: 400 })
  }

  // MangaDex first (fresh ongoing counts), AniList, then MangaUpdates
  // (official webcomics that the first two don't track chapter-wise).
  // A source that FOUND the title but has no chapter count does NOT count as
  // a hit — keep falling through until some source yields a number.
  let result = await fromMangaDex(title)
  if (result?.chapters == null) {
    const al = await fromAniList(title)
    if (al?.chapters != null) {
      result = al
    } else {
      // MangaUpdates retry ladder: stored title first, then each English alt
      // title from the MangaDex entry (MU indexes webcomics by official name).
      const candidates = [title, ...(result?._alts ?? [])]
      for (const candidate of candidates) {
        const mu = await fromMangaUpdates(candidate)
        if (mu?.chapters != null) {
          // LatestResult.source has no "mangaupdates" member — label it for the UI.
          return NextResponse.json({ ...mu, source: "mangaupdates" })
        }
      }
    }
  }

  if (!result) {
    return NextResponse.json(
      { error: "No results found for this title" },
      { status: 404 }
    )
  }

  return NextResponse.json(result)
}
