"use client"

import { useState } from "react"
import { SidebarVisualizador } from "@/components/layout/SidebarVisualizador"
import { Header } from "@/components/layout/Header"
import { SessionGuardVisualizador } from "@/components/layout/SessionGuardVisualizador"

export default function VisualizadorDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <SessionGuardVisualizador>
      <div className="flex h-[100dvh] bg-background overflow-hidden">
        <SidebarVisualizador
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
    </SessionGuardVisualizador>
  )
}
