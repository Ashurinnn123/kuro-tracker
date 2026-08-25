import { Title } from "./types"

// This interface defines the contract that both local and supabase implementations will follow.
export interface LibraryService {
  getTitles: () => Promise<Title[]>
  getTitle: (id: string) => Promise<Title | null>
  addTitle: (title: Omit<Title, "id" | "user_id" | "created_at" | "updated_at">) => Promise<Title>
  updateTitle: (id: string, updates: Partial<Omit<Title, "id" | "user_id" | "created_at" | "updated_at">>) => Promise<Title>
  deleteTitle: (id: string) => Promise<void>
}
