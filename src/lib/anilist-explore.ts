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
  const fallback = async () => {
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
    if (items.length === 0) {
      return await fallback()
    }
    return items
  } catch (e) {
    console.warn("AniList failed", e)
    return await fallback()
  }
}

const KITSU_UA = "Mozilla/5.0 (compatible; KuroTracker/1.0; +https://kuro-tracker.vercel.app)"

// posterImage = portrait (grid + detail cover), coverImage = landscape banner.
function mapKitsuManga(item: any) {
  const attrs = item?.attributes ?? {}
  return {
    id: parseInt(item.id, 10),
    title: attrs.canonicalTitle || attrs.titles?.en_jp || attrs.titles?.en || "?",
    imageUrl: attrs.posterImage?.large || attrs.coverImage?.original || "",
    bannerUrl: attrs.coverImage?.original ?? null,
    description: attrs.synopsis ?? "",
    score: attrs.averageRating ? Math.round(parseFloat(attrs.averageRating) * 10) / 10 : null,
    format: attrs.subtype ?? null,
    chapters: attrs.chapterCount ?? null,
    volumes: attrs.volumeCount ?? null,
    genres: [] as string[],
    tags: [] as string[],
    status: attrs.status ?? null,
    countryOfOrigin: null as string | null,
  }
}

// Detail is Kitsu-backed too: explore list ships Kitsu ids, so AniList Media(id:) can't resolve them.
export async function exploreDetail(kitsuId: number) {
  if (!Number.isSafeInteger(kitsuId)) throw new Error("bad id")
  try {
    const [res, relRes] = await Promise.all([
      fetch(`https://kitsu.io/api/edge/manga/${kitsuId}?include=categories`, {
        headers: { "User-Agent": KITSU_UA },
        signal: AbortSignal.timeout(12000),
        next: { revalidate: 3600 },
      }),
      fetch(`https://kitsu.io/api/edge/manga/${kitsuId}/media-relationships?include=destination`, {
        headers: { "User-Agent": KITSU_UA },
        signal: AbortSignal.timeout(12000),
        next: { revalidate: 3600 },
      }),
    ])
    if (!res.ok) return null
    const json = await res.json()
    if (!json.data) return null

    const categories: string[] = (json.included ?? [])
      .filter((i: any) => i.type === "categories")
      .map((i: any) => i.attributes?.title)
      .filter(Boolean)

    const RELATION: Record<string, string> = {
      sequel: "SEQUEL",
      prequel: "PREQUEL",
      side_story: "SIDE_STORY",
      spin_off: "SPIN_OFF",
    }
    const ORDER = ["SEQUEL", "PREQUEL", "SIDE_STORY", "SPIN_OFF"]
    const relJson = relRes.ok ? await relRes.json() : { data: [], included: [] }
    const destById = new Map<string, any>((relJson.included ?? []).map((i: any) => [i.id, i]))
    const relations = (relJson.data ?? [])
      .flatMap((r: any) => {
        const relation = RELATION[r.attributes?.role]
        const dest = destById.get(r.relationships?.destination?.data?.id)
        if (!relation || !dest) return []
        const mapped = { relation, ...mapKitsuManga(dest) }
        return mapped.imageUrl ? [mapped] : []
      })
      .sort((a: any, b: any) => ORDER.indexOf(a.relation) - ORDER.indexOf(b.relation))
      .slice(0, 12)

    return {
      ...mapKitsuManga(json.data),
      genres: categories.slice(0, 5),
      tags: categories.slice(0, 8),
      recommendations: [],
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
  const url = new URL("https://api.mangadex.org/manga")
  url.searchParams.set("limit", "24")
  url.searchParams.set("offset", String((page - 1) * 24))
  url.searchParams.set("includes[]", "cover_art")
  url.searchParams.set("contentRating[]", "safe")
  url.searchParams.set("order[followedCount]", "desc")
  if (mediaType === "manhwa") {
    url.searchParams.set("originalLanguage[]", "ko")
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
  url.searchParams.set("page[limit]", "20")
  url.searchParams.set("page[offset]", String((page - 1) * 20))
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
    const cover = attrs?.coverImage?.original || attrs?.posterImage?.large || null
    return {
      id: parseInt(item.id, 10),
      title: attrs?.titles?.en_jp || attrs?.titles?.en || attrs?.titles?.ja_jp || "?",
      imageUrl: cover || "",
      score: attrs?.averageRating ? Math.round(parseFloat(attrs.averageRating) * 10) / 10 : null,
      format: attrs?.subtype || attrs?.status || null,
    }
  })
}