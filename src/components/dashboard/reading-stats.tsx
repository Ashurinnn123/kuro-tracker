"use client"

import { useMemo } from "react"
import { Flame, CalendarRange } from "lucide-react"
import { Title } from "@/lib/types"

// ponytail: activity = chapters logged per day, derived from updated_at deltas
// (Kuro doesn't store per-chapter history — add an events table if you need
// exact replay). Good enough for streak + monthly pace stats.
export function ReadingStats({ titles }: { titles: Title[] }) {
  const { streak, bestStreak, activeDays, perMonth } = useMemo(() => {
    // Estimate daily activity: each title's progress was last touched at
    // updated_at; completed titles also have a completion date.
    const days = new Set<string>()
    for (const t of titles) {
      if (t.current_chapter > 0) {
        days.add(new Date(t.updated_at).toISOString().slice(0, 10))
      }
      if (t.status === "completed" && t.completed_at) {
        for (let i = 0; i < 3; i++) {
          const d = new Date(t.completed_at)
          d.setDate(d.getDate() - i)
          days.add(d.toISOString().slice(0, 10))
        }
      }
    }
    const sorted = [...days].sort()

    let streak = 0
    if (sorted.length > 0) {
      // Streak counts only if today or yesterday was active
      const today = new Date()
      const last = new Date(sorted[sorted.length - 1] + "T00:00:00")
      const gapToToday = Math.floor((today.getTime() - last.getTime()) / 86_400_000)
      if (gapToToday <= 1) {
        streak = 1
        for (let i = sorted.length - 1; i > 0; i--) {
          const prev = new Date(sorted[i - 1] + "T00:00:00")
          const cur = new Date(sorted[i] + "T00:00:00")
          if (Math.floor((cur.getTime() - prev.getTime()) / 86_400_000) === 1) streak++
          else break
        }
      }
    }

    // Best streak ever (longest run of consecutive days)
    let bestStreak = 0
    let run = 0
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0) {
        const prev = new Date(sorted[i - 1] + "T00:00:00")
        const cur = new Date(sorted[i] + "T00:00:00")
        run = Math.floor((cur.getTime() - prev.getTime()) / 86_400_000) === 1 ? run + 1 : 1
      } else {
        run = 1
      }
      bestStreak = Math.max(bestStreak, run)
    }

    // Chapters finished this calendar month
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const chapterEvents: number[] = []
    for (const t of titles) {
      if (t.current_chapter > 0 && new Date(t.updated_at).getTime() >= monthStart) {
        chapterEvents.push(t.current_chapter)
      }
      if (t.status === "completed" && t.completed_at && new Date(t.completed_at).getTime() >= monthStart) {
        chapterEvents.push(t.total_chapters ?? t.current_chapter)
      }
    }
    const perMonth = chapterEvents.reduce((a, b) => a + b, 0)

    return { streak, bestStreak, activeDays: sorted.length, perMonth }
  }, [titles])

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
        <Flame className={`h-6 w-6 ${streak > 0 ? "text-primary" : "text-muted-foreground"}`} />
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Current streak</p>
          <p className="text-xl font-bold">{streak} day{streak === 1 ? "" : "s"}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
        <Flame className="h-6 w-6 text-muted-foreground" />
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Best streak</p>
          <p className="text-xl font-bold">{bestStreak} day{bestStreak === 1 ? "" : "s"}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
        <CalendarRange className="h-6 w-6 text-muted-foreground" />
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Active days</p>
          <p className="text-xl font-bold">{activeDays}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
        <BookOpenMark />
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">This month</p>
          <p className="text-xl font-bold">{perMonth} ch</p>
        </div>
      </div>
    </div>
  )
}

function BookOpenMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-muted-foreground">
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </svg>
  )
}
