"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, CheckCircle2, XCircle, MessageSquare } from "lucide-react"
import { toast } from "sonner"

export default function ProgramacionesVisualizadorPage() {
  const [turnos, setTurnos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [observacion, setObservacion] = useState("")

  useEffect(() => {
    fetch("/api/schedules?estado=PENDIENTE,PROGRAMADO,EN_REVISION")
      .then(r => r.json())
      .then(data => setTurnos(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Error al cargar programaciones"))
      .finally(() => setLoading(false))
  }, [])

  const actualizarEstado = async (turnoId: string, estado: string) => {
    try {
      const res = await fetch(`/api/schedules/${turnoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado, observacionRevision: observacion }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Turno ${estado === "APROBADO" ? "aprobado" : "rechazado"} exitosamente`)
      setTurnos(prev => prev.map(t => t.id === turnoId ? { ...t, estado } : t))
      setObservacion("")
    } catch {
      toast.error("Error al actualizar estado")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-xl font-bold">Revisión de Programaciones</h1>
          <p className="text-sm text-muted-foreground">Revisa y aprueba las programaciones de turnos</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Turnos Programados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : turnos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No hay programaciones para revisar</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Empleado</th>
                    <th className="pb-2 font-medium">Fecha</th>
                    <th className="pb-2 font-medium">Turno</th>
                    <th className="pb-2 font-medium">Estado</th>
                    <th className="pb-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {turnos.map((t: any) => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="py-2">{t.empleado?.nombres} {t.empleado?.apellidos}</td>
                      <td className="py-2">{new Date(t.fechaTurno).toLocaleDateString("es-CO")}</td>
                      <td className="py-2">{t.concepto?.nombre || t.conceptoId}</td>
                      <td className="py-2">
                        <Badge variant={t.estado === "APROBADO" ? "default" : t.estado === "RECHAZADO" ? "destructive" : "secondary"}>
                          {t.estado || "PENDIENTE"}
                        </Badge>
                      </td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => actualizarEstado(t.id, "APROBADO")}>
                            <CheckCircle2 className="h-4 w-4 mr-1 text-green-600" /> Aprobar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => actualizarEstado(t.id, "RECHAZADO")}>
                            <XCircle className="h-4 w-4 mr-1 text-red-600" /> Rechazar
                          </Button>
                        </div>
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
