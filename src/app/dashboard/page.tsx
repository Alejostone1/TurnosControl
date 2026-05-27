"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Users,
  Calendar,
  Calculator,
  FileText,
  Clock,
  Activity,
  ArrowUp,
  ArrowDown,
  Zap,
  MoreHorizontal,
} from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

interface StatCard {
  title: string
  value: string | number
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  trend?: { value: number; isUp: boolean }
}

interface ActivityItem {
  id: string
  type: "payroll" | "employee" | "schedule" | "calculation"
  title: string
  description: string
  time: string
  color: string
  icon: React.ComponentType<{ className?: string }>
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<StatCard[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchDashboardData() }, [])

  const fetchDashboardData = async () => {
    try {
      const [empleadosRes, periodosRes, turnosRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/payroll/periods"),
        fetch("/api/schedules"),
      ])

      const empleados = await empleadosRes.json()
      const periodos  = await periodosRes.json()
      const turnos    = await turnosRes.json()

      const currentMonth = new Date().getMonth()
      const currentYear  = new Date().getFullYear()

      const empleadosActivos = empleados.filter((emp: any) => emp.estaActivo).length
      const turnosDelMes     = turnos.filter((turno: any) => {
        const d = new Date(turno.fechaTurno)
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear
      }).length
      const periodosCerrados = periodos.filter((p: any) =>
        ["CALCULADO", "APROBADO", "CERRADO"].includes(p.estadoPeriodo)
      ).length

      setStats([
        {
          title: "Empleados Activos",
          value: empleadosActivos,
          description: "Total registrados",
          icon: Users,
          color: "text-blue-600",
          bgColor: "bg-blue-100",
          trend: { value: 12, isUp: true },
        },
        {
          title: "Turnos del Mes",
          value: turnosDelMes,
          description: "Programados este mes",
          icon: Calendar,
          color: "text-green-600",
          bgColor: "bg-green-100",
          trend: { value: 8, isUp: true },
        },
        {
          title: "Horas Programadas",
          value: Math.round(turnosDelMes * 8),
          description: "Horas acumuladas",
          icon: Clock,
          color: "text-purple-600",
          bgColor: "bg-purple-100",
          trend: { value: 15, isUp: true },
        },
        {
          title: "Períodos Procesados",
          value: periodosCerrados,
          description: "Períodos completados",
          icon: Calculator,
          color: "text-orange-600",
          bgColor: "bg-orange-100",
          trend: { value: 5, isUp: false },
        },
      ])

      setRecentActivity([
        { id: "1", type: "payroll",      title: "Período de nómina calculado",    description: "12 empleados procesados",  time: "Hace 2h",    color: "bg-green-500",  icon: Calculator },
        { id: "2", type: "employee",     title: "Nuevo empleado registrado",      description: "María Rodríguez",          time: "Hace 5h",    color: "bg-blue-500",   icon: Users },
        { id: "3", type: "schedule",     title: "Turnos actualizados",            description: "48 turnos modificados",    time: "Ayer",       color: "bg-purple-500", icon: Calendar },
        { id: "4", type: "calculation",  title: "Cálculo automático completado",  description: "Proceso nocturno exitoso", time: "Hace 2 días", color: "bg-orange-500", icon: Activity },
      ])
    } catch {
      toast.error("Error al cargar datos del dashboard")
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    { title: "Programar Turnos",    description: "Asignar turnos a empleados",   icon: Calendar,   href: "/dashboard/schedules",  color: "bg-blue-500 hover:bg-blue-600" },
    { title: "Calcular Nómina",     description: "Procesar período de nómina",   icon: Calculator, href: "/dashboard/payroll",     color: "bg-green-500 hover:bg-green-600" },
    { title: "Gestionar Empleados", description: "Agregar o editar empleados",   icon: Users,      href: "/dashboard/employees",   color: "bg-purple-500 hover:bg-purple-600" },
    { title: "Ver Reportes",        description: "Exportar informes y análisis", icon: FileText,   href: "/dashboard/reports",     color: "bg-orange-500 hover:bg-orange-600" },
  ]

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-12 bg-muted rounded-xl w-2/3" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-muted rounded-xl" />)}
        </div>
      </div>
    )
  }

  const firstName = session?.user?.name?.split(" ")[0] ?? ""

  return (
    <div className="space-y-4 md:space-y-6">

      {/* ── Greeting header ── */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
            {firstName ? `Bienvenido, ${firstName}` : "Dashboard"}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            {(session as any)?.user?.empresaNombre
              ? `${(session as any).user.empresaNombre} — Turnos y Nómina`
              : "Sistema de Turnos y Nómina"}
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground shrink-0 mt-1 text-right capitalize">
          {new Date().toLocaleDateString("es-CO", {
            weekday: "short", day: "numeric", month: "short", year: "numeric",
          })}
        </p>
      </div>

      {/* ── KPI Cards — 2×2 on mobile, 4×1 on lg ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(stat => (
          <Card key={stat.title} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className={`p-1.5 md:p-2 rounded-lg ${stat.bgColor} shrink-0`}>
                  <stat.icon className={`h-3.5 w-3.5 md:h-4 md:w-4 ${stat.color}`} />
                </div>
                {stat.trend && (
                  <div className="flex items-center gap-0.5">
                    {stat.trend.isUp
                      ? <ArrowUp className="h-2.5 w-2.5 text-green-500" />
                      : <ArrowDown className="h-2.5 w-2.5 text-red-500" />
                    }
                    <span className={`text-[10px] font-medium ${stat.trend.isUp ? "text-green-500" : "text-red-500"}`}>
                      {stat.trend.value}%
                    </span>
                  </div>
                )}
              </div>
              <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
              </p>
              <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5 leading-tight">
                {stat.title}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Quick Actions + Recent Activity ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Quick Actions — 2/3 on lg */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white">Acciones Rápidas</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(action => (
              <Link key={action.href} href={action.href}>
                <div className="group rounded-xl border p-3 md:p-4 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-sm transition-all active:scale-[0.98] cursor-pointer h-full">
                  <div className={`w-9 h-9 rounded-xl ${action.color} flex items-center justify-center mb-2.5 transition-opacity`}>
                    <action.icon className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white leading-tight">
                    {action.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight line-clamp-2">
                    {action.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity — 1/3 on lg */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white">Actividad Reciente</h2>
          </div>
          <div className="rounded-xl border divide-y overflow-hidden">
            {recentActivity.map(item => (
              <div key={item.id} className="flex items-start gap-2.5 p-3 hover:bg-muted/30 transition-colors">
                <div className={`w-7 h-7 rounded-full ${item.color} flex items-center justify-center shrink-0 mt-0.5`}>
                  <item.icon className="h-3 w-3 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-gray-800 dark:text-white truncate leading-tight">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {item.description} · {item.time}
                  </p>
                </div>
              </div>
            ))}
            <div className="p-2">
              <Button variant="ghost" size="sm" className="w-full text-xs h-8 text-muted-foreground">
                <MoreHorizontal className="h-3.5 w-3.5 mr-1.5" />
                Ver toda la actividad
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
