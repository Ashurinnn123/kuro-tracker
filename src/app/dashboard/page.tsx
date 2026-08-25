"use client"

import { BookOpen, CheckCircle, Heart, Layers } from "lucide-react"
import { StatTile } from "@/components/dashboard/stat-tile"
import { ReadingChart } from "@/components/dashboard/reading-chart"
import { ContinueCard } from "@/components/library/continue-card"
import { TitleCard } from "@/components/library/title-card"
import { useLibrary } from "@/components/library/library-provider"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardPage() {
  const { titles, isLoading, bumpChapter } = useLibrary()

  const reading = titles.filter(t => t.status === "reading")
  const completed = titles.filter(t => t.status === "completed")
  const favorites = titles.filter(t => t.is_favorite)
  const totalChapters = titles.reduce((acc, t) => acc + t.current_chapter, 0)

  const continueReading = [...reading].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  const recentlyUpdated = [...titles].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 4)

  const handleBumpChapter = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    await bumpChapter(id)
  }

  if (isLoading) {
    return (
      <div className="space-y-8 pb-8">
        <Skeleton className="h-16 w-1/3" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back!</h1>
        <p className="text-muted-foreground">Here is what's happening with your library today.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatTile 
          title="Currently Reading" 
          value={reading.length} 
          icon={<BookOpen className="h-5 w-5" />} 
        />
        <StatTile 
          title="Completed" 
          value={completed.length} 
          icon={<CheckCircle className="h-5 w-5" />} 
        />
        <StatTile 
          title="Favorites" 
          value={favorites.length} 
          icon={<Heart className="h-5 w-5" />} 
        />
        <StatTile 
          title="Chapters Logged" 
          value={totalChapters} 
          icon={<Layers className="h-5 w-5" />} 
        />
      </div>

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-3">
        <ReadingChart />
      </div>

      {continueReading.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="border-b-2 border-primary pb-1 font-serif text-lg italic tracking-tight">Continue Reading</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            {continueReading.map(title => (
              <ContinueCard key={title.id} title={title} onBumpChapter={handleBumpChapter} />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="border-b-2 border-primary pb-1 font-serif text-lg italic tracking-tight">Recently Updated</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {recentlyUpdated.map(title => (
            <TitleCard key={title.id} title={title} />
          ))}
        </div>
      </div>
    </div>
  )
}

