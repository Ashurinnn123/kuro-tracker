// AniList GraphQL — free, no auth, 90 req/min. Server-side only.
// Powers the Explore page: browse + detail + recommendations + relations.

import { MediaType } from "./types"

// Tabs partition by FORMAT first (a JP light novel must not leak into the
// manga tab), then by country for manga vs manhwa.
const FILTERS: Record<MediaType, string> = {
  manga: 'countryOfOrigin: JP, format_in:[MANGA,ONE_SHOT]',
  manhwa: 'countryOfOrigin: KR, format_in:[MANGA,ONE_SHOT]',
  light_novel: "format: NOVEL",
}

// Jikan genre ID mapping (MyAnimeList genre IDs)
const genreNameToId: Record<string, number> = {
  Action: 1,
  Adventure: 2,
  Comedy: 4,
  Drama: 8,
  Ecchi: 9,
  Fantasy: 10,
  Horror: 14,
  Mecha: 18,
  Music: 19,
  Mystery: 7,
  Psychological: 40,
  Romance: 22,
  "Sci-Fi": 24,
  "Slice of Life": 36,
  Sports: 30,
  Supernatural: 37,
  Thriller: 41,
}

interface RawMedia {
  id: number
  title: { romaji: string | null; english: string | null }
  coverImage: { large: string } | null
  bannerImage: string | null
  description: string | null
  averageScore: number | null
  format: string | null
  chapters: number | null
  volumes: number | null
  genres: string[] | null
  tags: { name: string }[] | null
  status: string | null
  countryOfOrigin?: string | null
}

function mapMedia(item: RawMedia) {
  return {
    id: item.id,
    title: item.title.romaji || item.title.english || "?",
    imageUrl: item.coverImage?.large || "",
    bannerUrl: item.bannerImage || null,
    // Strip HTML tags from AniList descriptions (asHtml:false keeps <br>).
    description: (item.description ?? "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .trim(),
    score: item.averageScore, // 100-scale, displayed as "86%"
    format: item.format,
    chapters: item.chapters,
    volumes: item.volumes,
    genres: item.genres ?? [],
    tags: (item.tags ?? [])
      .map((t) => t.name)
      .filter((name) => {
        const n = name.toLowerCase()
        // Filter out highly specific tropes, controversial, meta, and adult/sensitive tags.
        const blocked = [
          "heterosexual", "bisexual", "homosexual", "lgbtq+ themes",
          "long strip", "cgi", "full color", "primarily female cast",
          "primarily male cast", "primarily child cast", "primarily teen cast",
          "slavery", "polyamorous", "female harem", "male harem", "harem",
          "nudity", "incest", "gore", "bdsm", "crossdressing", "nekomimi",
          "meta", "otaku culture", "language barrier", "matriarchy", "patriarchy"
        ]
        return !blocked.includes(n)
      })
      .slice(0, 8), // cap at 8 most relevant tags
    status: item.status,
    countryOfOrigin: item.countryOfOrigin ?? null,
  }
}

export async function exploreList(mediaType: MediaType, page: number, search?: string, genres?: string[], tag?: string) {
  if (!Number.isInteger(page) || page < 1 || page > 10) throw new Error("bad page")
  try {
    const filter = FILTERS[mediaType] || FILTERS.manga
    const sort = search ? "" : ",sort:TRENDING_DESC"
    const genreFilter =
      genres && genres.length > 0
        ? `,genre_in:[${genres.map((g) => JSON.stringify(g)).join(",")}]`
        : ""
    const tagFilter = tag ? `,tag_in:[${JSON.stringify(tag)}]` : ""
    const searchArg = search ? `search:$s,` : ""
    const query = `query(${search ? '$s:String,' : ''}$p:Int){Page(perPage:24,page:$p){media(${searchArg}type:MANGA,isAdult:false,${filter}${sort}${genreFilter}${tagFilter}){id title{romaji english} coverImage{large} description(asHtml:false) averageScore format chapters volumes genres tags{name} status}}}`
    const variables: any = { p: page }
    if (search) variables.s = search.trim()
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(12000),
      next: { revalidate: 900 },
      body: JSON.stringify({ query, variables }),
    })
    if (!res.ok) throw new Error(`AniList error ${res.status}`)
    const json = await res.json()
    const items = ((json.data?.Page?.media ?? []) as RawMedia[]).map(mapMedia)
    return items
  } catch (e) {
    console.warn("AniList failed", e)
    // Try Kitsu first (most reliable)
    try {
      const kitsu = await kitsuExplore(mediaType, page, search)
      if (kitsu.length > 0) return kitsu
    } catch {}
    console.warn("Kitsu failed, trying Jikan fallback")
    try {
      const jikan = await jikanExplore(mediaType, page, search, genres)
      if (jikan.length > 0) return jikan
    } catch {}
    console.warn("Jikan failed, using MangaDex fallback")
    return await mangaDexExplore(mediaType, page, search)
  }
}

