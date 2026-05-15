"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Users,
  Calendar,
  Calculator,
  Settings,
  FileText,
  LogOut,
  Menu,
  ChevronDown,
  CalendarRange,
  BarChart2,
  ClipboardList,
  BookOpen,
  UserCog,
  ShieldCheck,
  User,
  History,
} from "lucide-react"
import { useState, useEffect } from "react"
import { signOut, useSession } from "next-auth/react"

interface NavChild {
  name: string
  href: string
  icon: React.ElementType
}

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
  children?: NavChild[]
}

const navigation: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Empleados",
    href: "/dashboard/employees",
    icon: Users,
  },
  {
    name: "Auxiliares",
    href: "/dashboard/auxiliares",
    icon: UserCog,
  },
  {
    name: "Nómina y Períodos",
    href: "/dashboard/payroll",
    icon: Calculator,
    children: [
      { name: "Períodos", href: "/dashboard/payroll/periods", icon: CalendarRange },
      { name: "Resultados", href: "/dashboard/payroll/results", icon: BarChart2 },
    ],
  },
  {
    name: "Programación",
    href: "/dashboard/schedules",
    icon: Calendar,
    children: [
      { name: "Individual",  href: "/dashboard/schedules/individual",  icon: User },
      { name: "Masiva",      href: "/dashboard/schedules/masiva",      icon: Users },
      { name: "Historial",   href: "/dashboard/schedules/historial",   icon: History },
    ],
  },
  {
    name: "Reportes",
    href: "/dashboard/reports",
    icon: FileText,
  },
  {
    name: "Auditoría",
    href: "/dashboard/auditoria",
    icon: ShieldCheck,
  },
  {
    name: "Configuración",
    href: "/dashboard/settings",
    icon: Settings,
    children: [
      { name: "Conceptos", href: "/dashboard/settings/concepts", icon: ClipboardList },
      { name: "Legal / Jornada", href: "/dashboard/settings/legal", icon: BookOpen },
      { name: "Empresa", href: "/dashboard/settings/company", icon: UserCog },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { data: session } = useSession()

  // Open parent sections whose children match the current path
  const initialOpen = navigation
    .filter(item => item.children?.some(c => pathname.startsWith(c.href)) || pathname.startsWith(item.href + "/"))
    .map(item => item.href)

  const [openSections, setOpenSections] = useState<string[]>(initialOpen)

  // Keep sections open when navigating into them
  useEffect(() => {
    navigation.forEach(item => {
      if (item.children) {
        const childActive = item.children.some(c => pathname.startsWith(c.href))
        if (childActive) {
          setOpenSections(prev => prev.includes(item.href) ? prev : [...prev, item.href])
        }
      }
    })
  }, [pathname])

  const toggleSection = (href: string) => {
    setOpenSections(prev =>
      prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href]
    )
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" })
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
        {navigation.map((item) => {
          const isParentActive = pathname === item.href ||
            (item.children ? item.children.some(c => pathname.startsWith(c.href)) : pathname.startsWith(item.href + "/"))
          const isOpen = openSections.includes(item.href)
          const hasChildren = !!item.children?.length

          return (
            <div key={item.href}>
              {hasChildren ? (
                // Parent with sub-menu — toggle on click
                <button
                  type="button"
                  onClick={() => !isCollapsed && toggleSection(item.href)}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors text-left",
                    isParentActive
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    isCollapsed && "justify-center px-2"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 truncate">{item.name}</span>
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 transition-transform text-muted-foreground/60",
                          isOpen && "rotate-180"
                        )}
                      />
                    </>
                  )}
                </button>
              ) : (
                // Regular link
                <Link href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors cursor-pointer",
                      isParentActive
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      isCollapsed && "justify-center px-2"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span className="truncate">{item.name}</span>}
                  </div>
                </Link>
              )}

              {/* Sub-items */}
              {hasChildren && !isCollapsed && isOpen && (
                <div className="ml-3 mt-0.5 mb-1 border-l border-border/60 pl-3 space-y-0.5">
                  {item.children!.map(child => {
                    const isChildActive = pathname === child.href || pathname.startsWith(child.href + "/")
                    return (
                      <Link key={child.href} href={child.href}>
                        <div
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors cursor-pointer",
                            isChildActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <child.icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{child.name}</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
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
