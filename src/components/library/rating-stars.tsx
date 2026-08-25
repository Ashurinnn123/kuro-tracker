import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

export function RatingStars({ rating, className, max = 10 }: { rating: number | null, className?: string, max?: number }) {
  if (!rating) return null
  return (
    <div className={cn("flex items-center gap-0.5 text-amber-400", className)}>
      {Array.from({ length: max }).map((_, i) => {
        const fill = Math.min(1, Math.max(0, rating - i)) // partial fill for decimals
        return (
          <span key={i} className="relative inline-flex h-3 w-3">
            <Star className="absolute inset-0 h-3 w-3 fill-muted text-muted" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            </span>
          </span>
        )
      })}
    </div>
  )
}
