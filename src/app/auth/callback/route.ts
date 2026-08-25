import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // Only same-origin relative paths — block protocol-relative (//evil.com)
  // and backslash variants (\evil.com) that browsers treat as external.
  const safeNext =
    next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')
      ? next
      : '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Invalid login callback`)
}
