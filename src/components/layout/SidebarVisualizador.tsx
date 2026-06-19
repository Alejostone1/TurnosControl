"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Calendar,
  Calculator,
  FileText,
  Users,
  LogOut,
  Menu,
  X,
  CheckCircle2,
  Building2,
} from "lucide-react"
import { useState, useEffect } from "react"
import { signOut, useSession } from "next-auth/react"

interface SidebarVisualizadorProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

const navigation = [
  { name: "Inicio",           href: "/dashboard/visualizador",                 icon: LayoutDashboard },
  { name: "Programaciones",    href: "/dashboard/visualizador/programaciones",  icon: Calendar },
  { name: "Liquidaciones",     href: "/dashboard/visualizador/liquidaciones",   icon: Calculator },
  { name: "Aprobaciones",      href: "/dashboard/visualizador/aprobaciones",    icon: CheckCircle2 },
  { name: "Empleados",         href: "/dashboard/visualizador/empleados",       icon: Users },
  { name: "Reportes",          href: "/dashboard/visualizador/reportes",        icon: FileText },
]

export function SidebarVisualizador({ mobileOpen = false, onMobileClose }: SidebarVisualizadorProps) {
  const pathname  = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { data: session } = useSession()

  useEffect(() => {
    onMobileClose?.()
  }, [pathname, onMobileClose])

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" })
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <div className={cn(
        "flex flex-col bg-card border-r transition-all duration-300 ease-in-out z-50",
        "fixed inset-y-0 left-0",
        mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
        "md:relative md:translate-x-0 md:shadow-none",
        isCollapsed ? "w-72 md:w-16" : "w-72 md:w-64",
      )}>
        <div className="flex items-center justify-between p-4 border-b min-h-[65px]">
          <div className={cn("min-w-0 flex-1 mr-2", isCollapsed && "md:hidden")}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Building2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
              <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide">Visualizador</span>
            </div>
            <h2 className="text-sm font-bold text-foreground truncate leading-tight">
              {(session as any)?.user?.empresaNombre || "Sistema"}
            </h2>
            <p className="text-xs text-muted-foreground truncate">
              {session?.user?.name}
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8 md:hidden"
            onClick={onMobileClose}
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8 hidden md:flex"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navigation.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-2.5 md:py-2 text-sm font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-purple-50 text-purple-700"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  isCollapsed && "md:justify-center md:px-2"
                )}>
                  <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-purple-600")} />
                  <span className={cn("truncate", isCollapsed && "md:hidden")}>{item.name}</span>
                </div>
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t">
          <button
            type="button"
            onClick={handleSignOut}
            className={cn(
              "w-full flex items-center gap-2 rounded-md px-2 py-2.5 md:py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors",
              isCollapsed && "md:justify-center"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={cn("truncate", isCollapsed && "md:hidden")}>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </>
  )
}
