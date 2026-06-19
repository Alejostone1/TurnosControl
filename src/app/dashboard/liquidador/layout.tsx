"use client"

import { useState } from "react"
import { SidebarLiquidador } from "@/components/layout/SidebarLiquidador"
import { Header } from "@/components/layout/Header"
import { SessionGuardLiquidador } from "@/components/layout/SessionGuardLiquidador"

export default function LiquidadorDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <SessionGuardLiquidador>
      <div className="flex h-[100dvh] bg-background overflow-hidden">
        <SidebarLiquidador
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
    </SessionGuardLiquidador>
  )
}
