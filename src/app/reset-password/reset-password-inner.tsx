import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updatePassword, logout } from "@/app/auth/actions"

export async function ResetPasswordPageInner({
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

        <h1 className="font-serif text-3xl italic tracking-tight">Set a new password</h1>

        {error && (
          <div className="mt-5 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
        )}

        <form action={updatePassword} className="mt-8 grid gap-6">
          <div className="grid gap-2">
            <label htmlFor="password" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              New password
            </label>
            <Input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" />
          </div>

          <Button type="submit" className="h-12 w-full rounded-md bg-primary font-mono text-xs font-bold uppercase tracking-widest text-primary-foreground hover:bg-primary-strong">
            Update Password
          </Button>
        </form>

        <form action={logout} className="mt-4 text-center">
          <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
            Cancel and sign out
          </button>
        </form>
      </div>
    </div>
  )
}
