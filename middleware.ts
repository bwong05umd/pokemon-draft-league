import { createClient } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request)
  const url = request.nextUrl

  // Refresh session if expired - required for Server Components
  const { data: { user } } = await supabase.auth.getUser()

  const isJoin = url.pathname.startsWith('/join')
  const isProtected = url.pathname.startsWith('/dashboard') || url.pathname.startsWith('/league') || isJoin

  if (!user && isProtected) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('next', url.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/join/:path*',
    '/league/:path*',
  ],
}

