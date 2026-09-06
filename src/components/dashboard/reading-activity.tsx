"use client"

import { useMemo } from "react"
import { Title } from "@/lib/types"

export function ReadingActivity({ titles }: { titles: Title[] }) {
  const { days, maxCount } = useMemo(() => {
    // group by day
    const map = new Map<string, number>()
    for (const t of titles) {
      const d = new Date(t.updated_at).toISOString().slice(0, 10)
      map.set(d, (map.get(d) || 0) + 1)
    }
    const sorted = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    const max = sorted.reduce((acc, [, count]) => Math.max(acc, count), 1)
    return { days: sorted, maxCount: max }
  }, [titles])

  if (days.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Reading Activity</h3>
      <div className="flex items-end gap-1 h-32 overflow-x-auto pb-2">
        {days.map(([date, count]) => {
          const height = (count / maxCount) * 100
          return (
            <div key={date} className="flex flex-col items-center flex-shrink-0">
              <div className="w-6 rounded-t-sm bg-primary/60 hover:bg-primary transition-colors" style={{ height: `${Math.max(height, 4)}%` }} />
              <span className="text-[10px] text-muted-foreground mt-1 rotate-45 origin-left whitespace-nowrap">{date.slice(5)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}