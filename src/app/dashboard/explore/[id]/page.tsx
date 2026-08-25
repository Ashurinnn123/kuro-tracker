"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Plus, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { useLibrary } from "@/components/library/library-provider"
import { MediaType, ReadingStatus } from "@/lib/types"

interface ExploreMedia {
  id: number
  title: string
  imageUrl: string
  bannerUrl: string | null
  description: string | null
  score: number | null
  format: string | null
  chapters: number | null
  volumes: number | null
  genres: string[]
  status: string | null
}

interface Detail extends ExploreMedia {
  recommendations: ExploreMedia[]
  relations: (ExploreMedia & { relation: string })[]
}

const RELATION_LABEL: Record<string, string> = {
  SEQUEL: "Sequel",
  PREQUEL: "Prequel",
  SIDE_STORY: "Side Story",
  SPIN_OFF: "Spin-off",
}

// Map AniList format → Kuro media type for the Add flow.
function inferMediaType(m: ExploreMedia): MediaType {
  if (m.format === "NOVEL") return "light_novel"
  // Detail page knows its own tab type via genres? Not reliably — manhwa is
  // country-based. ponytail: KR covers usually tagged; fall back to manga.
  return "manga"
}

export default function ExploreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const { addTitle, titles, isLoading: libLoading } = useLibrary()

  const [media, setMedia] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/explore?id=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => alive && setMedia(data))
      .catch(() => alive && setMedia(null))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!media) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4">
        <p className="text-muted-foreground">Title not found on AniList.</p>
        <Button onClick={() => router.push("/dashboard/explore")}>Back to Explore</Button>
      </div>
    )
  }

  const inLibrary = titles.some((t) => t.title.toLowerCase() === media.title.toLowerCase())
  const inferred = inferMediaType(media)

  const handleAdd = async () => {
    if (inLibrary || adding) return
    setAdding(true)
    try {
      await addTitle({
        title: media.title,
        media_type: inferred,
        cover_url: media.imageUrl,
        total_chapters: media.chapters,
        current_chapter: 0,
        total_volumes: media.volumes,
        current_volume: 0,
        status: "want_to_read" as ReadingStatus,
        rating: null,
        notes: null,
        genres: media.genres,
        is_favorite: false,
        started_at: null,
        completed_at: null,
      })
      toast(`"${media.title}" added to your library`)
    } catch {
      toast("Could not add title", "error")
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/explore")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="min-w-0 flex-1 truncate font-serif text-2xl italic tracking-tight">{media.title}</h1>
        <Button onClick={handleAdd} disabled={adding || inLibrary || libLoading} className="font-mono text-xs uppercase tracking-widest">
          {inLibrary ? (
            <>
              <Check className="h-4 w-4 mr-2" /> In Library
            </>
          ) : adding ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding…
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" /> Add to Library
            </>
          )}
        </Button>
      </div>

      {/* Banner + info */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {media.bannerUrl && (
          <div className="relative h-36 w-full sm:h-48">
            {/* eslint-disable-next-line @next/next/no-img-element -- external CDN banner */}
            <img src={media.bannerUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className={`flex flex-col gap-5 p-5 sm:flex-row ${media.bannerUrl ? "" : "pt-6"}`}>
          <div className="w-32 shrink-0 self-start overflow-hidden rounded-lg border border-border/70 bg-background">
            {/* eslint-disable-next-line @next/next/no-img-element -- external CDN cover */}
            <img src={media.imageUrl} alt={media.title} className="aspect-[2/3] w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {media.score != null && (
                <span>
                  Score <span className="text-primary">{media.score}%</span>
                </span>
              )}
              {media.chapters != null && <span>{media.chapters} chapters</span>}
              {media.volumes != null && <span>{media.volumes} volumes</span>}
              {media.status && <span>{media.status.replace(/_/g, " ").toLowerCase()}</span>}
            </div>
            {media.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {media.genres.map((g) => (
                  <span key={g} className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                    {g}
                  </span>
                ))}
              </div>
            )}
            {media.description && (
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {media.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Related (sequel / prequel / side story / spin-off) */}
      {media.relations.length > 0 && (
        <section className="space-y-3">
          <h2 className="border-b-2 border-primary pb-1 font-serif text-lg italic tracking-tight">Related Titles</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {media.relations.map((rel) => (
              <Link
                key={`${rel.relation}-${rel.id}`}
                href={`/dashboard/explore/${rel.id}`}
                className="group overflow-hidden rounded-lg border border-border bg-surface transition-transform hover:-translate-y-0.5"
              >
                <div className="overflow-hidden bg-background">
                  {/* eslint-disable-next-line @next/next/no-img-element -- external CDN cover */}
                  <img src={rel.imageUrl} alt={rel.title} loading="lazy" className="w-full h-auto" />
                </div>
                <div className="p-2">
                  <p className="truncate text-xs font-medium">{rel.title}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
                    {RELATION_LABEL[rel.relation] ?? rel.relation}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recommendations */}
      {media.recommendations.length > 0 && (
        <section className="space-y-3">
          <h2 className="border-b-2 border-primary pb-1 font-serif text-lg italic tracking-tight">Recommended</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {media.recommendations.map((rec) => (
              <Link
                key={rec.id}
                href={`/dashboard/explore/${rec.id}`}
                className="group overflow-hidden rounded-lg border border-border bg-surface transition-transform hover:-translate-y-0.5"
              >
                <div className="overflow-hidden bg-background">
                  {/* eslint-disable-next-line @next/next/no-img-element -- external CDN cover */}
                  <img src={rec.imageUrl} alt={rec.title} loading="lazy" className="w-full h-auto" />
                </div>
                <div className="p-2">
                  <p className="truncate text-xs font-medium">{rec.title}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {rec.score != null ? `${rec.score}%` : "—"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
