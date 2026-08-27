"use client"

import Link from "next/link"
import { useState } from "react"
import { Heart, Image as ImageIcon } from "lucide-react"
import { Title } from "@/lib/types"
import { progressPct } from "@/lib/utils"
import { TitleProgress } from "./title-progress"
import { Card, CardContent } from "@/components/ui/card"
import { ProgressBar } from "./progress-bar"
import { RatingStars } from "./rating-stars"
import { StatusBadge } from "./status-badge"

export function TitleCard({ title }: { title: Title }) {
  const [imageError, setImageError] = useState(false)
  const pct = progressPct(title.current_chapter, title.total_chapters, title.status)

  return (
    <Link href={`/dashboard/library/titles/${title.id}`} className="block group">
      <Card className="h-full flex-col overflow-hidden rounded-lg border-border/70 bg-surface transition-colors hover:border-primary">
        <div className="relative aspect-[2/3] w-full overflow-hidden border-b border-border/50 bg-background">
          {title.cover_url && !imageError ? (
            <img 
              src={title.cover_url} 
              alt={title.title} 
              className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="text-center p-4">
              <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
              <span className="text-xs text-muted-foreground font-medium line-clamp-2">No Cover</span>
            </div>
          )}
          <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10">
            <StatusBadge status={title.status} />
            {title.is_favorite && (
              <div className="bg-background/80 backdrop-blur rounded-full p-1 text-danger">
                <Heart className="h-4 w-4 fill-current" />
              </div>
            )}
          </div>
        </div>
        <CardContent className="p-4 flex-1 flex flex-col justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold leading-snug line-clamp-2 transition-colors group-hover:text-primary">
                {title.title}
              </h4>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {title.media_type.replace('_', ' ')}
              </p>
              {/* Genres + tags snippet */}
              {((title.genres?.length ?? 0) > 0 || (title.tags?.length ?? 0) > 0) && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {title.genres?.slice(0, 2).map((g) => (
                    <span key={g} className="rounded-full border border-border/50 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                      {g}
                    </span>
                  ))}
                  {title.tags?.slice(0, 1).map((t) => (
                    <span key={t} className="rounded bg-surface-2 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-auto space-y-2">
              <RatingStars rating={title.rating} />
              <div className="flex justify-between font-mono text-xs font-medium tracking-wide">
                <TitleProgress title={title} />
              </div>
            <ProgressBar pct={pct} />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
