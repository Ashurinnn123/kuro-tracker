"use client"

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react"
import { usePathname } from "next/navigation"
import { Title } from "@/lib/types"
import { localLibraryService } from "@/lib/library.local"
import { supabaseLibraryService } from "@/lib/library.supabase"
import { LibraryService } from "@/lib/library"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/toast"

interface LibraryContextType {
  titles: Title[]
  isLoading: boolean
  addTitle: (title: Omit<Title, "id" | "user_id" | "created_at" | "updated_at">) => Promise<void>
  updateTitle: (id: string, updates: Partial<Omit<Title, "id" | "user_id" | "created_at" | "updated_at">>, opts?: { silent?: boolean }) => Promise<void>
  deleteTitle: (id: string) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  bumpChapter: (id: string) => Promise<void>
  refreshTitles: () => Promise<void>
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined)

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [titles, setTitles] = useState<Title[]>([])
  const [isLoading, setIsLoading] = useState(true)
  // null = session not resolved yet — don't read ANY backend until known,
  // otherwise signed-in users see a flash of localStorage data first.
  const [service, setService] = useState<LibraryService | null>(null)
  const { toast } = useToast()

  const refreshTitles = async () => {
    if (!service) return
    const data = await service.getTitles()
    setTitles(data)
  }

  // Pick the right backend per session:
  // signed in → Supabase (per-user rows via RLS), else local storage.
  // onAuthStateChange covers both page load AND live login/logout without
  // a full reload (e.g. client-side redirect from /login).
  useEffect(() => {
    let active = true
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return
      if (event === "SIGNED_IN" || event === "USER_UPDATED") setService(supabaseLibraryService)
      else if (event === "SIGNED_OUT") setService(localLibraryService)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  // Re-check session on every route change. Login goes through a SERVER ACTION
  // (cookies set in the HTTP response), so the browser SDK never emits
  // SIGNED_IN — and this provider sits in the root layout, so it doesn't
  // remount on navigate. Pathname is the only reliable signal we get.
  const pathname = usePathname()
  useEffect(() => {
    let active = true
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (active) setService(user ? supabaseLibraryService : localLibraryService)
    })
    return () => {
      active = false
    }
  }, [pathname])

  // Reload titles whenever the active service changes (skips until resolved).
  useEffect(() => {
    if (!service) return
    setIsLoading(true)
    refreshTitles().finally(() => setIsLoading(false))
  }, [service])

  const addTitle = async (titleData: Omit<Title, "id" | "user_id" | "created_at" | "updated_at">) => {
    if (!service) return
    try {
      await service.addTitle(titleData)
      await refreshTitles()
      toast("Title added successfully")
    } catch (e) {
      toast("Failed to add title", "error")
    }
  }

  const updateTitle = async (id: string, updates: Partial<Omit<Title, "id" | "user_id" | "created_at" | "updated_at">>, opts?: { silent?: boolean }) => {
    if (!service) return
    // Optimistic update
    setTitles(prev => prev.map(t => t.id === id ? { ...t, ...updates } as Title : t))
    try {
      await service.updateTitle(id, updates)
      await refreshTitles() // sync back
      if (!opts?.silent) toast("Title updated")
    } catch (e) {
      await refreshTitles() // revert on error
      if (!opts?.silent) toast("Failed to update title", "error")
    }
  }

  const deleteTitle = async (id: string) => {
    if (!service) return
    setTitles(prev => prev.filter(t => t.id !== id))
    try {
      await service.deleteTitle(id)
      toast("Title deleted")
    } catch (e) {
      await refreshTitles()
      toast("Failed to delete title", "error")
    }
  }

  const toggleFavorite = async (id: string) => {
    const title = titles.find(t => t.id === id)
    if (title) {
      await updateTitle(id, { is_favorite: !title.is_favorite })
    }
  }

  const bumpChapter = async (id: string) => {
    const title = titles.find(t => t.id === id)
    if (title) {
      await updateTitle(id, { current_chapter: title.current_chapter + 1 })
    }
  }

  return (
    <LibraryContext.Provider value={{ titles, isLoading, addTitle, updateTitle, deleteTitle, toggleFavorite, bumpChapter, refreshTitles }}>
      {children}
    </LibraryContext.Provider>
  )
}

export function useLibrary() {
  const context = useContext(LibraryContext)
  if (context === undefined) {
    throw new Error("useLibrary must be used within a LibraryProvider")
  }
  return context
}
