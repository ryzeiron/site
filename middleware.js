import { NextResponse } from 'next/server'

export function middleware(req) {
  const basicAuthEnabled = process.env.BASIC_AUTH_ENABLED === 'true'

  if (!basicAuthEnabled) {
    return NextResponse.next()
  }

  const authHeader = req.headers.get('authorization')
  const user = process.env.BASIC_AUTH_USER
  const pass = process.env.BASIC_AUTH_PASSWORD

  if (!user || !pass) {
    return NextResponse.next()
  }

  const expected = 'Basic ' + btoa(`${user}:${pass}`)

  if (authHeader !== expected) {
    return new NextResponse('Accès refusé', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Site privé"',
      },
    })
  }

  return NextResponse.next()
}

// Appliquer le middleware à tout le site uniquement si BASIC_AUTH_ENABLED=true.
export const config = {
  matcher: '/:path*',
}
