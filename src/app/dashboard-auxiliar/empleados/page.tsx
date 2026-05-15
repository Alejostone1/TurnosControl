"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Plus, Search, Edit, Trash2, Eye, Filter,
  Building2, Users, ChevronLeft, ChevronRight, LayoutList, LayoutGrid,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface Empleado {
  id: string
  tipoDocumento: string
  numeroDocumento: string
  nombres: string
  apellidos: string
  centroCosto: string | null
  programa: string | null
  modalidad: string | null
  cargo: string | null
  fechaIngreso: string
  tipoVinculacion: string
  salarioBase: number
  tieneAuxilioTransporte: boolean
  tipoContrato: string
  horasSemanales: number
  estaActivo: boolean
  creadoEn: string
}

const PAGE_SIZE = 8
const BASE = "/dashboard-auxiliar/empleados"

function formatCurrency(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)
}

function EmpleadoCard({ empleado, onDelete }: { empleado: Empleado; onDelete: (id: string, nombre: string) => void }) {
  return (
    <Card className="group border border-gray-200 bg-white transition-all duration-150 shadow-[0_4px_0_0_#e2e8f0,0_6px_12px_-2px_rgba(0,0,0,0.07)] hover:shadow-[0_2px_0_0_#e2e8f0,0_3px_6px_-2px_rgba(0,0,0,0.07)] hover:translate-y-[2px]">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-tight truncate">{empleado.nombres} {empleado.apellidos}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{empleado.cargo || "Sin cargo asignado"}</p>
          </div>
          <Badge variant={empleado.estaActivo ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 shrink-0">
            {empleado.estaActivo ? "Activo" : "Inactivo"}
          </Badge>
        </div>
        <div className="space-y-1.5 text-xs mb-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Documento</span>
            <span className="font-medium">{empleado.numeroDocumento}</span>
          </div>
          {empleado.centroCosto && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">C. Costo</span>
              <span className="font-medium truncate max-w-[120px]">{empleado.centroCosto}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Salario</span>
            <span className="font-semibold text-emerald-700">{formatCurrency(empleado.salarioBase)}</span>
          </div>
        </div>
        <div className="flex gap-1.5 pt-2 border-t border-gray-100">
          <Link href={`${BASE}/${empleado.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full h-7 text-xs">
              <Eye className="h-3.5 w-3.5 mr-1" /> Ver
            </Button>
          </Link>
          <Link href={`${BASE}/${empleado.id}/edit`}>
            <Button variant="outline" size="sm" className="h-7 px-2">
              <Edit className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Button
            variant="outline" size="sm"
            className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => onDelete(empleado.id, `${empleado.nombres} ${empleado.apellidos}`)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AuxiliarEmpleadosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState("")
  const [filterEstado, setFilterEstado]   = useState("all")
  const [filterContrato, setFilterContrato] = useState("all")
  const [view, setView]           = useState<"grid" | "list">("grid")
  const [page, setPage]           = useState(1)

  useEffect(() => { fetchEmpleados() }, [])

  const fetchEmpleados = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/employees?soloMios=true")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setEmpleados(Array.isArray(data) ? data : data.empleados ?? [])
    } catch { toast.error("Error al cargar empleados") }
    finally { setLoading(false) }
  }

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar a ${nombre}? La acción puede revertirse.`)) return
    try {
      const res = await fetch(`/api/employees/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Empleado eliminado")
        setEmpleados(prev => prev.filter(e => e.id !== id))
      } else {
        const e = await res.json()
        toast.error(e.error || "Error al eliminar")
      }
    } catch { toast.error("Error de conexión") }
  }

  const filtered = useMemo(() => {
    let list = empleados
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        e.nombres.toLowerCase().includes(q) ||
        e.apellidos.toLowerCase().includes(q) ||
        e.numeroDocumento.includes(q) ||
        (e.cargo || "").toLowerCase().includes(q)
      )
    }
    if (filterEstado !== "all") list = list.filter(e => String(e.estaActivo) === filterEstado)
    if (filterContrato !== "all") list = list.filter(e => e.tipoContrato === filterContrato)
    return list
  }, [empleados, search, filterEstado, filterContrato])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const activos    = empleados.filter(e => e.estaActivo).length
  const contratos  = Array.from(new Set(empleados.map(e => e.tipoContrato).filter(Boolean)))

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted rounded" />)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-40 bg-muted rounded" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Empleados</h1>
          <p className="text-sm text-muted-foreground">{empleados.length} empleados registrados · {activos} activos</p>
        </div>
        <Link href={`${BASE}/new`}>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="mr-2 h-4 w-4" />Nuevo Empleado
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: empleados.length, icon: Users, color: "text-blue-600 bg-blue-50" },
          { label: "Activos", value: activos, icon: Users, color: "text-emerald-600 bg-emerald-50" },
          { label: "Inactivos", value: empleados.length - activos, icon: Users, color: "text-gray-600 bg-gray-50" },
          { label: "Filtrados", value: filtered.length, icon: Filter, color: "text-purple-600 bg-purple-50" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-md ${s.color}`}>
                  <s.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold">{s.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Buscar por nombre, documento o cargo..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <Select value={filterEstado} onValueChange={v => { setFilterEstado(v); setPage(1) }}>
          <SelectTrigger className="h-8 text-sm w-32"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="true">Activo</SelectItem>
            <SelectItem value="false">Inactivo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterContrato} onValueChange={v => { setFilterContrato(v); setPage(1) }}>
          <SelectTrigger className="h-8 text-sm w-40"><SelectValue placeholder="Contrato" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los contratos</SelectItem>
            {contratos.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Button variant={view === "grid" ? "default" : "outline"} size="sm" className="h-8 w-8 p-0" onClick={() => setView("grid")}>
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
          <Button variant={view === "list" ? "default" : "outline"} size="sm" className="h-8 w-8 p-0" onClick={() => setView("list")}>
            <LayoutList className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">Sin empleados</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            {search ? "Cambia los filtros de búsqueda" : "Comienza registrando un empleado"}
          </p>
          {!search && (
            <Link href={`${BASE}/new`}>
              <Button size="sm" className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                <Plus className="mr-2 h-4 w-4" />Nuevo Empleado
              </Button>
            </Link>
          )}
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {paginated.map(e => (
            <EmpleadoCard key={e.id} empleado={e} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead>
                <tr className="bg-muted/50">
                  {["Empleado", "Documento", "Cargo", "Salario", "Estado", "Acciones"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {paginated.map(e => (
                  <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">{e.nombres} {e.apellidos}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{e.numeroDocumento}</td>
                    <td className="px-4 py-3 text-sm">{e.cargo || "—"}</td>
                    <td className="px-4 py-3 text-sm font-medium text-emerald-700">{formatCurrency(e.salarioBase)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={e.estaActivo ? "default" : "secondary"} className="text-[10px]">
                        {e.estaActivo ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Link href={`${BASE}/${e.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Eye className="h-3.5 w-3.5" /></Button>
                        </Link>
                        <Link href={`${BASE}/${e.id}/edit`}>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Edit className="h-3.5 w-3.5" /></Button>
                        </Link>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600"
                          onClick={() => handleDelete(e.id, `${e.nombres} ${e.apellidos}`)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {page} de {totalPages} · {filtered.length} empleados
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              Siguiente <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
