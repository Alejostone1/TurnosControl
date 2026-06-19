"use client"

import { useEffect } from "react"
import { signOut, useSession } from "next-auth/react"

export function SessionGuardLiquidador({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status !== "authenticated") return
    const active = sessionStorage.getItem("turnos_session_active")
    if (!active) {
      signOut({ callbackUrl: "/login" })
      return
    }
    const role = (session?.user as any)?.role
    if (role !== "LIQUIDADOR") {
      signOut({ callbackUrl: "/login" })
    }
  }, [status, session])

  return <>{children}</>
}
