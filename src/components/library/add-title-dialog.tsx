"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useLibrary } from "@/components/library/library-provider"
import { CoverPicker } from "@/components/library/cover-picker"
import { RatingStars } from "@/components/library/rating-stars"
import { searchCovers } from "@/lib/cover-search"
import { MediaType, ReadingStatus } from "@/lib/types"
import type { CoverSearchResult } from "@/lib/cover-search"

export function AddTitleDialog() {
  const { addTitle, titles } = useLibrary()
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [titleName, setTitleName] = useState("")
  const [mediaType, setMediaType] = useState<MediaType>("manga")
  const [status, setStatus] = useState<ReadingStatus>("want_to_read")
  const [totalChapters, setTotalChapters] = useState("")
  const [totalVolumes, setTotalVolumes] = useState("")
  const [currentChapters, setCurrentChapters] = useState(0)
  const [currentVolumes, setCurrentVolumes] = useState(0)
  const [chaptersLocked, setChaptersLocked] = useState(false) // true when auto-filled
  const [volumesLocked, setVolumesLocked] = useState(false)
  const [chapterSource, setChapterSource] = useState("AniList")
  const [latestHint, setLatestHint] = useState<{ n: number; src: string } | null>(null)
  const [coverUrl, setCoverUrl] = useState("")
  const [notes, setNotes] = useState("")
  const [rating, setRating] = useState<number | null>(null)
  const [genres, setGenres] = useState<string[]>([]) // auto-filled with cover/suggestion
  const [tags, setTags] = useState<string[]>([]) // auto-filled with cover/suggestion
  // Title autocomplete (AniList): suggest full titles while typing.
  const [suggestions, setSuggestions] = useState<CoverSearchResult[]>([])
  const [showSug, setShowSug] = useState(false)
  const sugRef = useRef(0)
  const pickedRef = useRef("") // last accepted suggestion — suppress re-suggesting it

  const resetForm = () => {
    setTitleName("")
    setMediaType("manga")
    setStatus("want_to_read")
    setTotalChapters("")
    setTotalVolumes("")
    setCurrentChapters(0)
    setCurrentVolumes(0)
    setChaptersLocked(false)
    setVolumesLocked(false)
    setLatestHint(null)
    setCoverUrl("")
    setNotes("")
    setRating(null)
    setGenres([])
    setSuggestions([])
    setShowSug(false)
  }

  // Debounced suggestion lookup — same AniList search as covers, scoped by type.
  useEffect(() => {
    const q = titleName.trim()
    if (q.length < 3 || q === pickedRef.current) {
      setSuggestions([])
      return
    }
    setShowSug(true)
    const id = ++sugRef.current
    const t = setTimeout(async () => {
      const data = await searchCovers(q, mediaType)
      if (id !== sugRef.current) return // stale
      // Only suggest entries that actually complete/correct the typed text.
      setSuggestions(data.filter((r) => r.title && r.title.toLowerCase() !== q.toLowerCase()))
    }, 500)
    return () => clearTimeout(t)
  }, [titleName, mediaType])

  const applySuggestion = (s: CoverSearchResult) => {
    pickedRef.current = s.title
    setTitleName(s.title)
    setShowSug(false)
    setSuggestions([])
    setGenres(s.genres)
    setTags(s.tags ?? [])
    if (mediaType === "light_novel") {
      if (s.volumes) { setTotalVolumes(String(s.volumes)); setVolumesLocked(true) }
      if (s.chapters) { setTotalChapters(String(s.chapters)); setChaptersLocked(true); setChapterSource("AniList") }
    } else if (s.chapters) {
      setTotalChapters(String(s.chapters))
      setChaptersLocked(true)
      setChapterSource("AniList")
    }
    if (s.imageUrl) setCoverUrl(s.imageUrl)
  }

  const handleCoverMeta = (meta: CoverSearchResult | null) => {
    if (!meta) {
      setChaptersLocked(false)
      return
    }
    setGenres(meta.genres)
    setTags(meta.tags ?? [])
    // The cover result knows its true format (AniList label). Trust it over the
    // Type dropdown — e.g. picking a Light Novel cover while Type=manga flips
    // the entry to light_novel and moves the count into Total Volumes.
    const target: MediaType =
      meta.type === "Light Novel" ? "light_novel"
      : meta.type === "Manhwa" ? "manhwa"
      : "manga"
    if (target !== mediaType) {
      setMediaType(target)
      // Totals belonging to the old type no longer apply — clear before refill.
      setTotalChapters("")
      setTotalVolumes("")
      setChaptersLocked(false)
      setVolumesLocked(false)
    }
    setLatestHint(null)
    if (target === "light_novel") {
      // AniList NOVEL entries: volumes are the meaningful count
      if (meta.volumes) {
        setTotalVolumes(String(meta.volumes))
        setVolumesLocked(true)
      }
      if (meta.chapters) {
        setTotalChapters(String(meta.chapters))
        setChaptersLocked(true)
        setChapterSource("AniList")
      }
    } else {
      if (meta.chapters) {
        setTotalChapters(String(meta.chapters))
        setChaptersLocked(true)
        setChapterSource("AniList")
      }
      setVolumesLocked(false)
    }
  }

  // Live lookup: as soon as the title is long enough, ask /api/latest-chapter
  // for the current chapter count (MangaDex → AniList fallback).
  // Light novels skip it — MangaDex feed counts aren't meaningful for novels;
  // their totals come from the AniList cover meta instead.
  const lookupRef = useRef<number>(0)
  // Latest-value mirror: the fetch callback must know the CURRENT type,
  // not the one from when the effect ran (user can flip type mid-flight).
  const typeRef = useRef(mediaType)
  typeRef.current = mediaType
  useEffect(() => {
    const q = titleName.trim()
    if (q.length < 3 || chaptersLocked || mediaType === "light_novel") return

    const id = ++lookupRef.current
    const t = setTimeout(async () => {
      try {
        if (typeRef.current === "light_novel") return // type flipped while request was in flight
        const res = await fetch("/api/latest-chapter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: q }),
        })
        if (id !== lookupRef.current) return // stale response
        if (!res.ok) return
        const data = await res.json()
        if (data.chapters == null) return
        setLatestHint({ n: data.chapters, src: data.source === "mangadex" ? "MangaDex" : "AniList" })
        if (!totalChapters) setTotalChapters(String(data.chapters))
      } catch {
        // silent — hint is optional
      }
    }, 900) // wait for typing to settle; cover auto-search uses its own debounce

    return () => clearTimeout(t)
  }, [titleName, mediaType])

  // Duplicate detection: warn (don't block) when the typed name matches an
  // existing library entry, ignoring case/punctuation spacing.
  const duplicateOf = (() => {
    const q = titleName.trim().toLowerCase().replace(/\s+/g, " ")
    if (q.length < 3) return null
    return titles.find((t) => t.title.toLowerCase().replace(/\s+/g, " ") === q) ?? null
  })()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titleName.trim()) return

    setIsSaving(true)
    try {
      await addTitle({
        title: titleName.trim(),
        media_type: mediaType,
        status: status,
        total_chapters: totalChapters ? parseInt(totalChapters) : null,
        total_volumes: mediaType === "light_novel" && totalVolumes ? parseInt(totalVolumes) : null,
        current_volume: currentVolumes,
        current_chapter: currentChapters,
        cover_url: coverUrl.trim() || null,
        notes: notes.trim() || null,
        rating,
        genres: genres.length ? genres : [],
        tags: tags.length ? tags : [],
        is_favorite: false,
        started_at: status === "reading" ? new Date().toISOString() : null,
        completed_at: null,
      })
      resetForm()
      setOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Title
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Title</DialogTitle>
            <DialogDescription>
              Add a manga, manhwa, or light novel to your library.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title Name */}
            <div className="grid gap-2 relative">
              <label htmlFor="add-title-name" className="text-sm font-medium">
                Title <span className="text-danger">*</span>
              </label>
              <Input
                id="add-title-name"
                placeholder="e.g. One Piece, Solo Leveling..."
                value={titleName}
                onChange={(e) => setTitleName(e.target.value)}
                onBlur={() => setTimeout(() => setShowSug(false), 150)}
                onFocus={() => { if (suggestions.length > 0) setShowSug(true) }}
                autoFocus
                required
                autoComplete="off"
              />
              {/* AniList autocomplete dropdown */}
              {showSug && suggestions.length > 0 && (
                <div className="absolute top-full z-50 mt-9 w-full overflow-y-auto max-h-[280px] rounded-md border border-border bg-surface shadow-xl">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()} // keep input focus
                      onClick={() => applySuggestion(s)}
                      className="flex w-full items-center gap-3 border-b border-border/50 px-3 py-2 text-left last:border-0 hover:bg-surface-2 transition-colors"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- external CDN thumb */}
                      <img src={s.imageUrl} alt="" className="h-10 w-7 shrink-0 rounded-sm object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{s.title}</span>
                        <span className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          {s.type ?? mediaType.replace("_", " ")}
                          {s.chapters ? ` · ${s.chapters} ch` : ""}
                          {s.volumes ? ` · ${s.volumes} vol` : ""}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {duplicateOf && (
                <p className="text-xs text-amber-500">
                  &ldquo;{duplicateOf.title}&rdquo; is already in your library ({duplicateOf.status.replace("_", " ")}).
                  Adding again will create a duplicate.
                </p>
              )}
            </div>

            {/* Type & Status row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label htmlFor="add-title-type" className="text-sm font-medium">Type</label>
                <select
                  id="add-title-type"
                  className="h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={mediaType}
                  onChange={(e) => {
                    const next = e.target.value as MediaType
                    setMediaType(next)
                    // Switching to Light Novel: drop auto-filled chapter totals —
                    // they came from manga/manhwa lookups and don't apply.
                    if (next === "light_novel" && chaptersLocked) {
                      setTotalChapters("")
                      setChaptersLocked(false)
                      setLatestHint(null)
                    }
                  }}
                >
                  <option value="manga">Manga</option>
                  <option value="manhwa">Manhwa</option>
                  <option value="light_novel">Light Novel</option>
                </select>
              </div>

              <div className="grid gap-2">
                <label htmlFor="add-title-status" className="text-sm font-medium">Status</label>
                <select
                  id="add-title-status"
                  className="h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={status}
                  onChange={(e) => {
                    const next = e.target.value as ReadingStatus
                    setStatus(next)
                    // Completed = progress jumps to full (chapters, or volumes for LN)
                    if (next === "completed") {
                      if (totalChapters) setCurrentChapters(parseInt(totalChapters) || 0)
                      if (mediaType === "light_novel" && totalVolumes) setCurrentVolumes(parseInt(totalVolumes) || 0)
                    }
                  }}
                >
                  <option value="want_to_read">Want to Read</option>
                  <option value="reading">Reading</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="dropped">Dropped</option>
                </select>
              </div>
            </div>

            {/* Total Chapters — auto-filled from live lookup or cover selection.
                Light novels also get a volume field. */}
            <div className={mediaType === "light_novel" ? "grid grid-cols-2 gap-4" : "grid gap-2"}>
              <div className="grid gap-2">
                <label htmlFor="add-title-chapters" className="text-sm font-medium flex items-center gap-2">
                  Total Chapters
                  {chaptersLocked && totalChapters && (
                    <span className="text-xs text-muted-foreground font-normal">auto-filled from AniList</span>
                  )}
                  {!chaptersLocked && latestHint && (
                    <span className="text-xs text-muted-foreground font-normal">
                      latest: ch. {latestHint.n} ({latestHint.src}) · ongoing
                    </span>
                  )}
                </label>
                <Input
                  id="add-title-chapters"
                  type="number"
                  min="0"
                  placeholder="Optional"
                  value={totalChapters}
                  onChange={(e) => {
                    setTotalChapters(e.target.value)
                    setChaptersLocked(false)
                  }}
                />
              </div>
              {mediaType === "light_novel" && (
                <div className="grid gap-2">
                  <label htmlFor="add-title-volumes" className="text-sm font-medium flex items-center gap-2">
                    Total Volumes
                    {volumesLocked && totalVolumes && (
                      <span className="text-xs text-muted-foreground font-normal">auto-filled from AniList</span>
                    )}
                  </label>
                  <Input
                    id="add-title-volumes"
                    type="number"
                    min="0"
                    placeholder="Optional"
                    value={totalVolumes}
                    onChange={(e) => {
                      setTotalVolumes(e.target.value)
                      setVolumesLocked(false)
                    }}
                  />
                </div>
              )}
            </div>

            {/* Cover Picker — auto-searches when title is typed, scoped by Type */}
            <CoverPicker
              titleQuery={titleName}
              coverUrl={coverUrl}
              mediaType={mediaType}
              onCoverSelect={setCoverUrl}
              onMeta={handleCoverMeta}
            />

            {/* Rating — optional, same 1-10 scale as the edit page */}
            <div className="grid gap-2">
              <label htmlFor="add-title-rating" className="text-sm font-medium">
                Rating <span className="text-xs text-muted-foreground font-normal">(optional, 1&ndash;10)</span>
              </label>
              <div className="flex items-center gap-3 bg-surface border border-border p-2 rounded-md">
                <RatingStars rating={rating || 0} max={10} />
                <Input
                  id="add-title-rating"
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  placeholder="–"
                  className="h-7 w-16 text-center text-xs ml-auto"
                  value={rating ?? ""}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value)
                    setRating(isNaN(v) ? null : Math.min(10, Math.max(0, Math.round(v * 10) / 10)))
                  }}
                />
              </div>
            </div>

            {/* Genres — auto-filled from AniList when a cover/suggestion is picked */}
            {genres.length > 0 && (
              <div className="grid gap-2">
                <span className="text-sm font-medium">Genres</span>
                <div className="flex flex-wrap gap-1.5">
                  {genres.map((g) => (
                    <span key={g} className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs text-muted-foreground">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="grid gap-2">
              <label htmlFor="add-title-notes" className="text-sm font-medium">Notes</label>
              <textarea
                id="add-title-notes"
                className="min-h-[80px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="Any notes about this title..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || !titleName.trim()}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add to Library
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
