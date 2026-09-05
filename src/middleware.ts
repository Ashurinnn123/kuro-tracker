import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// In-memory store: IP -> { count, resetTime }
const store = new Map<string, { count: number; resetTime: number }>()
const LIMIT = 100 // requests per window
const WINDOW_MS = 60_000 // 1 minute

export function middleware(req: NextRequest) {
  const ip = req.ip ?? req.headers.get('x-forwarded-for') ?? 'unknown'
  const now = Date.now()
  const record = store.get(ip)

  if (!record || now > record.resetTime) {
    store.set(ip, { count: 1, resetTime: now + WINDOW_MS })
    return NextResponse.next()
  }

  record.count += 1
  if (record.count > LIMIT) {
    return new NextResponse('Too Many Requests', { status: 429 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*'],
}