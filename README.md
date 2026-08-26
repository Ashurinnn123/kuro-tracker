# Kuro — Reading Tracker

Track your manga, manhwa, and light novels in one place. Built with Next.js 16, React 19, Tailwind CSS v4, and Supabase.

**Live**: [kuro-tracker.vercel.app](https://kuro-tracker.vercel.app)

## Features

- **Explore** — browse trending manga, manhwa, and light novels from AniList. Tabs are partitioned by format, so light novels never leak into the manga tab
- **Live search preview** — type two characters and get cover thumbnails, scores, and formats inline; click straight through to a detail page
- **Genre and tag filters** — AniList-style multi-select genre dropdown plus a single tag filter with free text and popular suggestions. Filter state lives in the URL, so the back button restores your exact browse position
- **Title detail** — banner, description, score, relations, and recommendations. Genre and tag chips are clickable and jump back into a filtered Explore
- **One-click add** — everything comes from AniList: cover, chapter/volume totals, genres, curated tags, and the correct media type (country of origin decides manga vs manhwa)
- **Library management** — reading status, progress, notes, and a 1–10 decimal rating. Light novels track volume and chapter independently
- **Chapter sync** — pulls the latest chapter count from MangaDex, with AniList and MangaUpdates as fallbacks
- **Dashboard** — reading stats, streaks, status distribution chart, recently updated shelf, continue-reading card
- **Public shelf** — share a read-only view of your library
- **Export / import** — take your library out as JSON, bring it back in
- **Auth** — email confirmation, password reset, and Google OAuth via Supabase SSR middleware
- **Profile** — avatar upload to Supabase Storage (per-user RLS-scoped), display name
- **PWA** — installable on mobile with its own icon and standalone window

## Tech Stack

| Layer      | Tools                                              |
| ---------- | -------------------------------------------------- |
| Framework  | Next.js 16 (App Router), React 19                  |
| Styling    | Tailwind CSS v4, custom dark theme                 |
| Database   | Supabase Postgres + Row Level Security             |
| Auth       | Supabase Auth (email + Google OAuth)               |
| Metadata   | AniList GraphQL, MangaDex, MangaUpdates            |
| Charts     | Recharts                                           |
| Deployment | Vercel                                             |

## Security Notes

- Row Level Security on every table — users can only ever touch their own rows (`auth.uid()` policies with `WITH CHECK`)
- Sessions verified cryptographically (`getClaims()` with `getUser()` fallback), stored in httpOnly cookies
- No service-role key anywhere; the client bundle only carries the publishable anon key
- Server-side rate limiting on external API sync routes
- Bucket-level MIME type + size enforcement for uploads

## Performance

AniList responses are cached server-side: 15 minutes for browse and search, 1 hour for detail pages. Repeat requests return in about 20ms instead of 800ms, and the app stays well inside AniList's 90 requests/minute budget.

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
```

Run the migrations from `supabase/migrations/` in order (`0001` through `0011`), then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
