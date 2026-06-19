"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calculator, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"

export default function LiquidacionesVisualizadorPage() {
  const [turnos, setTurnos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/schedules?estado=LIQUIDADO,EN_REVISION")
      .then(r => r.json())
      .then(data => setTurnos(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Error al cargar liquidaciones"))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Calculator className="h-6 w-6 text-emerald-600" />
        <div>
          <h1 className="text-xl font-bold">Revisión de Liquidaciones</h1>
          <p className="text-sm text-muted-foreground">Revisa las liquidaciones realizadas por el liquidador</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Turnos Liquidados Pendientes de Revisión</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : turnos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No hay liquidaciones pendientes de revisión</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Empleado</th>
                    <th className="pb-2 font-medium">Fecha</th>
                    <th className="pb-2 font-medium">Turno</th>
                    <th className="pb-2 font-medium">Estado</th>
                    <th className="pb-2 font-medium">Ir a Aprobación</th>
                  </tr>
                </thead>
                <tbody>
                  {turnos.map((t: any) => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="py-2">{t.empleado?.nombres} {t.empleado?.apellidos}</td>
                      <td className="py-2">{new Date(t.fechaTurno).toLocaleDateString("es-CO")}</td>
                      <td className="py-2">{t.concepto?.nombre || t.conceptoId}</td>
                      <td className="py-2">
                        <Badge variant="secondary">{t.estado || "LIQUIDADO"}</Badge>
                      </td>
                      <td className="py-2">
                        <Button size="sm" variant="outline" onClick={() => window.location.href = "/dashboard/visualizador/aprobaciones"}>
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Revisar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
