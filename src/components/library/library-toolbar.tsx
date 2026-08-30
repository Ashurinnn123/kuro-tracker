"use client"

import { Search, Tag, X } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { MediaType, ReadingStatus } from "@/lib/types"

// AniList genre palette (subset used for chip colors)
const GENRE_COLORS: Record<string, string> = {
  Action: "#ff6740", Adventure: "#ff9a74", Comedy: "#f3ce48", Drama: "#f8756e",
  Ecchi: "#ff9ac4", Fantasy: "#5f96fb", Horror: "#42ecf5", "Mahou Shoujo": "#7ef1c2",
  Mecha: "#94db03", Music: "#7cf", Mystery: "#9c92f3", Psychological: "#f35d94",
  Romance: "#fa90e3", "Sci-Fi": "#71d27d", "Slice of Life": "#8af13c",
  Sports: "#fbaaab", Supernatural: "#a483e8", Thriller: "#78e65f",
}
const fallbackColor = "#60a5fa"

interface LibraryToolbarProps {
  searchQuery: string
  setSearchQuery: (q: string) => void
  statusFilter: ReadingStatus | "all"
  setStatusFilter: (s: ReadingStatus | "all") => void
  typeFilter: MediaType | "all"
  setTypeFilter: (t: MediaType | "all") => void
  sortBy: string
  setSortBy: (s: string) => void
  genreFilter: string[]
  setGenreFilter: (g: string[]) => void
  availableGenres: string[]
  hiddenStatusFilter?: boolean
}

export function LibraryToolbar({
  searchQuery, setSearchQuery,
  statusFilter, setStatusFilter,
  typeFilter, setTypeFilter,
  sortBy, setSortBy,
  genreFilter, setGenreFilter,
  availableGenres,
  hiddenStatusFilter
}: LibraryToolbarProps) {
  const [genreOpen, setGenreOpen] = useState(false)
  const genreRef = useRef<HTMLDivElement>(null)

  // Close genre popover on outside click
  useEffect(() => {
    if (!genreOpen) return
    const onClick = (e: MouseEvent) => {
      if (genreRef.current && !genreRef.current.contains(e.target as Node)) setGenreOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [genreOpen])

  const toggleGenre = (name: string) => {
    setGenreFilter(
      genreFilter.includes(name) ? genreFilter.filter((g) => g !== name) : [...genreFilter, name]
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: search + selects */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search titles..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {!hiddenStatusFilter && (
            <select
              className="h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">All Statuses</option>
              <option value="reading">Reading</option>
              <option value="completed">Completed</option>
              <option value="want_to_read">Want to Read</option>
              <option value="on_hold">On Hold</option>
              <option value="dropped">Dropped</option>
            </select>
          )}

          <select
            className="h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
          >
            <option value="all">All Types</option>
            <option value="manga">Manga</option>
            <option value="manhwa">Manhwa</option>
            <option value="light_novel">Light Novel</option>
          </select>

          <select
            className="h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="updated_desc">Recently Updated</option>
            <option value="title_asc">Title (A-Z)</option>
            <option value="rating_desc">Rating (High-Low)</option>
          </select>
        </div>
      </div>

      {/* Row 2: genres (wraps down, never clipped) — only genres present in the library */}
      {availableGenres.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" ref={genreRef}>
          <Button
            variant="outline"
            size="sm"
            className={`h-8 shrink-0 gap-1.5 font-mono text-[11px] uppercase tracking-widest ${genreFilter.length > 0 ? "border-primary text-primary" : ""}`}
            onClick={() => setGenreOpen(!genreOpen)}
          >
            <Tag className="h-3.5 w-3.5" />
            Genres{genreFilter.length > 0 ? ` (${genreFilter.length})` : ""}
          </Button>

          {/* All library genres as toggle chips */}
          {availableGenres.map((name) => {
            const active = genreFilter.includes(name)
            const color = GENRE_COLORS[name] ?? fallbackColor
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggleGenre(name)}
                className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80"
                style={
                  active
                    ? { backgroundColor: color, color: "#0C1321" }
                    : { border: `1px solid ${color}55`, color }
                }
              >
                {name}
              </button>
            )
          })}

          {genreFilter.length > 0 && (
            <button
              type="button"
              onClick={() => setGenreFilter([])}
              className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}
