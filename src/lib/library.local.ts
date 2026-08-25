import { LibraryService } from "./library"
import { Title } from "./types"

const STORAGE_KEY = "rt.library.v1"

// Signed-out mode: empty shelf, no demo seed. Mock data made sign-out look
// like another user's library was still visible — a tracker starts empty.
const getStoredData = (): Title[] => {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Title[]
  } catch {
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