export async function exploreDetail(anilistId: number) {
  if (!Number.isSafeInteger(anilistId)) throw new Error("bad id")
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(12000),
      next: { revalidate: 3600 }, // detail pages barely change — cache 1 hour
      body: JSON.stringify({
        query: `query($id:Int){Media(id:$id,type:MANGA){
          id title{romaji english} coverImage{large} bannerImage description(asHtml:false)
          averageScore format chapters volumes genres tags{name} status countryOfOrigin
          recommendations(perPage:8){nodes{mediaRecommendation{id title{romaji english} coverImage{large} averageScore format}}}
          relations{edges{relationType(version:2) node{id type title{romaji english} coverImage{large} format}}}
        }}`,
        variables: { id: anilistId },
      }),
    })
    if (!res.ok) return null
    const json = await res.json()
    const m = json.data?.Media as (RawMedia & {
      recommendations?: { nodes: { mediaRecommendation: RawMedia | null }[] }
      relations?: { edges: { relationType: string; node: RawMedia & { type: string } }[] }
    }) | undefined
    if (!m) return null

    // Sequel/prequel edges — filter to manga-type nodes only.
    // Sequel/prequel first; cap at 12 so spin-off floods don't bury them.
    const RELATION_PRIORITY = ["SEQUEL", "PREQUEL", "SIDE_STORY", "SPIN_OFF"]
    const relations = (m.relations?.edges ?? [])
      .filter((e) => e.node?.type === "MANGA" && RELATION_PRIORITY.includes(e.relationType))
      .sort((a, b) => RELATION_PRIORITY.indexOf(a.relationType) - RELATION_PRIORITY.indexOf(b.relationType))
      .slice(0, 12)
      .map((e) => ({ relation: e.relationType, ...mapMedia(e.node)! }))
      .filter((r) => r.imageUrl)

    return {
      ...mapMedia(m),
      recommendations: (m.recommendations?.nodes ?? [])
        .map((n) => n.mediaRecommendation)
        .filter((r): r is RawMedia => r != null && !!r.coverImage?.large)
        .map(mapMedia),
      relations,
    }
  } catch {
    return null
  }
}

async function jikanExplore(mediaType: MediaType, page: number, search?: string, genres?: string[]) {
  const typeMap: Record<MediaType, string> = {
    manga: "manga",
    manhwa: "manhwa",
    light_novel: "lightnovel",
  }
  const url = new URL("https://api.jikan.moe/v4/manga")
  url.searchParams.set("page", String(page))
  url.searchParams.set("limit", "24")
  url.searchParams.set("order_by", "score")
  url.searchParams.set("sort", "desc")
  const jikanType = typeMap[mediaType] || "manga"
  url.searchParams.set("type", jikanType)
  if (search) {
    url.searchParams.set("q", search.trim())
  }
  if (genres && genres.length > 0) {
    const ids = genres.map(g => genreNameToId[g]).filter(id => id != null)
    if (ids.length > 0) {
      url.searchParams.set("genres", ids.join(","))
    }
  }
  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(12000),
    next: { revalidate: 900 },
  })
  if (!res.ok) throw new Error(`Jikan error ${res.status}`)
  const json = await res.json()
  const data = json.data || []
  return data.map((item: any) => ({
    id: item.mal_id,
    title: item.title || "?",
    imageUrl: item.images?.jpg?.image_url || "",
    score: item.score ? Math.round(item.score * 10) : null,
    format: item.type || null,
  }))
}

async function mangaDexExplore(mediaType: MediaType, page: number, search?: string) {
  const typeMap: Record<MediaType, string> = {
    manga: "manga",
    manhwa: "manhwa",
    light_novel: "light_novel",
  }
  const url = new URL("https://api.mangadex.org/manga")
  url.searchParams.set("limit", "24")
  url.searchParams.set("offset", String((page - 1) * 24))
  const mdType = typeMap[mediaType] || "manga"
  if (mdType === "manga") {
    url.searchParams.set("includes", "cover_art")
  } else if (mdType === "manhwa") {
    url.searchParams.set("contentRating", "safe")
    url.searchParams.set("publicationDemographic", "manhwa")
  } else if (mdType === "light_novel") {
    url.searchParams.set("contentRating", "safe")
    url.searchParams.set("publicationDemographic", "light_novel")
  }
  if (search) {
    url.searchParams.set("title", search.trim())
  }
  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(12000),
    next: { revalidate: 900 },
  })
  if (!res.ok) throw new Error(`MangaDex error ${res.status}`)
  const json = await res.json()
  const data = json.data || []
  return data.map((item: any) => {
    const cover = item.relationships?.find((r: any) => r.type === "cover_art")?.id
    return {
      id: item.id,
      title: item.attributes?.title?.en || Object.values(item.attributes?.title || {})[0] || "?",
      imageUrl: cover ? `https://uploads.mangadex.org/covers/${item.id}/${cover}.256.jpg` : "",
      score: null,
      format: item.attributes?.publicationDemographic || item.attributes?.contentRating || null,
    }
  })
}

async function kitsuExplore(mediaType: MediaType, page: number, search?: string) {
  // Kitsu API fallback
  const url = new URL("https://kitsu.io/api/edge/manga")
  url.searchParams.set("page[limit]", "24")
  url.searchParams.set("page[offset]", String((page - 1) * 24))
  // Map media type to Kitsu subtype
  const subtypeMap: Record<MediaType, string> = {
    manga: "manga",
    manhwa: "manhwa",
    light_novel: "novel",
  }
  url.searchParams.set("filter[subtype]", subtypeMap[mediaType] || "manga")
  if (search) {
    url.searchParams.set("filter[text]", search.trim())
  }
  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(12000),
    next: { revalidate: 900 },
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; KuroTracker/1.0; +https://kuro-tracker.vercel.app)"
    }
  })
  if (!res.ok) throw new Error(`Kitsu error ${res.status}`)
  const json = await res.json()
  const data = json.data || []
  return data.map((item: any) => {
    const attrs = item.attributes
    const cover = attrs?.coverImage?.original || null
    return {
      id: parseInt(item.id, 10),
      title: attrs?.titles?.en_jp || attrs?.titles?.en || attrs?.titles?.ja_jp || "?",
      imageUrl: cover || "",
      score: attrs?.averageRating ? Math.round(parseFloat(attrs.averageRating) * 10) / 10 : null,
      format: attrs?.subtype || attrs?.status || null,
    }
  })
}