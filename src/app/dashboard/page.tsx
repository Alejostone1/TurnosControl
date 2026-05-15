"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  Calendar, 
  Calculator, 
  FileText, 
  Clock, 
  Activity,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Zap
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
  trend?: {
    value: number
    isUp: boolean
  }
}

interface ActivityItem {
  id: string
  type: 'payroll' | 'employee' | 'schedule' | 'calculation'
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

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Obtener estadísticas reales
      const [empleadosRes, periodosRes, turnosRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/payroll/periods'),
        fetch('/api/schedules')
      ])

      const empleados = await empleadosRes.json()
      const periodos = await periodosRes.json()
      const turnos = await turnosRes.json()

      // Calcular estadísticas del mes actual
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      
      const empleadosActivos = empleados.filter((emp: any) => emp.estaActivo).length
      const turnosDelMes = turnos.filter((turno: any) => {
        const turnoDate = new Date(turno.fechaTurno)
        return turnoDate.getMonth() === currentMonth && turnoDate.getFullYear() === currentYear
      }).length
      
      const periodosCerrados = periodos.filter((p: any) => 
        ['CALCULADO', 'APROBADO', 'CERRADO'].includes(p.estadoPeriodo)
      ).length

      // Estadísticas calculadas
      const calculatedStats: StatCard[] = [
        {
          title: "Empleados Activos",
          value: empleadosActivos,
          description: "Total de empleados registrados",
          icon: Users,
          color: "text-blue-600",
          bgColor: "bg-blue-100",
          trend: {
            value: 12,
            isUp: true
          }
        },
        {
          title: "Turnos del Mes",
          value: turnosDelMes,
          description: "Turnos programados este mes",
          icon: Calendar,
          color: "text-green-600",
          bgColor: "bg-green-100",
          trend: {
            value: 8,
            isUp: true
          }
        },
        {
          title: "Horas Programadas",
          value: Math.round(turnosDelMes * 8),
          description: "Horas acumuladas este mes",
          icon: Clock,
          color: "text-purple-600",
          bgColor: "bg-purple-100",
          trend: {
            value: 15,
            isUp: true
          }
        },
        {
          title: "Períodos Procesados",
          value: periodosCerrados,
          description: "Períodos de nómina completados",
          icon: Calculator,
          color: "text-orange-600",
          bgColor: "bg-orange-100",
          trend: {
            value: 5,
            isUp: false
          }
        },
      ]

      setStats(calculatedStats)

      // Actividad reciente (simulada por ahora)
      const activity: ActivityItem[] = [
        {
          id: '1',
          type: 'payroll',
          title: 'Período de nómina calculado',
          description: '12 empleados procesados',
          time: 'Hace 2 horas',
          color: 'bg-green-500',
          icon: Calculator
        },
        {
          id: '2',
          type: 'employee',
          title: 'Nuevo empleado registrado',
          description: 'María Rodríguez',
          time: 'Hace 5 horas',
          color: 'bg-blue-500',
          icon: Users
        },
        {
          id: '3',
          type: 'schedule',
          title: 'Turnos actualizados',
          description: '48 turnos modificados',
          time: 'Ayer',
          color: 'bg-purple-500',
          icon: Calendar
        },
        {
          id: '4',
          type: 'calculation',
          title: 'Cálculo automático completado',
          description: 'Proceso nocturno exitoso',
          time: 'Hace 2 días',
          color: 'bg-orange-500',
          icon: Activity
        }
      ]

      setRecentActivity(activity)

    } catch (error) {
      console.error("Error al cargar datos del dashboard:", error)
      toast.error("Error al cargar datos del dashboard")
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    {
      title: "Programar Turnos",
      description: "Asignar turnos a los empleados",
      icon: Calendar,
      href: "/dashboard/schedules",
      color: "bg-blue-500 hover:bg-blue-600",
      badge: "Popular"
    },
    {
      title: "Calcular Nómina",
      description: "Procesar período de nómina",
      icon: Calculator,
      href: "/dashboard/payroll",
      color: "bg-green-500 hover:bg-green-600",
      badge: "Nuevo"
    },
    {
      title: "Gestionar Empleados",
      description: "Agregar o editar empleados",
      icon: Users,
      href: "/dashboard/employees",
      color: "bg-purple-500 hover:bg-purple-600"
    },
    {
      title: "Ver Reportes",
      description: "Exportar informes y análisis",
      icon: FileText,
      href: "/dashboard/reports",
      color: "bg-orange-500 hover:bg-orange-600"
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      {/* Header Section - Simple sin gradiente */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
              Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              {(session as any)?.user?.empresaNombre || 'Sistema'} de Gestión de Turnos y Nómina
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Bienvenido</p>
            <p className="text-gray-800 dark:text-white font-medium">{session?.user?.name}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={stat.title} className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 dark:bg-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div className="space-y-1">
                <CardTitle className="text-sm font-semibold text-gray-800 dark:text-white">
                  {stat.title}
                </CardTitle>
                {stat.trend && (
                  <div className="flex items-center gap-1">
                    {stat.trend.isUp ? (
                      <ArrowUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <ArrowDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className={`text-xs font-medium ${stat.trend.isUp ? 'text-green-500' : 'text-red-500'}`}>
                      {stat.trend.isUp ? '+' : ''}{stat.trend.value}%
                    </span>
                  </div>
                )}
              </div>
              <div className={`p-3 rounded-xl ${stat.bgColor} shadow-md`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions & Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-lg h-full dark:bg-gray-800">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Zap className="h-6 w-6 text-yellow-500" />
                Acciones Rápidas
              </CardTitle>
              <CardDescription className="text-base">
                Accesos directos a las funciones más importantes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {quickActions.map((action) => (
                  <Link key={action.href} href={action.href}>
                    <div className="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-600 p-4 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md transition-all duration-300">
                      {action.badge && (
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary" className="text-xs">
                            {action.badge}
                          </Badge>
                        </div>
                      )}
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${action.color} text-white shadow-md group-hover:scale-110 transition-transform duration-300`}>
                          <action.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {action.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {action.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div>
          <Card className="border-0 shadow-lg h-full dark:bg-gray-800">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Activity className="h-6 w-6 text-blue-500" />
                Actividad Reciente
              </CardTitle>
              <CardDescription className="text-base">
                Últimas acciones en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                    <div className={`p-2 rounded-full ${activity.color} text-white mt-1`}>
                      <activity.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 dark:text-white text-sm truncate">
                        {activity.title}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
                
                <div className="text-center pt-4">
                  <Button variant="outline" size="sm" className="w-full">
                    <MoreHorizontal className="h-4 w-4 mr-2" />
                    Ver toda la actividad
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
