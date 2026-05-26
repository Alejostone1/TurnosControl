import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { decode } from "next-auth/jwt"

export async function middleware(req: NextRequest) {
  // Auth.js v5 changed the cookie name from "next-auth.session-token" to "authjs.session-token"
  // getToken() from next-auth/jwt still looks for the old name, so we decode manually.
  const secureCookie = req.nextUrl.protocol === "https:"
  const cookieName = secureCookie
    ? "__Secure-authjs.session-token"
    : "authjs.session-token"
  const cookieValue = req.cookies.get(cookieName)?.value

  let token: any = null
  if (cookieValue) {
    try {
      token = await decode({
        token: cookieValue,
        secret:
          process.env.AUTH_SECRET ||
          process.env.NEXTAUTH_SECRET ||
          "tu-secreto-aqui-cambiar-en-produccion",
        salt: cookieName,
      })
    } catch {
      token = null
    }
  }

  const path = req.nextUrl.pathname
  const isAuxiliar = token?.userType === "auxiliar"

  // No token — redirect to appropriate login
  if (!token) {
    if (path.startsWith("/dashboard-auxiliar")) {
      return NextResponse.redirect(new URL("/login-auxiliar", req.url))
    }
    if (!path.startsWith("/login") && !path.startsWith("/register")) {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    return NextResponse.next()
  }

  // Block cross-role access: auxiliar trying to access admin dashboard
  if (path.startsWith("/dashboard") && !path.startsWith("/dashboard-auxiliar") && isAuxiliar) {
    return NextResponse.redirect(new URL("/dashboard-auxiliar", req.url))
  }

  // Block cross-role access: admin trying to access auxiliar dashboard
  if (path.startsWith("/dashboard-auxiliar") && !isAuxiliar) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // Protect admin-only routes
  if (path.startsWith("/dashboard/admin") && token?.role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // Inject tenant headers
  const response = NextResponse.next()
  if (token?.empresaId) {
    response.headers.set("x-tenant-id", token.empresaId as string)
  }
  if (isAuxiliar) {
    response.headers.set("x-user-type", "auxiliar")
    response.headers.set("x-auxiliar-id", token.id as string)
  }

  return response
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/dashboard-auxiliar/:path*",
    "/api/((?!auth).*)",
  ],
}
