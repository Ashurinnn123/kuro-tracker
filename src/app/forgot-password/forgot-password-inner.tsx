import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { requestPasswordReset } from "@/app/auth/actions"

export async function ForgotPasswordPageInner({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>
}) {
  const { error } = (await searchParams) ?? {}
  return (
    <div className="halftone-bg flex min-h-screen w-full items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-2xl sm:p-10">
        <Link href="/" className="mb-6 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- static public asset */}
          <img src="/kuro-logo.jpg" alt="Kuro" className="h-8 w-8 rounded-md" />
        </Link>

        <h1 className="font-serif text-3xl italic tracking-tight">Reset password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        {error && (
          <div className="mt-5 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
        )}

        <form action={requestPasswordReset} className="mt-8 grid gap-6">
          <div className="grid gap-2">
            <label htmlFor="email" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Email
            </label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
          </div>

          <Button type="submit" className="h-12 w-full rounded-md bg-primary font-mono text-xs font-bold uppercase tracking-widest text-primary-foreground hover:bg-primary-strong">
            Send Reset Link
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link href="/login" className="ml-1 font-medium text-primary hover:text-primary-strong">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
