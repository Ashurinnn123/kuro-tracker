"use client"

import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { useLibrary } from "@/components/library/library-provider"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export function ReadingChart() {
  const { titles } = useLibrary()

  const data = useMemo(() => {
    // Count titles by status
    const counts = {
      reading: 0,
      completed: 0,
      want_to_read: 0,
      on_hold: 0,
      dropped: 0
    }

    titles.forEach(t => {
      if (counts[t.status] !== undefined) {
        counts[t.status]++
      }
    })

    return [
      { name: "Reading", count: counts.reading, color: "var(--color-primary)" },
      { name: "Completed", count: counts.completed, color: "#10b981" },
      { name: "Plan to Read", count: counts.want_to_read, color: "#64748b" },
      { name: "On Hold", count: counts.on_hold, color: "#f59e0b" },
      { name: "Dropped", count: counts.dropped, color: "#ef4444" },
    ]
  }, [titles])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface border border-border p-3 rounded-lg shadow-lg">
          <p className="font-medium mb-1">{label}</p>
          <p className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground">{payload[0].value}</span> titles
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="col-span-full xl:col-span-2">
      <CardHeader>
        <CardTitle>Library Breakdown</CardTitle>
        <CardDescription>Overview of your titles by reading status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                allowDecimals={false}
              />
              <Tooltip cursor={{ fill: "color-mix(in srgb, var(--muted) 50%, transparent)" }} content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={50} activeBar={false}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
