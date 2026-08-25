import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Public shelf API — no auth required. Only serves data when the profile
// owner opted in (is_library_public). Shelf fields only; never notes/quotes.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, is_library_public")
    .eq("username", username.toLowerCase())
    .maybeSingle()

  if (!profile || !profile.is_library_public) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { data: titles } = await supabase
    .from("titles")
    .select(
      `title, media_type, cover_url, status, rating, genres,
       total_chapters, current_chapter, total_volumes, current_volume,
       updated_at`
    )
    .eq("user_id", profile.id)
    .in("status", ["reading", "completed", "on_hold"])
    .order("updated_at", { ascending: false })

  return NextResponse.json({
    name: profile.full_name,
    avatarUrl: profile.avatar_url,
    titles: titles ?? [],
  })
}
