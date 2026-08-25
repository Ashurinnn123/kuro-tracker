import Link from "next/link"
import { Plus } from "lucide-react"
import { Title } from "@/lib/types"
import { progressPct } from "@/lib/utils"
import { TitleProgress } from "./title-progress"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ProgressBar } from "./progress-bar"

interface ContinueCardProps {
  title: Title
  onBumpChapter?: (e: React.MouseEvent, id: string) => void
}

export function ContinueCard({ title, onBumpChapter }: ContinueCardProps) {
  const pct = progressPct(title.current_chapter, title.total_chapters, title.status)

  return (
    <Link href={`/dashboard/library/titles/${title.id}`} className="block group min-w-[280px] sm:min-w-[320px] max-w-sm shrink-0 snap-center">
      <Card className="overflow-hidden transition-all hover:shadow-md hover:border-primary/50">
        <CardContent className="p-0 flex h-32">
          {/* Thumbnail */}
          <div className="w-24 bg-muted shrink-0 relative overflow-hidden">
            {title.cover_url ? (
              <img 
                src={title.cover_url} 
                alt={title.title} 
                className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-primary/5">
                <span className="font-bold text-primary/40 text-xl text-center leading-none">
                  {title.title.substring(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className="p-4 flex-1 flex flex-col justify-between overflow-hidden">
            <div>
              <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                {title.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                <TitleProgress title={title} />
              </p>
            </div>
            
            <div className="mt-auto flex items-center justify-between gap-3">
              <ProgressBar pct={pct} className="flex-1" />
              <Button 
                size="icon" 
                variant="secondary" 
                className="h-8 w-8 rounded-full shrink-0 group/btn hover:bg-primary hover:text-primary-foreground"
                onClick={(e) => {
                  if (onBumpChapter) {
                    e.preventDefault()
                    onBumpChapter(e, title.id)
                  }
                }}
                title="Mark next chapter read"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
