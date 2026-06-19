"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, XCircle, MessageSquare, RefreshCw } from "lucide-react"
import { toast } from "sonner"

export default function AprobacionesVisualizadorPage() {
  const [turnos, setTurnos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [observaciones, setObservaciones] = useState<Record<string, string>>({})

  const cargarTurnos = () => {
    setLoading(true)
    fetch("/api/schedules?estado=LIQUIDADO,EN_REVISION,PENDIENTE,PROGRAMADO")
      .then(r => r.json())
      .then(data => setTurnos(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Error al cargar turnos"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargarTurnos() }, [])

  const aprobarTurno = async (turnoId: string) => {
    try {
      const res = await fetch(`/api/schedules/${turnoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado: "APROBADO",
          observacionRevision: observaciones[turnoId] || null,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success("Turno aprobado exitosamente")
      setTurnos(prev => prev.map(t => t.id === turnoId ? { ...t, estado: "APROBADO" } : t))
      setObservaciones(prev => { const n = { ...prev }; delete n[turnoId]; return n })
    } catch {
      toast.error("Error al aprobar turno")
    }
  }

  const rechazarTurno = async (turnoId: string) => {
    if (!observaciones[turnoId]) {
      toast.error("Debes agregar una observación para rechazar")
      return
    }
    try {
      const res = await fetch(`/api/schedules/${turnoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado: "RECHAZADO",
          observacionRevision: observaciones[turnoId],
        }),
      })
      if (!res.ok) throw new Error()
      toast.success("Turno rechazado")
      setTurnos(prev => prev.map(t => t.id === turnoId ? { ...t, estado: "RECHAZADO" } : t))
      setObservaciones(prev => { const n = { ...prev }; delete n[turnoId]; return n })
    } catch {
      toast.error("Error al rechazar turno")
    }
  }

  const pendientes = turnos.filter(t => t.estado !== "APROBADO" && t.estado !== "RECHAZADO")
  const aprobados = turnos.filter(t => t.estado === "APROBADO" || t.estado === "RECHAZADO")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          <div>
            <h1 className="text-xl font-bold">Aprobaciones</h1>
            <p className="text-sm text-muted-foreground">Aprueba o rechaza turnos y liquidaciones</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={cargarTurnos}>
          <RefreshCw className="h-4 w-4 mr-1" /> Actualizar
        </Button>
      </div>

      {/* Pendientes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pendientes de Aprobación ({pendientes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : pendientes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No hay elementos pendientes de aprobación</div>
          ) : (
            <div className="space-y-4">
              {pendientes.map(t => (
                <div key={t.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{t.empleado?.nombres} {t.empleado?.apellidos}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(t.fechaTurno).toLocaleDateString("es-CO")} — {t.concepto?.nombre || t.conceptoId}
                      </p>
                    </div>
                    <Badge variant="secondary">{t.estado || "PENDIENTE"}</Badge>
                  </div>

                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground mt-2 shrink-0" />
                    <Textarea
                      placeholder="Agrega una observación (requerida para rechazar)..."
                      value={observaciones[t.id] || ""}
                      onChange={e => setObservaciones(prev => ({ ...prev, [t.id]: e.target.value }))}
                      className="min-h-[60px] text-sm"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => aprobarTurno(t.id)}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Aprobar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => rechazarTurno(t.id)}>
                      <XCircle className="h-4 w-4 mr-1" /> Rechazar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historial */}
      {aprobados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial de Aprobaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Empleado</th>
                    <th className="pb-2 font-medium">Fecha</th>
                    <th className="pb-2 font-medium">Estado</th>
                    <th className="pb-2 font-medium">Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {aprobados.map(t => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="py-2">{t.empleado?.nombres} {t.empleado?.apellidos}</td>
                      <td className="py-2">{new Date(t.fechaTurno).toLocaleDateString("es-CO")}</td>
                      <td className="py-2">
                        <Badge variant={t.estado === "APROBADO" ? "default" : "destructive"}>
                          {t.estado}
                        </Badge>
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">{t.observacionRevision || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
