import { NextResponse } from 'next/server'

export function middleware() {
  // Protection par mot de passe desactivee : le site public reste accessible.
  return NextResponse.next()
}

export const config = {
  matcher: '/:path*',
}
