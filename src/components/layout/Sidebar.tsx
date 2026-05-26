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
  X,
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

interface SidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

const navigation: NavItem[] = [
  { name: "Dashboard",        href: "/dashboard",                       icon: LayoutDashboard },
  { name: "Empleados",        href: "/dashboard/employees",             icon: Users },
  { name: "Auxiliares",       href: "/dashboard/auxiliares",            icon: UserCog },
  {
    name: "Nómina y Períodos", href: "/dashboard/payroll", icon: Calculator,
    children: [
      { name: "Períodos",     href: "/dashboard/payroll/periods",       icon: CalendarRange },
      { name: "Resultados",   href: "/dashboard/payroll/results",       icon: BarChart2 },
    ],
  },
  {
    name: "Programación",      href: "/dashboard/schedules", icon: Calendar,
    children: [
      { name: "Individual",   href: "/dashboard/schedules/individual",  icon: User },
      { name: "Masiva",       href: "/dashboard/schedules/masiva",      icon: Users },
      { name: "Historial",    href: "/dashboard/schedules/historial",   icon: History },
    ],
  },
  { name: "Reportes",         href: "/dashboard/reports",               icon: FileText },
  { name: "Auditoría",        href: "/dashboard/auditoria",             icon: ShieldCheck },
  {
    name: "Configuración",     href: "/dashboard/settings", icon: Settings,
    children: [
      { name: "Conceptos",    href: "/dashboard/settings/concepts",     icon: ClipboardList },
      { name: "Legal / Jornada", href: "/dashboard/settings/legal",    icon: BookOpen },
      { name: "Empresa",      href: "/dashboard/settings/company",      icon: UserCog },
    ],
  },
]

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { data: session } = useSession()

  const initialOpen = navigation
    .filter(item => item.children?.some(c => pathname.startsWith(c.href)) || pathname.startsWith(item.href + "/"))
    .map(item => item.href)

  const [openSections, setOpenSections] = useState<string[]>(initialOpen)

  useEffect(() => {
    navigation.forEach(item => {
      if (item.children) {
        const childActive = item.children.some(c => pathname.startsWith(c.href))
        if (childActive) {
          setOpenSections(prev => prev.includes(item.href) ? prev : [...prev, item.href])
        }
      }
    })
    // Close mobile drawer on navigation
    onMobileClose?.()
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — fixed overlay on mobile, flex child on desktop */}
      <div className={cn(
        "flex flex-col bg-card border-r transition-all duration-300 ease-in-out z-50",
        // Mobile: fixed full-height panel sliding in from left
        "fixed inset-y-0 left-0",
        mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
        // Desktop: back to normal flex layout, no transform
        "md:relative md:translate-x-0 md:shadow-none",
        // Width: always wide on mobile, collapsible on desktop
        isCollapsed ? "w-72 md:w-16" : "w-72 md:w-64",
      )}>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b min-h-[65px]">
          {/* Show name when expanded OR always on mobile */}
          <div className={cn(
            "min-w-0 flex-1 mr-2",
            isCollapsed && "md:hidden"
          )}>
            <h2 className="text-sm font-bold text-foreground truncate leading-tight">
              {(session as any)?.user?.empresaNombre || "Sistema"}
            </h2>
            <p className="text-xs text-muted-foreground truncate">
              {session?.user?.name}
            </p>
          </div>

          {/* Mobile: close button | Desktop: collapse toggle */}
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
            aria-label={isCollapsed ? "Expandir menú" : "Colapsar menú"}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navigation.map((item) => {
            const isParentActive = pathname === item.href ||
              (item.children
                ? item.children.some(c => pathname.startsWith(c.href))
                : pathname.startsWith(item.href + "/"))
            const isOpen = openSections.includes(item.href)
            const hasChildren = !!item.children?.length
            // On mobile always show labels; on desktop respect collapse
            const showLabel = !isCollapsed

            return (
              <div key={item.href}>
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() => toggleSection(item.href)}
                    className={cn(
                      "w-full flex items-center gap-2 rounded-md px-2 py-2.5 md:py-2 text-sm font-medium transition-colors text-left",
                      isParentActive
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      !showLabel && "md:justify-center md:px-2"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className={cn("flex-1 truncate", !showLabel && "md:hidden")}>{item.name}</span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 transition-transform text-muted-foreground/60",
                        isOpen && "rotate-180",
                        !showLabel && "md:hidden"
                      )}
                    />
                  </button>
                ) : (
                  <Link href={item.href}>
                    <div className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-2.5 md:py-2 text-sm font-medium transition-colors cursor-pointer",
                      isParentActive
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      !showLabel && "md:justify-center md:px-2"
                    )}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className={cn("truncate", !showLabel && "md:hidden")}>{item.name}</span>
                    </div>
                  </Link>
                )}

                {/* Sub-items — always visible on mobile when open */}
                {hasChildren && isOpen && (showLabel || true) && (
                  <div className={cn(
                    "ml-3 mt-0.5 mb-1 border-l border-border/60 pl-3 space-y-0.5",
                    !showLabel && "md:hidden"
                  )}>
                    {item.children!.map(child => {
                      const isChildActive = pathname === child.href || pathname.startsWith(child.href + "/")
                      return (
                        <Link key={child.href} href={child.href}>
                          <div className={cn(
                            "flex items-center gap-2 rounded-md px-2 py-2 md:py-1.5 text-sm transition-colors cursor-pointer",
                            isChildActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}>
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
              "w-full flex items-center gap-2 rounded-md px-2 py-2.5 md:py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors",
              !isCollapsed ? "" : "md:justify-center"
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
