import { decode } from "next-auth/jwt"
import type { NextRequest } from "next/server"

/**
 * Auth.js v5 changed the session cookie name from "next-auth.session-token"
 * to "authjs.session-token" (__Secure- prefix on HTTPS).
 * getToken() from next-auth/jwt still looks for the old name, so we decode manually.
 */
export async function getAuthToken(req: NextRequest) {
  const secureCookie = process.env.NODE_ENV === "production"
  const cookieName = secureCookie
    ? "__Secure-authjs.session-token"
    : "authjs.session-token"

  const cookieValue = req.cookies.get(cookieName)?.value
  if (!cookieValue) return null

  try {
    return await decode({
      token: cookieValue,
      secret:
        process.env.AUTH_SECRET ||
        process.env.NEXTAUTH_SECRET ||
        "tu-secreto-aqui-cambiar-en-produccion",
      salt: cookieName,
    })
  } catch {
    return null
  }
}
