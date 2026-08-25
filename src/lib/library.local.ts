import { LibraryService } from "./library"
import { Title } from "./types"
import { MOCK_TITLES } from "./seed"

const STORAGE_KEY = "rt.library.v1"

const getStoredData = (): Title[] => {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(STORAGE_KEY)
  if (!data) {
    // Seed on first load
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_TITLES))
    return MOCK_TITLES
  }
  try {
    let parsed: Title[] = JSON.parse(data)
    let needsMigration = false
    
    // Auto-migrate: fix broken wikipedia cover URLs and nulls from old seed data
    parsed = parsed.map(t => {
      if (t.user_id === "mock_user" && (!t.cover_url || t.cover_url.includes("wikipedia.org"))) {
        const seedMatch = MOCK_TITLES.find(m => m.id === t.id)
        if (seedMatch && seedMatch.cover_url) {
          needsMigration = true
          return { ...t, cover_url: seedMatch.cover_url }
        }
      }
      return t
    })

    if (needsMigration) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
    }

    return parsed
  } catch (e) {
    return []
  }
}

const setStoredData = (data: Title[]) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }
}

export const localLibraryService: LibraryService = {
  async getTitles() {
    return getStoredData()
  },
  
  async getTitle(id: string) {
    const titles = getStoredData()
    return titles.find(t => t.id === id) || null
  },

  async addTitle(titleData) {
    const titles = getStoredData()
    const now = new Date().toISOString()
    
    const newTitle: Title = {
      ...titleData,
      id: crypto.randomUUID(),
      user_id: "local_user",
      created_at: now,
      updated_at: now,
    }
    
    setStoredData([...titles, newTitle])
    return newTitle
  },

  async updateTitle(id, updates) {
    const titles = getStoredData()
    const index = titles.findIndex(t => t.id === id)
    if (index === -1) throw new Error("Title not found")
    
    const now = new Date().toISOString()
    const updatedTitle: Title = {
      ...titles[index],
      ...updates,
      updated_at: now,
    }

    // Handle completed_at automatically if status changes to completed
    if (updates.status === "completed" && titles[index].status !== "completed") {
      updatedTitle.completed_at = now
    } else if (updates.status && updates.status !== "completed") {
      updatedTitle.completed_at = null
    }

    titles[index] = updatedTitle
    setStoredData(titles)
    return updatedTitle
  },

  async deleteTitle(id) {
    const titles = getStoredData()
    const newTitles = titles.filter(t => t.id !== id)
    setStoredData(newTitles)
  }
}
