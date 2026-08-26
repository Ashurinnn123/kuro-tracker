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
  const filter = FILTERS[mediaType] || FILTERS.manga
  const sort = search ? "" : ",sort:TRENDING_DESC"
  // genre_in matches ANY of the listed genres — same as AniList's filter UI.
  const genreFilter =
    genres && genres.length > 0
      ? `,genre_in:[${genres.map((g) => JSON.stringify(g)).join(",")}]`
      : ""
  // Single tag filter (AniList has hundreds; free-text keeps it simple).
  const tagFilter = tag ? `,tag_in:[${JSON.stringify(tag)}]` : ""
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(12000),
      next: { revalidate: 900 }, // cache browse results for 15 min
      body: JSON.stringify({
        query: `query($s:String,$p:Int){Page(perPage:24,page:$p){media(search:$s,type:MANGA,isAdult:false,${filter}${sort}${genreFilter}${tagFilter}){id title{romaji english} coverImage{large} description(asHtml:false) averageScore format chapters volumes genres tags{name} status}}}`,
        variables: { s: search?.trim() || null, p: page },
      }),
    })
    if (!res.ok) return []
    const json = await res.json()
    return ((json.data?.Page?.media ?? []) as RawMedia[]).map(mapMedia)
  } catch {
    return []
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
