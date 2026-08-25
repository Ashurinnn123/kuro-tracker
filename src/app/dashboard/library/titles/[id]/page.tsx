"use client"

import { use, useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Trash2, Heart, Plus, Minus, Save, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { RatingStars } from "@/components/library/rating-stars"
import { Title } from "@/lib/types"
import { useLibrary } from "@/components/library/library-provider"
import { useToast } from "@/components/ui/toast"
import { CoverPicker } from "@/components/library/cover-picker"
import { searchCovers } from "@/lib/cover-search"
import type { CoverSearchResult } from "@/lib/cover-search"

export default function TitleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  
  const { titles, isLoading, updateTitle, deleteTitle, toggleFavorite } = useLibrary()
  const { toast } = useToast()
  
  const [title, setTitle] = useState<Title | undefined>(undefined)
  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  // Sync with context
  useEffect(() => {
    if (!isLoading) {
      const found = titles.find(t => t.id === id)
      setTitle(found)
    }
  }, [id, titles, isLoading])

  const handleSave = async () => {
    if (!title) return
    setIsSaving(true)
    try {
      // Completed = finished reading: snap progress to the last chapter/volume
      const completed = title.status === "completed"
      await updateTitle(id, {
        title: title.title,
        media_type: title.media_type,
        status: title.status,
        total_chapters: title.total_chapters,
        current_chapter: completed && title.total_chapters ? title.total_chapters : title.current_chapter,
        total_volumes: title.total_volumes ?? null,
        current_volume: completed && title.media_type === "light_novel" && title.total_volumes ? title.total_volumes : (title.current_volume ?? 0),
        cover_url: title.cover_url,
        notes: title.notes,
        genres: title.genres,
        tags: title.tags ?? [],
        rating: title.rating
      })
      // Toast is handled by provider
    } catch (e) {
      // Toast is handled by provider
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this title?")) {
      await deleteTitle(id)
      router.push("/dashboard/library")
    }
  }

  const handleFavoriteToggle = async () => {
    await toggleFavorite(id)
  }

  // "Updated Xd ago" — relative time from the latest known chapter upload
  const [latestAt, setLatestAt] = useState<string | null>(null)

  // AniList autocomplete on the Title field (same behavior as Add dialog):
  // pick a suggestion → fills title + totals + cover in one click.
  const [sug, setSug] = useState<CoverSearchResult[]>([])
  const [sugFocused, setSugFocused] = useState(false) // dropdown only while input focused
  const sugRef = useRef(0)
  useEffect(() => {
    const q = title?.title?.trim() ?? ""
    if (!title || q.length < 3) { setSug([]); return }
    const id = ++sugRef.current
    const t = setTimeout(async () => {
      const data = await searchCovers(q, title.media_type)
      if (id !== sugRef.current) return
      setSug(data.filter((r) => r.title && r.title.toLowerCase() !== q.toLowerCase()))
    }, 500)
    return () => clearTimeout(t)
  }, [title?.title, title?.media_type])

  const applySuggestion = (s: CoverSearchResult) => {
    if (!title) return
    setTitle({
      ...title,
      title: s.title,
      total_chapters: s.chapters ?? title.total_chapters,
      total_volumes: s.volumes ?? title.total_volumes,
      cover_url: s.imageUrl || title.cover_url,
      genres: s.genres.length ? s.genres : title.genres,
      tags: s.tags.length ? s.tags : title.tags ?? [],
    })
    setSugFocused(false)
    setSug([])
  }

  const handleSyncChapters = async () => {
    if (!title) return
    setIsSyncing(true)
    try {
      const res = await fetch("/api/latest-chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.title }),
      })
      if (!res.ok) {
        toast("Could not find this title on MangaDex/AniList", "error")
        return
      }
      const data = await res.json()
      if (data.latest_uploaded_at) setLatestAt(data.latest_uploaded_at)
      if (data.chapters == null) {
        toast(`No chapter count available (${data.source})`)
        return
      }
      const current = title.total_chapters ?? 0
      if (data.chapters > current) {
        setTitle({ ...title, total_chapters: data.chapters })
        toast(`Updated: ${current || "–"} → ${data.chapters} (${data.source})`)
      } else if (data.chapters === current) {
        toast(`Already up to date (${data.chapters})`)
      } else {
        // Remote (MangaDex) counts main chapters only — local totals from
        // other catalogs can include special/extra chapters. Trust remote.
        setTitle({ ...title, total_chapters: data.chapters })
        toast(`Adjusted: ${current} → ${data.chapters} (${data.source})`)
      }
    } catch {
      toast("Sync failed — check your connection", "error")
    } finally {
      setIsSyncing(false)
    }
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  if (!title) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4">
        <p className="text-muted-foreground">Title not found</p>
        <Button onClick={() => router.push("/dashboard/library")}>Back to Library</Button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/library")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="min-w-0 flex-1 truncate font-serif text-2xl italic tracking-tight sm:text-3xl">{title.title}</h1>
        {latestAt && (
          <span className="hidden whitespace-nowrap font-mono text-xs uppercase tracking-widest text-muted-foreground sm:inline">
            updated{" "}
            {(() => {
              const days = Math.floor((Date.now() - new Date(latestAt).getTime()) / 86400000)
              return days <= 0 ? "today" : `${days}d ago`
            })()}
          </span>
        )}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="font-mono text-xs uppercase tracking-widest" onClick={handleSyncChapters} disabled={isSyncing}>
            {isSyncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sync
          </Button>
          <Button variant="outline" size="sm" className="font-mono text-xs uppercase tracking-widest" onClick={handleFavoriteToggle}>
            <Heart className={`h-4 w-4 mr-2 ${title.is_favorite ? 'fill-danger text-danger' : ''}`} />
            {title.is_favorite ? 'Favorited' : 'Favorite'}
          </Button>
          <Button variant="destructive" size="sm" className="font-mono text-xs uppercase tracking-widest" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: cover + progress/rating panel (Stitch technical-data style) */}
        <div className="md:col-span-1 space-y-3">
          <Card className="overflow-hidden rounded-xl border-border/70 p-2">
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-background">
              {title.cover_url ? (
                <img src={title.cover_url} alt={title.title} className="w-full h-full object-cover" />
              ) : (
                <span className="text-muted-foreground">No Cover</span>
              )}
              {latestAt && (
                <span className="absolute top-2 right-2 rounded border border-border/60 bg-background/80 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-primary backdrop-blur-sm">
                  {(() => {
                    const days = Math.floor((Date.now() - new Date(latestAt).getTime()) / 86400000)
                    return days <= 0 ? "updated today" : `updated ${days}d ago`
                  })()}
                </span>
              )}
            </div>
          </Card>

          {/* Genres — read-only chips, auto-filled from AniList */}
          {title.genres?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-1">
              {title.genres.map((g) => (
                <span key={g} className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs text-muted-foreground">
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Tags — read-only, smaller, auto-filled from AniList */}
          {(title.tags?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1 px-1">
              {title.tags.map((t) => (
                <span key={t} className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t}
                </span>
              ))}
            </div>
          )}

          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Progress</label>
                {title.media_type === "light_novel" && (
                  <div className="flex items-center gap-2 mt-2">
                    <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => setTitle({...title, current_volume: Math.max(0, (title.current_volume ?? 0) - 1)})}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      min={0}
                      max={title.total_volumes ?? undefined}
                      className="h-8 text-center"
                      value={title.current_volume ?? 0}
                      onChange={(e) => {
                        const v = parseInt(e.target.value)
                        setTitle({...title, current_volume: isNaN(v) ? 0 : Math.max(0, v)})
                      }}
                    />
                    <span className="text-sm text-muted-foreground shrink-0">/ {title.total_volumes || '?'} vol</span>
                    <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => setTitle({...title, current_volume: (title.current_volume ?? 0) + 1})}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => setTitle({...title, current_chapter: Math.max(0, title.current_chapter - 1)})}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min={0}
                    max={title.total_chapters ?? undefined}
                    className="h-8 text-center"
                    value={title.current_chapter}
                    onChange={(e) => {
                      const v = parseInt(e.target.value)
                      setTitle({...title, current_chapter: isNaN(v) ? 0 : Math.max(0, v)})
                    }}
                  />
                  <span className="text-sm text-muted-foreground shrink-0">/ {title.total_chapters || '?'}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => setTitle({...title, current_chapter: title.current_chapter + 1})}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Rating</label>
                <div className="flex items-center gap-3 mt-1 bg-surface border border-border p-2 rounded-md">
                  <RatingStars rating={title.rating || 0} max={10} />
                  <div className="flex items-center gap-2 ml-auto">
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      step={0.1}
                      placeholder="–"
                      className="h-7 w-16 text-center text-xs"
                      value={title.rating ?? ""}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value)
                        if (isNaN(v)) {
                          setTitle({...title, rating: null})
                        } else {
                          setTitle({...title, rating: Math.min(10, Math.max(0, Math.round(v * 10) / 10))})
                        }
                      }}
                    />
                    <span className="text-xs text-muted-foreground">/ 10</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="grid gap-2 relative">
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={title.title}
                  onChange={e => setTitle({...title, title: e.target.value})}
                  onBlur={() => setTimeout(() => setSugFocused(false), 150)}
                  onFocus={() => setSugFocused(true)}
                  autoComplete="off"
                />
                {sugFocused && sug.length > 0 && (
                  <div className="absolute top-full z-50 mt-9 w-full overflow-y-auto max-h-[280px] rounded-md border border-border bg-surface shadow-xl">
                    {sug.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applySuggestion(s)}
                        className="flex w-full items-center gap-3 border-b border-border/50 px-3 py-2 text-left last:border-0 hover:bg-surface-2 transition-colors"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- external CDN thumb */}
                        <img src={s.imageUrl} alt="" className="h-10 w-7 shrink-0 rounded-sm object-cover" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{s.title}</span>
                          <span className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            {s.type ?? title.media_type.replace("_", " ")}
                            {s.chapters ? ` · ${s.chapters} ch` : ""}
                            {s.volumes ? ` · ${s.volumes} vol` : ""}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Type</label>
                  <select 
                    className="h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={title.media_type}
                    onChange={(e) => setTitle({...title, media_type: e.target.value as any})}
                  >
                    <option value="manga">Manga</option>
                    <option value="manhwa">Manhwa</option>
                    <option value="light_novel">Light Novel</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Status</label>
                  <select 
                    className="h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={title.status}
                    onChange={(e) => setTitle({...title, status: e.target.value as any})}
                  >
                    <option value="reading">Reading</option>
                    <option value="completed">Completed</option>
                    <option value="want_to_read">Want to Read</option>
                    <option value="on_hold">On Hold</option>
                    <option value="dropped">Dropped</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Total Chapters</label>
                  <Input type="number" value={title.total_chapters || ""} onChange={e => setTitle({...title, total_chapters: parseInt(e.target.value) || null})} />
                </div>
                {title.media_type === "light_novel" && (
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Total Volumes</label>
                    <Input type="number" value={title.total_volumes || ""} onChange={e => setTitle({...title, total_volumes: parseInt(e.target.value) || null})} />
                  </div>
                )}
              </div>

              <div className="pt-2">
                <CoverPicker 
                  titleQuery={title.title} 
                  coverUrl={title.cover_url || ""} 
                  onCoverSelect={(url) => setTitle({...title, cover_url: url})} 
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Notes</label>
                <textarea 
                  className="min-h-[100px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={title.notes || ""}
                  onChange={e => setTitle({...title, notes: e.target.value})}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

