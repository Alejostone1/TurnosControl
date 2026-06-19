"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Calculator, Users, FileText, ArrowRight, CheckCircle2, Building2, Clock, Activity, XCircle } from "lucide-react"
import { toast } from "sonner"

interface ResumenData {
  turnosPendientes: number
  turnosAprobados: number
  turnosRechazados: number
  liquidacionesPendientes: number
}

export default function VisualizadorDashboardPage() {
  const { data: session } = useSession()
  const [resumen, setResumen] = useState<ResumenData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/schedules?estado=LIQUIDADO,EN_REVISION,APROBADO,RECHAZADO")
      .then(r => r.json().catch(() => []))
      .then(data => {
        const arr = Array.isArray(data) ? data : []
        setResumen({
          turnosPendientes: arr.filter((t: any) => t.estado === "EN_REVISION" || t.estado === "LIQUIDADO").length,
          turnosAprobados: arr.filter((t: any) => t.estado === "APROBADO").length,
          turnosRechazados: arr.filter((t: any) => t.estado === "RECHAZADO").length,
          liquidacionesPendientes: arr.filter((t: any) => t.estado === "LIQUIDADO" || t.estado === "EN_REVISION").length,
        })
      })
      .catch(() => toast.error("Error al cargar datos"))
      .finally(() => setLoading(false))
  }, [])

  const [saludo, setSaludo] = useState("")
  const [clientDate, setClientDate] = useState("")
  useEffect(() => {
    const ahora = new Date()
    const h = ahora.getHours()
    setSaludo(h < 12 ? "Buenos días" : h < 18 ? "Buenas tardes" : "Buenas noches")
    setClientDate(ahora.toLocaleString("es-CO"))
  }, [])

  const user = session?.user as any

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {saludo}, {user?.name?.split(" ")[0] ?? "Visualizador"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Panel de Revisión y Aprobación · {user?.empresaNombre}
          </p>
        </div>
        <Badge className="ml-auto bg-purple-100 text-purple-700 border-purple-200">
          Visualizador
        </Badge>
      </div>

      {/* Resumen cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pendientes de Revisión</p>
                <p className="text-2xl font-bold">{loading ? "—" : resumen?.turnosPendientes ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Aprobados</p>
                <p className="text-2xl font-bold">{loading ? "—" : resumen?.turnosAprobados ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rechazados</p>
                <p className="text-2xl font-bold">{loading ? "—" : resumen?.turnosRechazados ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Liquidaciones Pendientes</p>
                <p className="text-2xl font-bold">{loading ? "—" : resumen?.liquidacionesPendientes ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Acceso rápido */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Acceso Rápido</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <p className="font-semibold">Programaciones</p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Revisa y aprueba las programaciones de turnos.</p>
              <Link href="/dashboard/visualizador/programaciones">
                <Button variant="outline" size="sm" className="w-full">Revisar <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <Calculator className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="font-semibold">Liquidaciones</p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Revisa liquidaciones de turnos realizadas.</p>
              <Link href="/dashboard/visualizador/liquidaciones">
                <Button variant="outline" size="sm" className="w-full">Revisar <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <p className="font-semibold">Aprobaciones</p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Aprueba o rechaza turnos y liquidaciones.</p>
              <Link href="/dashboard/visualizador/aprobaciones">
                <Button variant="outline" size="sm" className="w-full">Aprobar/Rechazar <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>
                <p className="font-semibold">Reportes</p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Reportes de programación y liquidación.</p>
              <Link href="/dashboard/visualizador/reportes">
                <Button variant="outline" size="sm" className="w-full">Ver reportes <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Actividad reciente */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Actividad Reciente</h2>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Última sesión: {clientDate || "..."}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
