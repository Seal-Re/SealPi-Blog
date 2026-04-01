import { auth } from './auth'

export default auth((req) => {
  const path = req.nextUrl.pathname

  if (path === '/admin/login') {
    return Response.redirect(new URL('/login?next=' + encodeURIComponent('/admin'), req.nextUrl))
  }

  if (path === '/login' && req.auth) {
    const next = req.nextUrl.searchParams.get('next')
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      return Response.redirect(new URL(next, req.nextUrl))
    }
    return Response.redirect(new URL('/', req.nextUrl))
  }

  const isAdminRoute = path.startsWith('/admin')
  const isForbiddenPage = path === '/admin/forbidden'
  const isLoggedIn = Boolean(req.auth)
  const isAdmin = Boolean(req.auth?.user?.isAdmin)

  if (isAdminRoute && !isForbiddenPage) {
    if (!isLoggedIn) {
      return Response.redirect(
        new URL('/login?next=' + encodeURIComponent(path), req.nextUrl)
      )
    }
    if (!isAdmin) {
      return Response.redirect(new URL('/admin/forbidden', req.nextUrl))
    }
  }

  return undefined
})

export const config = {
  matcher: ['/admin/:path*', '/login'],
}
