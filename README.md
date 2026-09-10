# Kuro — Reading Tracker

Track your manga, manhwa, and light novels in one place. Built with Next.js 16, React 19, Tailwind CSS v4, and Supabase.

**Live**: [kuro-tracker.vercel.app](https://kuro-tracker.vercel.app)

## Features

- **Explore** — browse trending manga, manhwa, and light novels, partitioned by media type so light novels never leak into the manga tab. Results come from Kitsu, with Jikan and MangaDex as fallbacks
- **Genre and tag filters** — genre chips filter the grid; tag chips are read-only and free-text searchable. Filter state lives in the URL, so the back button restores your exact browse position
- **Title detail** — cover, banner, description, score, chapter/volume counts, genres, tags, and sequels/prequels/side stories/spin-offs. Genre chips link into a filtered Explore
- **One-click add** — cover, chapter/volume totals, genres, curated tags (max 8, filtered), and the correct media type are carried into your library
- **Library management** — status tabs (All / Reading / Plan to Read / Completed / On Hold / Dropped) and type tabs (All / Manga / Manhwa / Light Novel) with live counts, search, sort, and genre chips. Light novels track volume and chapter independently
- **Library pagination** — 24 titles per page with WestManga-style numbered controls (`« 1 2 … 10 »`, active page highlighted)
- **Chapter sync** — pulls the latest chapter count from MangaDex, with AniList and MangaUpdates as fallbacks
- **Dashboard** — reading stats, streaks, a recently-updated shelf (6 cards with genre and tag snippets), a continue-reading card, and a responsive donut breakdown by status with percentage bars
- **Public shelf** — share a read-only view of your library. Only shelf fields, never notes
- **Export / import** — take your library out as JSON, bring it back in
- **Auth** — email confirmation, password reset, and Google OAuth via Supabase SSR. Cloudflare Turnstile guards the login form
- **Profile** — avatar upload to Supabase Storage (per-user RLS-scoped), display name
- **PWA** — installable on mobile with its own icon and standalone window

## Tech Stack

| Layer      | Tools                                              |
| ---------- | -------------------------------------------------- |
| Framework  | Next.js 16 (App Router), React 19                  |
| Styling    | Tailwind CSS v4, custom dark theme                 |
| Database   | Supabase Postgres + Row Level Security             |
| Auth       | Supabase Auth (email + Google OAuth), Turnstile    |
| Metadata   | Kitsu, AniList GraphQL, MangaDex, MangaUpdates     |
| Charts     | Recharts                                           |
| Deployment | Vercel                                             |

## Metadata Sources

Each integration is chosen for what it does best, since none of them covers everything reliably.

| Source       | Used for                                        | Notes                                                        |
| ------------ | ----------------------------------------------- | ------------------------------------------------------------ |
| Kitsu        | Explore browse + title detail                   | Primary. Free, no auth, stable covers and category data        |
| AniList      | Cover search on add, chapter fallback           | `graphql.anilist.co`. No auth, 90 req/min                      |
| MangaDex     | Latest chapter counts, Explore fallback         | Real chapter numbers for ongoing titles                        |
| MangaUpdates | Chapter fallback for official webcomics         | Indexes Kakao/Naver series MangaDex doesn't host chapters for  |
| Jikan        | Explore fallback                                | Unofficial MyAnimeList API                                     |

Explore tries Kitsu first, then Jikan, then MangaDex — the first source that returns items wins. A source that returns zero items does not end the chain.

> **Local network note**: on some ISPs, plaintext DNS on port 53 poisons `api.mangadex.org` to a dead edge IP. `src/app/api/latest-chapter/route.ts` works around this by resolving the host once over Cloudflare DoH and pinning requests to the real IP, keeping SNI intact so TLS stays valid.

## Security Notes

- Row Level Security on every table — users can only ever touch their own rows (`auth.uid()` policies with `WITH CHECK`)
- Sessions verified cryptographically (`getClaims()` with `getUser()` fallback), stored in httpOnly cookies
- No service-role key anywhere; the client bundle only carries the publishable anon key
- Server-side rate limiting on the chapter sync route (per-user, 30 requests/minute)
- Bucket-level MIME type + size enforcement for uploads
- Cloudflare Turnstile on the login form

## Performance

Upstream responses are cached server-side: 15 minutes for browse and search, 1 hour for detail pages. Repeat requests return in about 20ms instead of 800ms, and the app stays well inside AniList's request budget.

## Running Locally

```bash
git clone https://github.com/Ashurinnn123/kuro-tracker.git
cd kuro-tracker
npm install
```

Create a `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional — Turnstile falls back to Cloudflare's test key when unset
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-site-key

# Optional — used for absolute URLs in metadata
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Run the migrations from `supabase/migrations/` in order (`0001` through `0011`), then:

```bash
npm run dev
```

## Project Layout

```
src/
  app/
    api/
      explore/            # Explore list + title detail
      latest-chapter/     # Chapter count sync (MangaDex → AniList → MangaUpdates)
      public-shelf/       # Read-only public library
    dashboard/            # Dashboard, Explore, Library, Settings
    login/ signup/        # Auth screens
    u/[username]/         # Public shelf page
  components/             # dashboard, layout, library, theme, ui
  lib/                    # explore + cover search clients, Supabase clients, types
supabase/migrations/      # 0001–0011, run in order
```

## License

Not licensed for reuse. All rights reserved.