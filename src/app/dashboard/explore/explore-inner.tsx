"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Search, Loader2, ChevronDown, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { MediaType } from "@/lib/types"

interface ExploreItem {
  id: number
  title: string
  imageUrl: string
  score: number | null
  format: string | null
}

const TABS: { key: MediaType; label: string }[] = [
  { key: "manga", label: "Manga" },
  { key: "manhwa", label: "Manhwa" },
  { key: "light_novel", label: "Light Novel" },
]

// AniList's fixed genre enum — multi-select in the Genres dropdown.
const GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Ecchi", "Fantasy", "Horror",
  "Mahou Shoujo", "Mecha", "Music", "Mystery", "Psychological", "Romance",
  "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller",
]

// Popular AniList content tags for quick picking — free-text covers the rest.
const POPULAR_TAGS = [
  "Time Loop", "Isekai", "School", "Vampires", "Zombies", "Cultivation",
  "Survival", "Revenge", "Office Lady", "Cooking", "Ghosts", "Memory Loss",
  "Body Swapping", "Battle Royale", "Archery", "Boxing", "Idol", "Trains",
]

export function ExplorePageInner() {
  const [type, setType] = useState<MediaType>("manga")
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState("")
  const [genre, setGenre] = useState<string[]>([])
  const [genreOpen, setGenreOpen] = useState(false)
  const genreRef = useRef<HTMLDivElement>(null)
  const [tag, setTag] = useState<string | null>(null)
  const [tagOpen, setTagOpen] = useState(false)
  const tagRef = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState<ExploreItem[]>([])
  const [loading, setLoading] = useState(true)
  const [hasNext, setHasNext] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    const params = new URLSearchParams({ type, page: String(page) })
    if (query) params.set("search", query)
    genre.forEach((g) => params.append("genre", g))
    if (tag) params.set("tag", tag)
    fetch(`/api/explore?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return
        const next: ExploreItem[] = data.items ?? []
        setItems(next)
        // Full page = probably more; last page returns fewer than 24.
        setHasNext(next.length >= 24)
      })
      .catch(() => alive && setItems([]))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [type, page, query, genre, tag])

  // Close either dropdown when clicking outside of it.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (genreOpen && genreRef.current && !genreRef.current.contains(e.target as Node)) {
        setGenreOpen(false)
      }
      if (tagOpen && tagRef.current && !tagRef.current.contains(e.target as Node)) {
        setTagOpen(false)
      }
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [genreOpen, tagOpen])

  const toggleGenre = (g: string) =>
    setGenre((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]))

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Explore</h1>
      </div>

      {/* Type tabs + search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border p-0.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setType(t.key)
                setPage(1)
              }}
              className={`rounded-md px-4 py-1.5 font-mono text-xs uppercase tracking-widest transition-colors ${
                type === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {/* Genres dropdown — AniList style multi-select */}
        <div className="relative" ref={genreRef}>
          <button
            onClick={() => setGenreOpen((o) => !o)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors ${
              genre.length > 0
                ? "border-primary text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            Genres{genre.length > 0 && ` · ${genre.length}`}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${genreOpen ? "rotate-180" : ""}`} />
          </button>
          {genreOpen && (
            <div className="absolute left-0 z-20 mt-2 w-64 rounded-lg border border-border bg-surface p-2 shadow-xl">
              <p className="px-2 pb-1 pt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Genres
              </p>
              <div className="max-h-64 overflow-y-auto">
                {GENRES.map((g) => {
                  const active = genre.includes(g)
                  return (
                    <button
                      key={g}
                      onClick={() => {
                        toggleGenre(g)
                        setPage(1)
                      }}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                        active ? "text-primary" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                      }`}
                    >
                      {g}
                      {active && <Check className="h-4 w-4" />}
                    </button>
                  )
                })}
              </div>
              {genre.length > 0 && (
                <button
                  onClick={() => {
                    setGenre([])
                    setPage(1)
                  }}
                  className="mt-1 w-full rounded-md border-t border-border px-2 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-danger"
                >
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>
        {/* Tag dropdown — single-select, free text + popular suggestions */}
        <div className="relative" ref={tagRef}>
          <button
            onClick={() => setTagOpen((o) => !o)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors ${
              tag
                ? "border-primary text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {tag ? `Tag · ${tag}` : "Tag"}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${tagOpen ? "rotate-180" : ""}`} />
          </button>
          {tagOpen && (
            <div className="absolute left-0 z-20 mt-2 w-64 rounded-lg border border-border bg-surface p-2 shadow-xl">
              <p className="px-2 pb-1 pt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Content tag (AniList)
              </p>
              <Input
                value={tag ?? ""}
                onChange={(e) => setTag(e.target.value || null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPage(1)
                    setTagOpen(false)
                  }
                }}
                placeholder="Type a tag…"
                className="mb-2 h-8 text-sm"
              />
              <div className="max-h-56 overflow-y-auto">
                {POPULAR_TAGS.filter((t) => t !== tag).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTag(t)
                      setPage(1)
                      setTagOpen(false)
                    }}
                    className="w-full rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
                  >
                    {t}
                  </button>
                ))}
              </div>
              {tag && (
                <button
                  onClick={() => {
                    setTag(null)
                    setPage(1)
                  }}
                  className="mt-1 w-full rounded-md border-t border-border px-2 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-danger"
                >
                  Clear tag
                </button>
              )}
            </div>
          )}
        </div>
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setQuery(search.trim())
                setPage(1)
              }
            }}
            placeholder="Search titles… (Enter)"
            className="pl-9"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">No results.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/explore/${item.id}`}
              className="group overflow-hidden rounded-lg border border-border bg-surface transition-transform hover:-translate-y-0.5"
            >
              <div className="overflow-hidden bg-background">
                {/* eslint-disable-next-line @next/next/no-img-element -- external CDN cover */}
                <img src={item.imageUrl} alt={item.title} loading="lazy" className="w-full h-auto" />
              </div>
              <div className="p-2">
                <p className="truncate text-xs font-medium">{item.title}</p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {item.score != null ? `${item.score}%` : "—"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && items.length > 0 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-md border border-border px-3 py-1.5 font-mono text-xs uppercase tracking-widest disabled:opacity-40 hover:bg-surface-2"
          >
            Prev
          </button>
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Page {page}</span>
          <button
            disabled={!hasNext}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-border px-3 py-1.5 font-mono text-xs uppercase tracking-widest disabled:opacity-40 hover:bg-surface-2"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
