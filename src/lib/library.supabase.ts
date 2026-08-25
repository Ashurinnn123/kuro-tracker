import { LibraryService } from "./library"
import { Title } from "./types"
import { createClient } from "./supabase/client"

export const supabaseLibraryService: LibraryService = {
  async getTitles() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('titles')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data as Title[]
  },
  
  async getTitle(id: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('titles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) return null
    return data as Title
  },

  async addTitle(titleData) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    const { data, error } = await supabase
      .from('titles')
      .insert({
        ...titleData,
        user_id: user.id
      })
      .select()
      .single()

    if (error) throw error
    return data as Title
  },

  async updateTitle(id, updates) {
    const supabase = createClient()
    
    // Logic for completed_at handling
    const updatePayload: any = { ...updates }
    
    if (updates.status === "completed") {
      updatePayload.completed_at = new Date().toISOString()
    } else if (updates.status) {
      // any other status clears completed_at ("completed" excluded above)
      updatePayload.completed_at = null
    }

    const { data, error } = await supabase
      .from('titles')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Title
  },

  async deleteTitle(id) {
    const supabase = createClient()
    const { error } = await supabase
      .from('titles')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}
