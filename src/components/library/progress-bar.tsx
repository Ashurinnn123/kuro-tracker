import { cn } from "@/lib/utils"

// Thin Stitch-style bar: no % label (the Ch/Vol numbers above already say it).
export function ProgressBar({ pct, className }: { pct: number, className?: string }) {
  return (
    <div className={cn("w-full h-1 overflow-hidden rounded-full bg-surface-2", className)}>
      <div
        className="h-full bg-primary transition-all duration-300 ease-in-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
