import { ReadingStatus, MediaType } from "./types"

export const STATUS_META: Record<ReadingStatus, { label: string; colorClass: string }> = {
  want_to_read: { label: "Want to Read", colorClass: "bg-muted text-muted-foreground" },
  reading: { label: "Reading", colorClass: "bg-primary text-primary-foreground" },
  completed: { label: "Completed", colorClass: "bg-emerald-500 text-white" },
  on_hold: { label: "On Hold", colorClass: "bg-amber-500 text-white" },
  dropped: { label: "Dropped", colorClass: "bg-danger text-danger-foreground" },
}

export const TYPE_META: Record<MediaType, { label: string }> = {
  manga: { label: "Manga" },
  manhwa: { label: "Manhwa" },
  light_novel: { label: "Light Novel" },
}
