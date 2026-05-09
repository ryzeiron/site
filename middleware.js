import { NextResponse } from 'next/server' 

export function middleware(req) {
  const authHeader = req.headers.get('authorization')

  const USER = 'admin' 
  const PASS = 'Poupoune15@'

  const expected = 'Basic ' + btoa(`${USER}:${PASS}`)

  if (authHeader !== expected) {
    return new NextResponse('Accès refusé', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Site privé"'
      }
    })
  }

  return NextResponse.next()
}

// Appliquer le middleware à tout le site
export const config = {
  matcher: '/:path*',
}
