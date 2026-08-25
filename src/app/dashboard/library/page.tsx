"use client"

import { useMemo, useEffect, useState, useCallback, Suspense, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { TitleCard } from "@/components/library/title-card"
import { LibraryToolbar } from "@/components/library/library-toolbar"
import { MediaType, ReadingStatus } from "@/lib/types"
import { useLibrary } from "@/components/library/library-provider"
import { useToast } from "@/components/ui/toast"
import { searchCovers } from "@/lib/cover-search"
import { Skeleton } from "@/components/ui/skeleton"
import { SyncAllButton } from "@/components/library/sync-all-button"

function LibraryContent() {
  const { titles, isLoading, updateTitle, refreshTitles } = useLibrary()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  // One-time backfill: old titles (added before the genres feature) have empty
  // genre arrays. Look each up on AniList once and persist the genres.
  const backfilledRef = useRef(false)
  useEffect(() => {
    if (backfilledRef.current || isLoading || titles.length === 0) return
    const missing = titles.filter((t) => !t.genres || t.genres.length === 0)
    backfilledRef.current = true
    if (missing.length === 0) return
    ;(async () => {
      let filled = 0
      for (const t of missing.slice(0, 20)) {
        try {
          const data = await searchCovers(t.title, t.media_type)
          // exact-title match first, else first result
          const hit = data.find((r) => r.title.toLowerCase() === t.title.toLowerCase()) ?? data[0]
          if (hit?.genres?.length) {
            await updateTitle(t.id, { genres: hit.genres }, { silent: true })
            filled++
          }
        } catch {
          // skip on network failure — retried next load since ref only guards this session
        }
      }
      if (filled > 0) {
        await refreshTitles()
        toast(`${filled} title${filled > 1 ? "s" : ""} got genres from AniList`)
      }
    })()
  }, [titles, isLoading, updateTitle, refreshTitles])

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "")
  const [statusFilter, setStatusFilter] = useState<ReadingStatus | "all">((searchParams.get("status") as any) || "all")
  const [typeFilter, setTypeFilter] = useState<MediaType | "all">((searchParams.get("type") as any) || "all")
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "updated_desc")
  const [genreFilter, setGenreFilter] = useState<string[]>([])

  // Genres actually present in the library, alphabetical
  const availableGenres = useMemo(() => {
    const set = new Set<string>()
    titles.forEach((t) => t.genres?.forEach((g) => g && set.add(g)))
    return [...set].sort()
  }, [titles])

  // Sync state to URL without causing constant re-renders
  const updateUrl = useCallback((q: string, status: string, type: string, sort: string) => {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (status !== "all") params.set("status", status)
    if (type !== "all") params.set("type", type)
    if (sort !== "updated_desc") params.set("sort", sort)
    
    router.replace(`/dashboard/library?${params.toString()}`, { scroll: false })
  }, [router])

  // Simple debounce for search
  useEffect(() => {
    const timer = setTimeout(() => {
      updateUrl(searchQuery, statusFilter, typeFilter, sortBy)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, statusFilter, typeFilter, sortBy, updateUrl])

  const filteredAndSortedTitles = useMemo(() => {
    let result = [...titles]

    // Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(t => t.title.toLowerCase().includes(q))
    }
    if (statusFilter !== "all") {
      result = result.filter(t => t.status === statusFilter)
    }
    if (typeFilter !== "all") {
      result = result.filter(t => t.media_type === typeFilter)
    }
    if (genreFilter.length > 0) {
      // AND semantics: title must have every selected genre
      result = result.filter(t => genreFilter.every((g) => t.genres?.includes(g)))
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "title_asc":
          return a.title.localeCompare(b.title)
        case "rating_desc":
          return (b.rating || 0) - (a.rating || 0)
        case "updated_desc":
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      }
    })

    return result
  }, [titles, searchQuery, statusFilter, typeFilter, sortBy, genreFilter])

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 mt-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[2/3] w-full" />
        ))}
      </div>
    )
  }

  return (
    <>
      <LibraryToolbar
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        typeFilter={typeFilter} setTypeFilter={setTypeFilter}
        sortBy={sortBy} setSortBy={setSortBy}
        genreFilter={genreFilter} setGenreFilter={setGenreFilter}
        availableGenres={availableGenres}
      />

      <div className="flex-1 mt-6">
        {filteredAndSortedTitles.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 text-muted-foreground">
            No titles found matching your filters.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filteredAndSortedTitles.map(title => (
              <TitleCard key={title.id} title={title} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export default function LibraryPage() {
  return (
    <div className="space-y-6 pb-8 h-full flex flex-col">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your Library</h1>
          <p className="text-muted-foreground">Manage and track your reading progress.</p>
        </div>
        <div className="flex items-center gap-2">
          <SyncAllButton />
        </div>
      </div>
      <Suspense fallback={<Skeleton className="h-10 w-full" />}>
        <LibraryContent />
      </Suspense>
    </div>
  )
}

