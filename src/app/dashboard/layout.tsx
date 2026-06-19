"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { SessionGuard } from "@/components/layout/SessionGuard"
import { useSession } from "next-auth/react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data: session, status } = useSession()
  const pathname = usePathname()

  useEffect(() => {
    if (status !== "authenticated") return
    const role = (session?.user as any)?.role
    const path = window.location.pathname
    const isAdmin = role === "SUPER_ADMIN" || role === "ADMINISTRADOR"
    if (!isAdmin) {
      if (role === "LIQUIDADOR" && !path.startsWith("/dashboard/liquidador")) {
        window.location.href = "/dashboard/liquidador"
      } else if (role === "VISUALIZADOR" && !path.startsWith("/dashboard/visualizador")) {
        window.location.href = "/dashboard/visualizador"
      }
    }
  }, [status, session])

  const isRoleSpecific = pathname.startsWith("/dashboard/visualizador") || pathname.startsWith("/dashboard/liquidador")

  // Role-specific routes (visualizador, liquidador) have their own layout (sidebar, header, guard)
  // so the parent layout should only render children for them
  if (isRoleSpecific) {
    return <SessionGuard>{children}</SessionGuard>
  }

  return (
    <SessionGuard>
      <div className="flex h-[100dvh] bg-background overflow-hidden">
        <Sidebar
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header onMobileMenuToggle={() => setMobileOpen(v => !v)} />
          <main className="flex-1 overflow-auto p-3 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SessionGuard>
  )
}
