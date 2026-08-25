import Link from "next/link"
import { BookOpen, Layers } from "lucide-react"

interface ShelfTitle {
  title: string
  media_type: string
  cover_url: string | null
  status: string
  rating: number | null
}

// Public read-only shelf page. Data comes from the public-shelf API,
// which only answers when the owner opted in.
export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params

  let data: {
    name?: string | null
    avatarUrl?: string | null
    titles?: ShelfTitle[]
    error?: string
  } | null = null

  try {
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
    const res = await fetch(`${origin}/api/public-shelf/${encodeURIComponent(username)}`, {
      cache: "no-store",
    })
    data = res.ok ? await res.json() : null
  } catch {
    data = null
  }

  return (
    <div className="halftone-bg min-h-screen w-full bg-background px-4 py-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- static public asset */}
            <img src="/kuro-logo.jpg" alt="Kuro" className="h-9 w-9 rounded-lg" />
            <span className="font-serif text-xl italic">Kuro</span>
          </Link>
          <Link
            href="/login"
            className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-primary"
          >
            Make yours →
          </Link>
        </div>

        {!data || !data.titles ? (
          <div className="rounded-2xl border border-border bg-surface p-10 text-center">
            <h1 className="font-serif text-2xl italic">Shelf not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This profile doesn&apos;t exist or the library is private.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              {data.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- external CDN image
                <img src={data.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 font-mono text-xl text-primary">
                  {(data.name ?? username).slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="font-serif text-3xl italic tracking-tight">{data.name ?? username}</h1>
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">@{username} · shared library</p>
              </div>
              <div className="ml-auto flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2">
                <Layers className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold">{data.titles.length}</span>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {data.titles.map((t) => (
                <Link
                  key={t.title + t.media_type}
                  href="/"
                  onClick={(e) => e.preventDefault()}
                  className="group overflow-hidden rounded-lg border border-border bg-surface transition-transform hover:-translate-y-0.5"
                >
                  <div className="aspect-[2/3] w-full overflow-hidden bg-background">
                    {t.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- external CDN cover
                      <img src={t.cover_url} alt={t.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center p-2 text-center text-xs text-muted-foreground">
                        {t.title}
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="truncate text-xs font-medium">{t.title}</p>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {t.status.replace("_", " ")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {data.titles.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">Nothing on the shelf yet.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
