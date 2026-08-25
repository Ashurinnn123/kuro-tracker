export type MediaType = "manga" | "manhwa" | "light_novel"
export type ReadingStatus = "want_to_read" | "reading" | "completed" | "on_hold" | "dropped"

export interface Title {
  id: string
  user_id: string
  title: string
  media_type: MediaType
  cover_url: string | null
  total_chapters: number | null
  current_chapter: number
  total_volumes: number | null // light novels only
  current_volume: number | null // light novels only
  status: ReadingStatus
  genres: string[] // auto-filled from AniList on cover/suggestion pick
  rating: number | null // 1 to 10, one decimal (MyAnimeList style)
  notes: string | null
  is_favorite: boolean
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}
