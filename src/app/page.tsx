import { redirect } from "next/navigation"
import { ForceDark } from "@/components/theme/force-dark"
import LandingPageInner from "./landing-inner"

// Supabase dumps OAuth failures (expired state, blocked user, etc.) on the
// Site URL root with raw query params. Route them to a readable login error
// instead of silently reloading the landing page.
export default async function LandingPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; error_code?: string; error_description?: string }>
}) {
  const { error_code } = (await searchParams) ?? {}
  if (error_code) {
    const msg =
      error_code === "bad_oauth_state"
        ? "Login session expired before finishing — please try signing in again."
        : "Sign-in failed. Please try again."
    redirect(`/login?error=${encodeURIComponent(msg)}`)
  }

  return (
    <ForceDark>
      <LandingPageInner />
    </ForceDark>
  )
}
