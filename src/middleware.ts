import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { decode } from "next-auth/jwt"

export async function middleware(req: NextRequest) {
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
  const role = token?.role

  // ===== NO TOKEN — redirect to appropriate login =====
  if (!token) {
    if (path.startsWith("/dashboard-auxiliar")) {
      return NextResponse.redirect(new URL("/login-auxiliar", req.url))
    }
    if (path.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    const isAuthPage = path.startsWith("/login") || path.startsWith("/login-auxiliar") || path.startsWith("/login-liquidador") || path.startsWith("/login-visualizador") || path.startsWith("/register")
    if (!isAuthPage) {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    return NextResponse.next()
  }

  // ===== AUXILIAR — can only access /dashboard-auxiliar and /api/* =====
  if (isAuxiliar) {
    if (!path.startsWith("/dashboard-auxiliar") && !path.startsWith("/api/")) {
      return NextResponse.redirect(new URL("/dashboard-auxiliar", req.url))
    }
    const response = NextResponse.next()
    response.headers.set("x-tenant-id", token.empresaId as string)
    response.headers.set("x-user-type", "auxiliar")
    response.headers.set("x-auxiliar-id", token.id as string)
    return response
  }

  // ===== USUARIO (not auxiliar) — role-based protection =====
  const allowedAdmin = role === "SUPER_ADMIN" || role === "ADMINISTRADOR"
  const allowedLiquidador = role === "LIQUIDADOR"
  const allowedVisualizador = role === "VISUALIZADOR"

  // LIQUIDADOR can access /dashboard-auxiliar/* (same functionality as auxiliar)
  if (path.startsWith("/dashboard-auxiliar") && allowedLiquidador) {
    const response = NextResponse.next()
    if (token?.empresaId) response.headers.set("x-tenant-id", token.empresaId as string)
    response.headers.set("x-user-type", "usuario")
    response.headers.set("x-role", "LIQUIDADOR")
    return response
  }

  // Block auxiliar routes for other non-auxiliares
  if (path.startsWith("/dashboard-auxiliar")) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // /dashboard/liquidador/* — only LIQUIDADOR
  if (path.startsWith("/dashboard/liquidador") && !allowedLiquidador) {
    if (allowedAdmin) return NextResponse.redirect(new URL("/dashboard", req.url))
    if (allowedVisualizador) return NextResponse.redirect(new URL("/dashboard/visualizador", req.url))
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // /dashboard/visualizador/* — only VISUALIZADOR
  if (path.startsWith("/dashboard/visualizador") && !allowedVisualizador) {
    if (allowedAdmin) return NextResponse.redirect(new URL("/dashboard", req.url))
    if (allowedLiquidador) return NextResponse.redirect(new URL("/dashboard/liquidador", req.url))
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // /dashboard/supervision — only ADMIN
  if (path.startsWith("/dashboard/supervision") && !allowedAdmin) {
    if (allowedLiquidador) return NextResponse.redirect(new URL("/dashboard/liquidador", req.url))
    if (allowedVisualizador) return NextResponse.redirect(new URL("/dashboard/visualizador", req.url))
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // /dashboard/* (other admin routes) — only ADMIN roles
  // Sub-routes already handled above are excluded to prevent redirect loops
  const isLiquidadorRoute = path.startsWith("/dashboard/liquidador")
  const isVisualizadorRoute = path.startsWith("/dashboard/visualizador")
  const isSupervisionRoute = path.startsWith("/dashboard/supervision")
  if (path.startsWith("/dashboard") && !isLiquidadorRoute && !isVisualizadorRoute && !isSupervisionRoute) {
    if (!allowedAdmin) {
      if (allowedLiquidador) return NextResponse.redirect(new URL("/dashboard/liquidador", req.url))
      if (allowedVisualizador) return NextResponse.redirect(new URL("/dashboard/visualizador", req.url))
      return NextResponse.redirect(new URL("/login", req.url))
    }
  }

  // Inject tenant headers
  const response = NextResponse.next()
  if (token?.empresaId) {
    response.headers.set("x-tenant-id", token.empresaId as string)
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
