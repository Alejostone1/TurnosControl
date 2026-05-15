"use client"

import { useEffect } from "react"
import { signOut, useSession } from "next-auth/react"

export function SessionGuardAuxiliar({ children }: { children: React.ReactNode }) {
  const { status } = useSession()

  useEffect(() => {
    if (status !== "authenticated") return
    const active = sessionStorage.getItem("turnos_session_active")
    if (!active) {
      signOut({ callbackUrl: "/login-auxiliar" })
    }
  }, [status])

  return <>{children}</>
}
