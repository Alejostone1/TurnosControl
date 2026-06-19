"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus, Eye, UserCog, Users } from "lucide-react"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Supervision {
  id: string
  visualizadorId: string
  asignadoId: string
  tipoAsignado: string
  visualizador: { id: string; nombres: string; apellidos: string; correo: string }
  asignado: { id: string; nombres: string; apellidos: string; correo: string; rol?: string } | null
}

export default function SupervisionAdminPage() {
  const [supervisiones, setSupervisiones] = useState<Supervision[]>([])
  const [loading, setLoading] = useState(true)
  const [visualizadores, setVisualizadores] = useState<any[]>([])
  const [liquidadores, setLiquidadores] = useState<any[]>([])
  const [auxiliares, setAuxiliares] = useState<any[]>([])

  const [selectedVisor, setSelectedVisor] = useState("")
  const [selectedAsignado, setSelectedAsignado] = useState("")
  const [selectedTipo, setSelectedTipo] = useState("LIQUIDADOR")

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const [supRes, loadRes] = await Promise.all([
        fetch("/api/supervision"),
        fetch("/api/supervision?loadUsers=true"),
      ])
      const sup = await supRes.json()
      const users = await loadRes.json()

      if (Array.isArray(sup)) {
        setSupervisiones(sup)
      }

      if (users.visualizadores) {
        setVisualizadores(users.visualizadores)
      }
      if (users.liquidadores) {
        setLiquidadores(users.liquidadores)
      }
      if (users.auxiliares) {
        setAuxiliares(users.auxiliares)
      }
    } catch {
      toast.error("Error al cargar datos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargarDatos() }, [])

  const agregarSupervision = async () => {
    if (!selectedVisor || !selectedAsignado) {
      toast.error("Selecciona un visualizador y un liquidador/auxiliar")
      return
    }
    try {
      const res = await fetch("/api/supervision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visualizadorId: selectedVisor,
          asignadoId: selectedAsignado,
          tipoAsignado: selectedTipo,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al crear")
      }
      toast.success("Asignación creada exitosamente")
      setSelectedVisor("")
      setSelectedAsignado("")
      cargarDatos()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const eliminarSupervision = async (id: string) => {
    try {
      const res = await fetch(`/api/supervision/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Asignación eliminada")
      setSupervisiones(prev => prev.filter(s => s.id !== id))
    } catch {
      toast.error("Error al eliminar")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Eye className="h-6 w-6 text-purple-600" />
        <div>
          <h1 className="text-xl font-bold">Asignación de Supervisión</h1>
          <p className="text-sm text-muted-foreground">Asigna liquidadores y auxiliares a visualizadores para filtrado de datos</p>
        </div>
      </div>

      {/* Nueva asignación */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4 text-green-600" />
            Nueva Asignación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Visualizador</label>
              <Select value={selectedVisor} onValueChange={setSelectedVisor}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {visualizadores.map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>{v.nombres} {v.apellidos}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <Select value={selectedTipo} onValueChange={setSelectedTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LIQUIDADOR">Liquidador</SelectItem>
                  <SelectItem value="AUXILIAR">Auxiliar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {selectedTipo === "LIQUIDADOR" ? "Liquidador" : "Auxiliar"}
              </label>
              <Select value={selectedAsignado} onValueChange={setSelectedAsignado}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {selectedTipo === "LIQUIDADOR"
                    ? liquidadores.map((l: any) => (
                        <SelectItem key={l.id} value={l.id}>{l.nombres} {l.apellidos}</SelectItem>
                      ))
                    : auxiliares.map((a: any) => (
                        <SelectItem key={a.id} value={a.id}>{a.nombres} {a.apellidos}</SelectItem>
                      ))
                  }
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={agregarSupervision} className="w-full">
                <Plus className="h-4 w-4 mr-1" /> Asignar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de asignaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Asignaciones Actuales ({supervisiones.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : supervisiones.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No hay asignaciones configuradas</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Visualizador</th>
                    <th className="pb-2 font-medium">Asignado</th>
                    <th className="pb-2 font-medium">Tipo</th>
                    <th className="pb-2 font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {supervisiones.map(s => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-2">{s.visualizador?.nombres} {s.visualizador?.apellidos}</td>
                      <td className="py-2">{s.asignado?.nombres} {s.asignado?.apellidos}</td>
                      <td className="py-2">
                        <Badge variant={s.tipoAsignado === "LIQUIDADOR" ? "default" : "secondary"}>
                          {s.tipoAsignado}
                        </Badge>
                      </td>
                      <td className="py-2">
                        <Button variant="ghost" size="sm" onClick={() => eliminarSupervision(s.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
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
