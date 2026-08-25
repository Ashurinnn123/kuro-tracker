import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Fail-closed: without Supabase env vars we cannot verify ANY session.
  // Blocklist-style gate below must never silently open. Public pages pass;
  // protected paths get redirected to login with an explicit error.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.search = '?error=Server%20misconfigured%20—%20contact%20the%20owner'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Verify locally from the JWT when possible (no network round-trip).
  // Falls back to getUser() if the keyset isn't cached yet or verification fails.
  let user = null
  try {
    const { data } = await supabase.auth.getClaims()
    user = data?.claims ?? null
  } catch {
    user = null
  }
  if (!user) {
    const { data } = await supabase.auth.getUser()
    user = data.user
  }

  const path = request.nextUrl.pathname

  if (!user && (path.startsWith('/dashboard'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  if (user && (path.startsWith('/login') || path.startsWith('/signup'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
