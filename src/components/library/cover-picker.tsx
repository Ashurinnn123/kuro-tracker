"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Loader2, ImageOff, Link as LinkIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { searchCovers, CoverSearchResult } from "@/lib/cover-search"
import { cn } from "@/lib/utils"

interface CoverPickerProps {
  titleQuery: string
  coverUrl: string
  mediaType?: string
  onCoverSelect: (url: string) => void
  onMeta?: (meta: CoverSearchResult | null) => void
}

export function CoverPicker({ titleQuery, coverUrl, mediaType = "manga", onCoverSelect, onMeta }: CoverPickerProps) {
  const [results, setResults] = useState<CoverSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-search when titleQuery changes (debounced).
  // Skip entirely if a cover is already set — no wasted Jikan call on page open.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (coverUrl || !titleQuery || titleQuery.trim().length < 2) {
      setResults([])
      setHasSearched(false)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    debounceRef.current = setTimeout(async () => {
      const data = await searchCovers(titleQuery, mediaType as any)
      setResults(data)
      setHasSearched(true)
      setIsSearching(false)
    }, 600)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [titleQuery, coverUrl, mediaType])

  const handleSelect = (result: CoverSearchResult) => {
    // If clicking the already selected cover, deselect it
    if (coverUrl === result.imageUrl) {
      onCoverSelect("")
      onMeta?.(null)
    } else {
      onCoverSelect(result.imageUrl)
      onMeta?.(result)
    }
  }

  const handleClear = () => {
    onCoverSelect("")
    onMeta?.(null)
    setResults([])
    setHasSearched(false)
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Cover Image</label>
        <span className="text-xs text-muted-foreground">Auto-searched</span>
      </div>

      <div className="space-y-3">
        {/* Search status */}
        {isSearching && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Searching covers for &quot;{titleQuery}&quot;...
          </div>
        )}

        {/* Results grid */}
        {!isSearching && results.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
              {results.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => handleSelect(result)}
                  className={cn(
                    "group relative rounded-lg overflow-hidden border-2 transition-all duration-200 hover:scale-[1.03] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary",
                    coverUrl === result.imageUrl
                      ? "border-primary ring-2 ring-primary/30 shadow-md"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="aspect-[2/3] bg-muted">
                    <img
                      src={result.imageUrl}
                      alt={result.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5 pt-6">
                    <p className="text-[10px] leading-tight text-white font-medium line-clamp-2">
                      {result.title}
                    </p>
                    {result.score && (
                      <p className="text-[9px] text-white/70 mt-0.5">★ {result.score}</p>
                    )}
                  </div>

                  {coverUrl === result.imageUrl && (
                    <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isSearching && hasSearched && results.length === 0 && (
            <div className="flex flex-col items-center gap-1 py-4 text-muted-foreground">
              <ImageOff className="h-6 w-6" />
              <p className="text-xs">No covers found. Try a different title or enter URL manually.</p>
            </div>
          )}

          {/* Prompt to type */}
          {!isSearching && !hasSearched && !titleQuery && (
            <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
              <Search className="h-3 w-3" />
              Type a title name above to auto-search for covers.
            </div>
          )}

          {/* Selected preview */}
          {coverUrl && (
            <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50 border border-border">
              <div className="h-12 w-8 rounded overflow-hidden border border-border flex-shrink-0">
                <img src={coverUrl} alt="Selected cover" className="h-full w-full object-cover" />
              </div>
              <p className="flex-1 min-w-0 text-xs font-medium text-foreground truncate">Cover selected</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs h-7 shrink-0"
                onClick={handleClear}
              >
                Clear
              </Button>
            </div>
          )}
        </div>
    </div>
  )
}
