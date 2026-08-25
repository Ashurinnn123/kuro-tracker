import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { login, signInWithGoogle } from "@/app/auth/actions"

// Split auth card: brand panel left (hidden on mobile), form right.
function BrandPanel() {
  return (
    <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden rounded-l-2xl bg-[#0d1526] p-8 md:flex">
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id="kglow" cx="30%" cy="20%" r="80%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#kglow)" />
        {[
          "M-40 220 C 120 140, 200 300, 420 210 S 700 120, 760 190",
          "M-40 320 C 140 240, 240 400, 460 310 S 720 230, 780 300",
          "M-40 430 C 160 360, 260 500, 480 420 S 740 340, 800 420",
          "M-40 540 C 180 480, 280 610, 500 530 S 760 450, 820 540",
        ].map((d) => (
          <path key={d} d={d} fill="none" stroke="#60a5fa" strokeOpacity="0.14" strokeWidth="1.2" />
        ))}
      </svg>

      <Link href="/" className="relative flex items-center transition-opacity hover:opacity-80">
        {/* eslint-disable-next-line @next/next/no-img-element -- static public asset */}
        <img src="/kuro-logo.jpg" alt="Kuro" className="h-16 w-16 rounded-xl" />
      </Link>

      <div className="relative">
        <p className="font-serif text-xl italic leading-snug text-foreground/90">
          Every chapter,
          <br />
          in its place.
        </p>
        <p className="mt-2 max-w-[26ch] text-sm leading-relaxed text-muted-foreground">
          Track manga, manhwa, and light novels, locally or across devices.
        </p>
      </div>
    </div>
  )
}

export async function LoginPageInner({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const { error, message } = await searchParams
  return (
    <div className="halftone-bg flex min-h-screen w-full items-center justify-center bg-background px-4 py-10">
      <div className="flex w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <BrandPanel />

        <div className="flex-1 p-8 sm:p-10">
          <Link href="/" className="mb-6 flex items-center gap-2 md:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- static public asset */}
            <img src="/kuro-logo.jpg" alt="Kuro" className="h-8 w-8 rounded-md" />
          </Link>

          <h1 className="font-serif text-3xl italic tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Log in to pick up where you left off.</p>

          {error && (
            <div className="mb-4 mt-5 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 mt-5 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
              {message}
            </div>
          )}

          <form action={login} className="mt-8 grid gap-6">
            <div className="grid gap-2">
              <label htmlFor="email" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Email</label>
              <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
            </div>

            <div className="grid gap-2">
              <label htmlFor="password" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Password</label>
              <Input id="password" name="password" type="password" required autoComplete="current-password" />
            </div>

            <div className="mt-2 flex justify-end">
              <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-primary">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="mt-2 h-12 w-full rounded-md bg-primary font-mono text-xs font-bold uppercase tracking-widest text-primary-foreground hover:bg-primary-strong">
              Log In
            </Button>
          </form>

          {/* Google OAuth — same flow, no password */}
          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <form action={signInWithGoogle} className="mt-6">
            <Button
              type="submit"
              variant="outline"
              className="h-12 w-full rounded-md font-mono text-xs font-bold uppercase tracking-widest hover:bg-surface-2"
            >
              Continue with Google
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="ml-1 font-medium text-primary hover:text-primary-strong">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
