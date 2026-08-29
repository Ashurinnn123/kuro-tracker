"use client"

import { useMemo } from "react"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { Layers } from "lucide-react"
import { useLibrary } from "@/components/library/library-provider"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const STATUS_META = [
  { key: "reading", label: "Reading", color: "#60A5FA" },
  { key: "completed", label: "Completed", color: "#10b981" },
  { key: "want_to_read", label: "Plan to Read", color: "#64748b" },
  { key: "on_hold", label: "On Hold", color: "#f59e0b" },
  { key: "dropped", label: "Dropped", color: "#ef4444" },
] as const

export function ReadingChart() {
  const { titles } = useLibrary()

  const { data, total } = useMemo(() => {
    const counts: Record<string, number> = {
      reading: 0,
      completed: 0,
      want_to_read: 0,
      on_hold: 0,
      dropped: 0,
    }
    titles.forEach((t) => {
      if (counts[t.status] !== undefined) counts[t.status]++
    })
    const total = titles.length
    const data = STATUS_META.map((m) => ({
      name: m.label,
      key: m.key,
      count: counts[m.key],
      color: m.color,
      pct: total ? Math.round((counts[m.key] / total) * 100) : 0,
    }))
    return { data, total }
  }, [titles])

  const hasData = total > 0
  const activeData = data.filter((d) => d.count > 0)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload
      return (
        <div className="rounded-lg border border-border bg-[#0C1321] px-3 py-2 shadow-xl">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
            <p className="text-xs font-medium text-white">{d.name}</p>
          </div>
          <p className="mt-1 font-mono text-xs text-white/70">
            <span className="text-sm font-bold text-white">{d.count}</span> titles · {d.pct}%
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="col-span-full xl:col-span-2 overflow-hidden border-border/70 bg-surface">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Layers className="h-3.5 w-3.5" />
            </span>
            Library Breakdown
          </CardTitle>
          <CardDescription className="mt-1.5 font-mono text-[11px] uppercase tracking-widest">
            {hasData ? `${total} titles · by reading status` : "No titles yet"}
          </CardDescription>
        </div>
        {hasData && (
          <div className="hidden sm:flex flex-col items-end">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Total</span>
            <span className="text-xl font-bold leading-none tabular-nums">{total}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-2">
        {!hasData ? (
          <div className="flex h-[220px] sm:h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-background/40 px-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Layers className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm font-medium">Library kamu masih kosong</p>
            <p className="mt-1 max-w-[28ch] text-xs leading-relaxed text-muted-foreground">
              Tambah judul dari Explore — breakdown status bakal muncul otomatis di sini.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-[340px_1fr] lg:gap-8 items-center">
            {/* Donut - responsive height + percent radii biar gede di desktop, compact di HP */}
            <div className="relative h-[220px] w-full sm:h-[280px] lg:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activeData.length ? activeData : [{ name: "Empty", count: 1, color: "#1e293b" }]}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="62%"
                    outerRadius="92%"
                    paddingAngle={activeData.length > 1 ? 3 : 0}
                    cornerRadius={8}
                    stroke="none"
                    isAnimationActive
                    animationDuration={700}
                  >
                    {(activeData.length ? activeData : [{ color: "#1e293b" }]).map((entry: any, i) => (
                      <Cell key={i} fill={entry.color} className="outline-none focus:outline-none" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Center label - scale responsive */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
                <span className="text-[22px] font-bold leading-none tracking-tight tabular-nums sm:text-[30px] lg:text-[34px]">{total}</span>
                <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground sm:text-[11px]">Titles</span>
                <span className="mt-2 hidden h-px w-8 bg-border sm:block" />
                <span className="mt-2 hidden max-w-[12ch] truncate font-mono text-[10px] text-muted-foreground sm:block">
                  {data.find((d) => d.count === Math.max(...data.map((x) => x.count)))?.name ?? "-"} top
                </span>
              </div>
            </div>

            {/* Legend + mini bars */}
            <div className="min-w-0 space-y-3 py-1">
              {data.map((d) => (
                <div key={d.key} className="group min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm ring-1 ring-white/10"
                      style={{ background: d.color, opacity: d.count === 0 ? 0.35 : 1 }}
                    />
                    <span
                      className={`min-w-0 flex-1 truncate text-[12px] sm:text-[13px] leading-none ${d.count === 0 ? "text-muted-foreground" : "font-medium text-foreground"}`}
                    >
                      {d.name}
                    </span>
                    <span className="shrink-0 whitespace-nowrap font-mono text-[11px] sm:text-xs tabular-nums text-muted-foreground">
                      <span className={`font-semibold ${d.count ? "text-foreground" : ""}`}>{d.count}</span>
                      <span className="mx-1 text-muted-foreground/40">·</span>
                      {d.pct}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${d.pct}%`,
                        background: d.color,
                        opacity: d.count === 0 ? 0.25 : 1,
                      }}
                    />
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between border-t border-border/60 pt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <span>0%</span>
                <span className="normal-case tracking-normal text-muted-foreground/70">Share per status</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
