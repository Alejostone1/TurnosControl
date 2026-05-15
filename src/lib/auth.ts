import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"
import { registrarAuditoria } from "./auditoria"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const user = await prisma.usuario.findUnique({
            where: { correo: credentials.email as string },
            include: { empresa: true }
          })

          if (user && user.estaActivo) {
            const isValid = await bcrypt.compare(credentials.password as string, user.contrasena)
            if (isValid) {
              registrarAuditoria({
                empresaId: user.empresaId,
                usuarioId: user.id,
                accion: 'INICIAR_SESION',
                modulo: 'AUTH',
                entidad: 'Usuario',
                entidadId: user.id,
                descripcion: `Inicio de sesión: ${user.nombres} ${user.apellidos} (${user.correo})`,
                severidad: 'INFO',
                esAutomatico: false,
              }).catch(() => {})
              return {
                id: user.id,
                email: user.correo,
                name: `${user.nombres} ${user.apellidos}`,
                role: user.rol,
                userType: "usuario",
                empresaId: user.empresaId,
                empresaSlug: user.empresa.slug,
                empresaNombre: user.empresa.nombre,
              }
            } else {
              registrarAuditoria({
                empresaId: user.empresaId,
                accion: 'LOGIN_FALLIDO',
                modulo: 'AUTH',
                entidad: 'Usuario',
                entidadId: user.id,
                descripcion: `Intento de acceso fallido: ${user.correo}`,
                severidad: 'MEDIO',
                requiereRevision: false,
              }).catch(() => {})
            }
          }

          const auxiliar = await prisma.auxiliar.findFirst({
            where: { correo: credentials.email as string },
            include: { empresa: true }
          })

          if (auxiliar && auxiliar.estaActivo) {
            const isValid = await bcrypt.compare(credentials.password as string, auxiliar.contrasena)
            if (isValid) {
              registrarAuditoria({
                empresaId: auxiliar.empresaId,
                auxiliarId: auxiliar.id,
                accion: 'INICIAR_SESION',
                modulo: 'AUTH',
                entidad: 'Auxiliar',
                entidadId: auxiliar.id,
                descripcion: `Inicio de sesión auxiliar: ${auxiliar.nombres} ${auxiliar.apellidos} (${auxiliar.correo})`,
                severidad: 'INFO',
                esAutomatico: false,
              }).catch(() => {})
              return {
                id: auxiliar.id,
                email: auxiliar.correo,
                name: `${auxiliar.nombres} ${auxiliar.apellidos}`,
                role: "AUXILIAR",
                userType: "auxiliar",
                empresaId: auxiliar.empresaId,
                empresaSlug: auxiliar.empresa.slug,
                empresaNombre: auxiliar.empresa.nombre,
              }
            } else {
              registrarAuditoria({
                empresaId: auxiliar.empresaId,
                auxiliarId: auxiliar.id,
                accion: 'LOGIN_FALLIDO',
                modulo: 'AUTH',
                entidad: 'Auxiliar',
                entidadId: auxiliar.id,
                descripcion: `Intento de acceso fallido (auxiliar): ${auxiliar.correo}`,
                severidad: 'MEDIO',
              }).catch(() => {})
            }
          }

          return null
        } catch (error) {
          console.error("Error en autenticación:", error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: "jwt" as const,
    maxAge: 8 * 60 * 60,
    updateAge: 60 * 60,
  },
  callbacks: {
    async jwt({ token, user, trigger, session }: any) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.userType = user.userType
        token.empresaId = user.empresaId
        token.empresaSlug = user.empresaSlug
        token.empresaNombre = user.empresaNombre
      }

      if (trigger === "update" && session?.user?.empresaNombre) {
        token.empresaNombre = session.user.empresaNombre
      }

      return token
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.userType = token.userType
        session.user.empresaId = token.empresaId
        session.user.empresaSlug = token.empresaSlug
        session.user.empresaNombre = token.empresaNombre
      }
      return session
    }
  },
  events: {
    async signOut(message: any) {
      const token = (message as any)?.token
      if (!token?.empresaId || !token?.id) return
      const isAuxiliar = token.userType === "auxiliar"
      registrarAuditoria({
        empresaId: token.empresaId,
        usuarioId:  isAuxiliar ? null    : token.id,
        auxiliarId: isAuxiliar ? token.id : null,
        accion: 'CERRAR_SESION',
        modulo: 'AUTH',
        entidad: isAuxiliar ? 'Auxiliar' : 'Usuario',
        entidadId: token.id,
        descripcion: `Cierre de sesión: ${token.name ?? token.email}`,
        severidad: 'INFO',
      }).catch(() => {})
    }
  },
  pages: {
    signIn: "/login",
    error: "/login"
  },
  trustHost: true,
})

// Backward-compat export for the route handler
export const authOptions = { handlers, signIn, signOut, auth }
