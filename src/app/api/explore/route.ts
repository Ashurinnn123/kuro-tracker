import { NextRequest, NextResponse } from "next/server"
import { exploreList, exploreDetail } from "@/lib/anilist-explore"
import { MediaType } from "@/lib/types"

// GET /api/explore?type=manga&page=1[&search=bleach]  → browse grid
// GET /api/explore?id=140960                          → detail+recs+relations
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const id = sp.get("id")

  if (id) {
    const n = Number(id)
    if (!Number.isSafeInteger(n) || n < 1 || n > 2_147_483_647) {
      return NextResponse.json({ error: "bad id" }, { status: 400 })
    }
    const detail = await exploreDetail(n)
    if (!detail) return NextResponse.json({ error: "not found" }, { status: 404 })
    return NextResponse.json(detail)
  }

  const type = (sp.get("type") ?? "manga") as MediaType
  if (!["manga", "manhwa", "light_novel"].includes(type)) {
    return NextResponse.json({ error: "bad type" }, { status: 400 })
  }
  const page = Number(sp.get("page") ?? "1")
  const search = sp.get("search")?.slice(0, 80) || undefined
  const genres = sp.getAll("genre").map((g) => g.slice(0, 40)).slice(0, 6)
  const tag = sp.get("tag")?.slice(0, 60) || undefined

  const items = await exploreList(type, page, search, genres, tag)
  return NextResponse.json({ items })
}
