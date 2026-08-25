"use client"

// Sync All: runs /api/latest-chapter for every "reading" title, sequentially
// (MangaDex rate-limit friendly), then updates totals that moved forward.

import { useState } from "react"
import { RefreshCw, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { useLibrary } from "@/components/library/library-provider"

export function SyncAllButton() {
  const { titles, updateTitle } = useLibrary()
  const { toast } = useToast()
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  const handleSyncAll = async () => {
    // Only titles where "latest chapter" is meaningful.
    const targets = titles.filter((t) => t.status === "reading")
    if (targets.length === 0) {
      toast("No titles with status Reading to sync.")
      return
    }

    setRunning(true)
    setProgress({ done: 0, total: targets.length })

    let updated = 0
    let upToDate = 0
    let failed = 0

    try {
      for (const t of targets) {
        try {
          const res = await fetch("/api/latest-chapter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: t.title }),
          })
          if (!res.ok) throw new Error(String(res.status))
          const data = await res.json()

          if (data.chapters == null || t.total_chapters == null || data.chapters > t.total_chapters) {
            await updateTitle(t.id, { total_chapters: data.chapters })
            updated++
          } else {
            upToDate++
          }
        } catch {
          failed++
        }
        setProgress((p) => ({ ...p, done: p.done + 1 }))
      }
    } finally {
      setRunning(false)
      const parts = [`${updated} updated`, `${upToDate} up to date`]
      if (failed) parts.push(`${failed} failed`)
      toast(`Sync finished: ${parts.join(", ")}.`, failed ? "error" : undefined)
    }
  }

  return (
    <Button variant="outline" onClick={handleSyncAll} disabled={running}>
      {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
      {running ? `Syncing ${progress.done}/${progress.total}...` : "Sync All"}
    </Button>
  )
}
