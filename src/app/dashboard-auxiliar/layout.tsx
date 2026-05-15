import { SidebarAuxiliar } from "@/components/layout/SidebarAuxiliar"
import { Header } from "@/components/layout/Header"
import { SessionGuardAuxiliar } from "@/components/layout/SessionGuardAuxiliar"

export default function DashboardAuxiliarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionGuardAuxiliar>
      <div className="flex h-screen bg-background">
        <SidebarAuxiliar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SessionGuardAuxiliar>
  )
}
