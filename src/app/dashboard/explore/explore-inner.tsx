"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Search, Loader2 } from "lucide-react"
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

export function ExplorePageInner() {
  const [type, setType] = useState<MediaType>("manga")
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState("")
  const [items, setItems] = useState<ExploreItem[]>([])
  const [loading, setLoading] = useState(true)
  const [hasNext, setHasNext] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    const params = new URLSearchParams({ type, page: String(page) })
    if (query) params.set("search", query)
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
  }, [type, page, query])

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
              <div className="aspect-[2/3] w-full overflow-hidden bg-background">
                {/* eslint-disable-next-line @next/next/no-img-element -- external CDN cover */}
                <img src={item.imageUrl} alt={item.title} loading="lazy" className="w-full h-full object-cover" />
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
