"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Users,
  Calendar,
  CalendarRange,
  LogOut,
  Menu,
  UserCog,
} from "lucide-react"
import { useState } from "react"
import { signOut, useSession } from "next-auth/react"

const navigation = [
  { name: "Inicio",        href: "/dashboard-auxiliar",              icon: LayoutDashboard },
  { name: "Empleados",     href: "/dashboard-auxiliar/empleados",    icon: Users },
  { name: "Programación",  href: "/dashboard-auxiliar/programacion", icon: Calendar },
  { name: "Períodos",      href: "/dashboard-auxiliar/periodos",     icon: CalendarRange },
]

export function SidebarAuxiliar() {
  const pathname  = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { data: session } = useSession()

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login-auxiliar" })
  }

  return (
    <div className={cn(
      "flex flex-col h-full bg-card border-r transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b min-h-[65px]">
        {!isCollapsed && (
          <div className="min-w-0 flex-1 mr-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <UserCog className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">Auxiliar</span>
            </div>
            <h2 className="text-sm font-bold text-foreground truncate leading-tight">
              {(session as any)?.user?.empresaNombre || "Sistema"}
            </h2>
            <p className="text-xs text-muted-foreground truncate">
              {session?.user?.name}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-8 w-8"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navigation.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors cursor-pointer",
                isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                isCollapsed && "justify-center px-2"
              )}>
                <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-emerald-600")} />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t">
        <button
          type="button"
          onClick={handleSignOut}
          className={cn(
            "w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors",
            isCollapsed && "justify-center"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>
    </div>
  )
}
