// AniList GraphQL — free, no auth, generous rate limits (90 req/min)
// Docs: https://docs.anilist.co/
// Replaces Jikan (frequent 504s).
// Auto-search differentiates by content type:
//   manga       → countryOfOrigin: JP
//   manhwa      → countryOfOrigin: KR
//   light_novel → format: NOVEL

import { MediaType } from "./types"

export interface CoverSearchResult {
  id: number
  title: string
  imageUrl: string
  score: number | null
  type: string | null
  chapters: number | null
  volumes: number | null
  genres: string[]
  tags: string[]
  countryOfOrigin?: string | null
}

const FILTERS: Record<MediaType, string> = {
  manga: 'countryOfOrigin: JP, format_in:[MANGA,ONE_SHOT]',
  manhwa: 'countryOfOrigin: KR, format_in:[MANGA,ONE_SHOT]',
  light_novel: "format: NOVEL",
}

export async function searchCovers(
  query: string,
  mediaType: MediaType = "manga"
): Promise<CoverSearchResult[]> {
  if (!query || query.trim().length < 2) return []

  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // ponytail: fixed 12s budget; add retry/backoff if AniList gets flakier
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify({
        query: `query($s:String){Page(perPage:6){media(search:$s,type:MANGA,isAdult:false,${FILTERS[mediaType] || ""}){
          id title{romaji english} coverImage{large} averageScore format countryOfOrigin chapters volumes genres tags{name}
        }}}`,
        variables: { s: query.trim() },
      }),
    })

    if (!res.ok) return []

    const json = await res.json()
    const results: CoverSearchResult[] = (json.data?.Page?.media || []).map((item: any) => ({
      id: item.id,
      // Romaji first — canonical naming (user preference), English only as fallback.
      title: item.title.romaji || item.title.english,
      imageUrl: item.coverImage?.large || "",
      score: item.averageScore ? item.averageScore / 20 : null, // 100-scale → 5-scale
      type: labelFor(item.format, item.countryOfOrigin),
      chapters: item.chapters ?? null,
      volumes: item.volumes ?? null,
      genres: (item.genres ?? []) as string[],
      tags: ((item.tags ?? []) as { name: string }[])
        .map((t) => t.name)
        .filter((name) => {
          const n = name.toLowerCase()
          return ![
            "heterosexual", "bisexual", "homosexual", "lgbtq+ themes",
            "long strip", "cgi", "full color", "primarily female cast",
            "primarily male cast", "primarily child cast", "primarily teen cast"
          ].includes(n)
        }),
      countryOfOrigin: item.countryOfOrigin ?? null,
    }))

    return results.filter((r) => r.imageUrl)
  } catch {
    // Timeout/network failure — return empty, the UI already handles "no results".
    // No console.error: Next dev overlay treats it as a crash.
    return []
  }
}

function labelFor(format: string | null, country: string | null): string {
  if (format === "NOVEL") return "Light Novel"
  if (country === "KR") return "Manhwa"
  if (country === "CN" || country === "TW") return "Manhua"
  return "Manga"
}
