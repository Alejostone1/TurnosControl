"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Calendar, CalendarRange, ArrowRight, UserCog, Clock } from "lucide-react"
import { toast } from "sonner"

interface Stats {
  totalEmpleados: number
  empleadosActivos: number
  empleadosCreados: number
}

export default function DashboardAuxiliarPage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/employees?page=1&limit=1")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setStats({
            totalEmpleados:   data.total ?? 0,
            empleadosActivos: data.activos ?? 0,
            empleadosCreados: data.total ?? 0,
          })
        }
      })
      .catch(() => toast.error("Error al cargar estadísticas"))
      .finally(() => setLoading(false))
  }, [])

  const user = session?.user as any
  const hora = new Date().getHours()
  const saludo = hora < 12 ? "Buenos días" : hora < 18 ? "Buenas tardes" : "Buenas noches"

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
          <UserCog className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {saludo}, {user?.name?.split(" ")[0] ?? "Auxiliar"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Portal Auxiliar · {user?.empresaNombre}
          </p>
        </div>
        <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200">
          Auxiliar activo
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Empleados</p>
                <p className="text-2xl font-bold">{loading ? "—" : (stats?.totalEmpleados ?? 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Empleados Activos</p>
                <p className="text-2xl font-bold">{loading ? "—" : (stats?.empleadosActivos ?? 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fecha de Hoy</p>
                <p className="text-sm font-bold">
                  {new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "short" })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick access */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Acceso Rápido</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                Empleados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">Gestiona el registro de empleados de la empresa.</p>
              <div className="flex gap-2 pt-1">
                <Link href="/dashboard-auxiliar/empleados">
                  <Button variant="outline" size="sm">Ver lista <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button>
                </Link>
                <Link href="/dashboard-auxiliar/empleados/new">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">Nuevo</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-600" />
                Programación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">Programa los turnos y horarios de los empleados.</p>
              <Link href="/dashboard-auxiliar/programacion">
                <Button variant="outline" size="sm" className="mt-1">
                  Ir a Programación <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarRange className="h-4 w-4 text-purple-600" />
                Períodos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">Consulta los períodos de nómina activos.</p>
              <Link href="/dashboard-auxiliar/periodos">
                <Button variant="outline" size="sm" className="mt-1">
                  Ver Períodos <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
