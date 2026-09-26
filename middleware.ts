import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: cookies => cookies.forEach(({ name, value, options }) => { request.cookies.set(name, value); response.cookies.set(name, value, options) }) } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  const protectedPath = ['/account','/dashboard','/deposit','/notifications','/refund']
  const isProtected = protectedPath.some(p => request.nextUrl.pathname === p || request.nextUrl.pathname.startsWith(p + '/'))
  const isAdmin = request.nextUrl.pathname === '/admin' || request.nextUrl.pathname.startsWith('/admin/')
  if ((isProtected || isAdmin) && !user) {
    const url = request.nextUrl.clone(); url.pathname = '/login'; url.searchParams.set('next', request.nextUrl.pathname); return NextResponse.redirect(url)
  }
  return response
}

export const config = { matcher: ['/account/:path*','/dashboard/:path*','/deposit/:path*','/notifications/:path*','/refund/:path*','/admin/:path*'] }
