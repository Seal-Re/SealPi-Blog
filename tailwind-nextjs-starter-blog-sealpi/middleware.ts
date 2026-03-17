import { auth } from './auth'

export default auth((req) => {
  const isAdminPage = req.nextUrl.pathname.startsWith('/admin')
  const isLoginPage = req.nextUrl.pathname === '/admin/login'
  const isLoggedIn = Boolean(req.auth)
  const isAdmin = Boolean(req.auth?.user?.isAdmin)

  if (isLoginPage && isLoggedIn && isAdmin) {
    return Response.redirect(new URL('/admin', req.nextUrl))
  }

  if (isAdminPage && !isLoginPage && (!isLoggedIn || !isAdmin)) {
    return Response.redirect(new URL('/admin/login', req.nextUrl))
  }

  return undefined
})

export const config = {
  matcher: ['/admin/:path*'],
}
