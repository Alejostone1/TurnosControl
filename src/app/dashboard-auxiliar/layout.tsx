"use client"

import { useState } from "react"
import { SidebarAuxiliar } from "@/components/layout/SidebarAuxiliar"
import { Header } from "@/components/layout/Header"
import { SessionGuardAuxiliar } from "@/components/layout/SessionGuardAuxiliar"

export default function DashboardAuxiliarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <SessionGuardAuxiliar>
      <div className="flex h-[100dvh] bg-background overflow-hidden">
        <SidebarAuxiliar
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
    </SessionGuardAuxiliar>
  )
}
