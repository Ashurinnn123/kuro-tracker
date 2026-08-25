# Kuro — Reading Tracker

Track your manga, manhwa, and light novels in one place. Built with Next.js 16, React 19, Tailwind CSS v4, and Supabase.

**Live**: [kuro-tracker.vercel.app](https://kuro-tracker.vercel.app)

## Features

- **Library management** — CRUD for titles with media type (manga / manhwa / light novel), reading status, progress, and a 1–10 decimal rating scale
- **Title autofill** — search-as-you-type suggestions from AniList: cover, romaji title, chapter/volume totals, genres, and media type filled in one click
- **Chapter sync** — pulls the latest chapter count from MangaDex, with AniList and MangaUpdates as fallbacks (covers official webcomics that don't host chapters on MangaDex)
- **Genre filters** — AniList-style colored genre chips, auto-derived from your own library
- **Dashboard** — reading stats, status distribution chart, recently updated shelf, continue-reading card
- **Auth** — email confirmation flow + Google OAuth, session handling via Supabase SSR middleware
- **Profile** — avatar upload to Supabase Storage (per-user RLS-scoped), display name

## Tech Stack

| Layer      | Tools                                              |
| ---------- | -------------------------------------------------- |
| Framework  | Next.js 16 (App Router), React 19                  |
| Styling    | Tailwind CSS v4, custom dark theme                 |
| Database   | Supabase Postgres + Row Level Security             |
| Auth       | Supabase Auth (email + Google OAuth)               |
| Charts     | Recharts                                           |
| Deployment | Vercel                                             |

## Security Notes

- Row Level Security on every table — users can only ever touch their own rows (`auth.uid()` policies with `WITH CHECK`)
- Sessions verified cryptographically (`getClaims()` with `getUser()` fallback), stored in httpOnly cookies
- No service-role key anywhere; the client bundle only carries the publishable anon key
- Server-side rate limiting on external API sync routes
- Bucket-level MIME type + size enforcement for uploads

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

Run the migrations from `supabase/migrations/` in order, then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
