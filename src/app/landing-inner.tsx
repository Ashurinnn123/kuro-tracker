import Link from "next/link"
import {
  BookOpen,
  ChevronRight,
  Layers,
  CheckCircle,
  Star,
  Zap,
  Bookmark,
} from "lucide-react"

const FEATURES: { icon: typeof BookOpen; head: string; body: string; foot: string }[] = [
  { icon: BookOpen, head: "Progress in one click", body: "Bump the chapter counter the second you finish a page. The dashboard remembers exactly where every title stopped.", foot: "1-click bump" },
  { icon: Layers, head: "Poster-style library", body: "Your shelf as a grid of covers. Filter by reading status, format, and rating without opening a single menu.", foot: "3 filters" },
  { icon: Star, head: "Ratings that match MAL", body: "Score anything from 1 to 10 with one decimal, shown as partial-fill stars. Same scale you already know.", foot: "scale 1-10" },
  { icon: Zap, head: "Live chapter sync", body: "Pulls the latest chapter count for ongoing series from MangaDex, with AniList as backup. One button, no manual lookup.", foot: "~5s per sync" },
  { icon: Bookmark, head: "Favorites stay visible", body: "Pin what matters; favorites surface at the top and get their own badge so they never sink in the pile.", foot: "always on top" },
  { icon: CheckCircle, head: "Local-first or cloud", body: "Works instantly without an account. Sign in and everything moves to your own Supabase-backed space.", foot: "RLS-isolated" },
]

export default function LandingPageInner() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ===== FLOATING PILL NAV ===== */}
      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
        <nav className="mx-auto flex max-w-5xl items-center justify-between rounded-full border border-border/70 bg-surface/80 px-6 py-3 backdrop-blur-md">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- static public asset */}
            <img src="/kuro-logo.jpg" alt="Kuro" className="h-9 w-9 rounded-md" />
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <Link href="#features" className="font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary">
              Features
            </Link>
            <Link href="#stats" className="font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary">
              Why Kuro
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground sm:inline">
              Log In
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-white px-5 py-2 font-mono text-xs font-bold uppercase tracking-widest text-[#070e1c] transition-colors hover:bg-primary"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      {/* ===== HERO ===== */}
      <section className="relative flex min-h-screen flex-col overflow-hidden">
        {/* Backdrop: halftone + glow + speed lines */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="halftone-bg absolute inset-0 opacity-25" />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 75% 55% at 68% 12%, rgb(96 165 250 / 0.14), transparent)" }} />
          <div className="speed-lines absolute inset-y-0 right-0 w-1/2 opacity-70 [mask-image:linear-gradient(to_left,black,transparent)]" />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 pb-24 pt-36 text-center">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-border/70 bg-surface/50 px-4 py-1.5 backdrop-blur">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Manga · Manhwa · Light Novels
            </span>
          </div>

          <h1 className="mt-8 font-serif text-5xl font-light italic leading-[1.08] tracking-tight sm:text-7xl lg:text-8xl">
            Read. Track.
            <br />
            <span className="text-glow font-bold text-primary">Master.</span>
          </h1>

          <p className="mt-8 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            A distraction-free home for everything you read.
            <br />
            Your progress, favorites, and ratings, all on one shelf.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 font-mono text-sm font-bold uppercase tracking-widest text-primary-foreground shadow-[0_0_20px_rgb(96_165_250/0.35)] transition-colors hover:bg-primary-strong"
            >
              Start Reading
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center rounded-full border border-border px-8 py-4 font-mono text-sm font-bold uppercase tracking-widest transition-colors hover:border-primary hover:text-primary"
            >
              I have an account
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="mx-auto max-w-2xl font-serif text-3xl italic leading-tight sm:text-4xl">
              Everything you need to keep reading,{" "}
              <span className="text-primary">nothing you don&apos;t</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Five things, done properly. No feed to doomscroll, no social layer, no ads between you and your shelf.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.head} className="group flex flex-col gap-4 rounded-2xl border border-border/60 bg-surface p-8 transition-colors hover:border-primary/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-background text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-xl">{f.head}</h3>
                <p className="flex-grow text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                <p className="border-t border-border/50 pt-4 font-mono text-[11px] uppercase tracking-widest text-primary">
                  {f.foot}
                </p>
              </div>
            ))}
          </div>

          {/* Proof: Trust */}
          <div className="mt-24 max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Trust</p>
            <h3 className="mt-3 font-serif text-2xl italic leading-snug sm:text-3xl">Your library, locked down.</h3>
            <ul className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
              <li className="flex gap-3"><CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Row-level security scopes every query to your user id at the database level, not hidden by the UI.</li>
              <li className="flex gap-3"><CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Guest data never leaves the browser until you sign in.</li>
              <li className="flex gap-3"><CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />No tracking scripts, no ads, completely sovereign.</li>
            </ul>
          </div>

          {/* Proof: Speed */}
          <div className="mt-16 grid items-center gap-12 lg:grid-cols-2">
            <div className="order-last overflow-hidden rounded-2xl border border-border/60 bg-surface p-1 shadow-2xl lg:order-first">
              <div className="flex items-center gap-2 border-b border-border/60 bg-background/60 px-4 py-3 lg:hidden">
                <span className="h-3 w-3 rounded-full bg-danger/80" />
                <span className="h-3 w-3 rounded-full bg-gold/80" />
                <span className="h-3 w-3 rounded-full bg-primary/80" />
                <span className="ml-2 font-mono text-[11px] text-muted-foreground">sync.log</span>
              </div>
              <div className="space-y-2.5 p-6 font-mono text-xs">
                {[["Eleceed", "414", "42ms"], ["Solo Leveling", "179", "38ms"], ["One Piece", "1158", "51ms"]].map(([name, ch, ms]) => (
                  <div key={name} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                    <span className="text-foreground">{name}</span>
                    <span className="text-muted-foreground">ch. {ch}</span>
                    <span className="text-emerald-500">{ms}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Speed</p>
              <h3 className="mt-3 font-serif text-2xl italic leading-snug sm:text-3xl">Sync answers before doubt settles</h3>
              <ul className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
                <li className="flex gap-3"><CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Latest-chapter sync resolves via DNS-over-HTTPS with pinned SNI, so ISP-level interference can&apos;t stall it.</li>
                <li className="flex gap-3"><CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />MangaDex first, AniList fallback; the resolved IP is cached after the first call.</li>
                <li className="flex gap-3"><CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Cover search and metadata come from a single GraphQL round-trip.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===== STATS BAND ===== */}
      <section id="stats" className="border-y border-border/50 py-14">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 text-center md:grid-cols-3 md:divide-x md:divide-border/50">
          <div className="flex flex-col gap-2">
            <p className="font-serif text-5xl font-light italic text-primary">1-Click</p>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Update Tracking</p>
          </div>
          <div className="flex flex-col gap-2 md:px-8">
            <p className="font-serif text-5xl font-light italic text-primary">90/min</p>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">API Rate Limit</p>
          </div>
          <div className="flex flex-col gap-2 md:px-8">
            <p className="font-serif text-5xl font-light italic text-primary">0</p>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Configuration Required</p>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-10">
        <p className="text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
          &copy; {new Date().getFullYear()} Kuro. Built for manga, manhwa, and light novel enthusiasts.
        </p>
      </footer>
    </div>
  )
}
