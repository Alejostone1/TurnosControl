"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Plus, Calculator, BarChart2, Calendar, ChevronDown, ChevronUp,
  X, Users, Clock, CheckCircle2, AlertCircle, FileEdit, CalendarRange,
  ArrowRight, Trash2,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

const BASE_DASH = "/dashboard-auxiliar"

interface Empleado {
  id: string
  nombres: string
  apellidos: string
  numeroDocumento: string
  centroCosto: string | null
  programa: string | null
  modalidad: string | null
  cargo: string | null
  tipoVinculacion?: string
  salarioBase?: number
}

interface EmpleadoAsignado extends Empleado {
  turnosCount: number
  resultado: Record<string, unknown> | null
}

interface Periodo {
  id: string
  nombrePeriodo: string
  tipoPeriodo: string
  estadoPeriodo: string
  fechaInicio: string
  fechaFin: string
  _count?: { resultados: number }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })
}

function toInputDate(iso: string) {
  return iso.substring(0, 10)
}

function getDefaultDatesForType(tipo: string): { inicio: string; fin: string } {
  const today = new Date()
  const y = today.getFullYear()
  const m = today.getMonth()
  const d = today.getDate()

  if (tipo === "SEMANAL") {
    const dow = today.getDay()
    const diffToMonday = dow === 0 ? -6 : 1 - dow
    const monday = new Date(today)
    monday.setDate(d + diffToMonday)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return {
      inicio: monday.toISOString().substring(0, 10),
      fin: sunday.toISOString().substring(0, 10),
    }
  }

  if (tipo === "QUINCENAL") {
    if (d <= 15) {
      const inicio = new Date(y, m, 1)
      const fin = new Date(y, m, 15)
      return {
        inicio: inicio.toISOString().substring(0, 10),
        fin: fin.toISOString().substring(0, 10),
      }
    } else {
      const inicio = new Date(y, m, 16)
      const fin = new Date(y, m + 1, 0)
      return {
        inicio: inicio.toISOString().substring(0, 10),
        fin: fin.toISOString().substring(0, 10),
      }
    }
  }

  // MENSUAL (default)
  const inicio = new Date(y, m, 1)
  const fin = new Date(y, m + 1, 0)
  return {
    inicio: inicio.toISOString().substring(0, 10),
    fin: fin.toISOString().substring(0, 10),
  }
}

function deriveCriterio(
  centroCosto: string,
  programa: string,
  modalidad: string,
  isManual: boolean
): string {
  if (isManual) return "MANUAL"
  const filtersSet = [centroCosto, programa, modalidad].filter(Boolean)
  if (filtersSet.length === 0) return "TODOS"
  if (filtersSet.length === 1) {
    if (centroCosto) return "CENTRO_COSTO"
    if (programa) return "PROGRAMA"
    if (modalidad) return "MODALIDAD"
  }
  return "FILTROS"
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  BORRADOR: { label: "Borrador", color: "bg-slate-100 text-slate-700 border-slate-200", icon: FileEdit },
  PENDIENTE: { label: "Procesando", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  CALCULADO: { label: "Calculado", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  CERRADO: { label: "Cerrado", color: "bg-blue-100 text-blue-700 border-blue-200", icon: CheckCircle2 },
}
const TIPO_LABEL: Record<string, string> = { SEMANAL: "Semanal", QUINCENAL: "Quincenal", MENSUAL: "Mensual" }

// ─── Employee Filter + Select Panel ───────────────────────────

interface EmployeeFilterPanelProps {
  empleados: Empleado[]
  selectedIds: string[]
  isManual: boolean
  filterCC: string
  filterProg: string
  filterMod: string
  onChangeSelectedIds: (ids: string[]) => void
  onChangeIsManual: (v: boolean) => void
  onChangeFilterCC: (v: string) => void
  onChangeFilterProg: (v: string) => void
  onChangeFilterMod: (v: string) => void
}

function EmployeeFilterPanel({
  empleados,
  selectedIds,
  isManual,
  filterCC,
  filterProg,
  filterMod,
  onChangeSelectedIds,
  onChangeIsManual,
  onChangeFilterCC,
  onChangeFilterProg,
  onChangeFilterMod,
}: EmployeeFilterPanelProps) {
  const centrosCosto = Array.from(new Set(empleados.map(e => e.centroCosto).filter(Boolean) as string[])).sort()
  const programas = Array.from(new Set(empleados.map(e => e.programa).filter(Boolean) as string[])).sort()
  const modalidades = Array.from(new Set(empleados.map(e => e.modalidad).filter(Boolean) as string[])).sort()

  const filtered = empleados.filter(e => {
    if (filterCC && e.centroCosto !== filterCC) return false
    if (filterProg && e.programa !== filterProg) return false
    if (filterMod && e.modalidad !== filterMod) return false
    return true
  })

  function toggleEmployee(id: string, checked: boolean) {
    onChangeIsManual(true)
    if (checked) {
      onChangeSelectedIds([...selectedIds, id])
    } else {
      onChangeSelectedIds(selectedIds.filter(x => x !== id))
    }
  }

  function selectAllFiltered() {
    onChangeIsManual(true)
    const filteredIds = filtered.map(e => e.id)
    const merged = Array.from(new Set([...selectedIds, ...filteredIds]))
    onChangeSelectedIds(merged)
  }

  function clearFilters() {
    onChangeFilterCC("")
    onChangeFilterProg("")
    onChangeFilterMod("")
    onChangeIsManual(false)
    onChangeSelectedIds([])
  }

  const criterio = deriveCriterio(filterCC, filterProg, filterMod, isManual)
  const totalSelected = selectedIds.length

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Centro de Costo</Label>
          <Select value={filterCC || "__all__"} onValueChange={v => { onChangeFilterCC(v === "__all__" ? "" : v); onChangeIsManual(false) }}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {centrosCosto.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Programa</Label>
          <Select value={filterProg || "__all__"} onValueChange={v => { onChangeFilterProg(v === "__all__" ? "" : v); onChangeIsManual(false) }}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {programas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Modalidad</Label>
          <Select value={filterMod || "__all__"} onValueChange={v => { onChangeFilterMod(v === "__all__" ? "" : v); onChangeIsManual(false) }}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              {modalidades.map(md => <SelectItem key={md} value={md}>{md}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px]">
            Criterio: {criterio}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {filtered.length} mostrados · {totalSelected} seleccionados
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={selectAllFiltered}>
            Seleccionar todos los filtrados
          </Button>
          {(filterCC || filterProg || filterMod || isManual) && (
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={clearFilters}>
              Limpiar
            </Button>
          )}
        </div>
      </div>

      <div className="border rounded-lg p-2 max-h-44 overflow-y-auto space-y-0.5">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin empleados con estos filtros</p>
        ) : (
          filtered.map(emp => (
            <label key={emp.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 px-2 py-1 rounded">
              <input
                type="checkbox"
                checked={criterio !== "MANUAL" ? true : selectedIds.includes(emp.id)}
                onChange={e => {
                  if (criterio === "MANUAL" || isManual) {
                    toggleEmployee(emp.id, e.target.checked)
                  } else {
                    onChangeIsManual(true)
                    const allFilteredIds = filtered.map(x => x.id)
                    const base = e.target.checked
                      ? Array.from(new Set([...allFilteredIds, emp.id]))
                      : allFilteredIds.filter(id => id !== emp.id)
                    onChangeSelectedIds(base)
                  }
                }}
                className="rounded border-gray-300"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{emp.nombres} {emp.apellidos}</span>
                <span className="text-xs text-muted-foreground ml-2">CC {emp.numeroDocumento}</span>
                {emp.programa && <span className="text-[11px] text-muted-foreground ml-2">{emp.programa}</span>}
              </div>
            </label>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Period Employee Management Panel ─────────────────────────

interface PeriodEmployeePanelProps {
  periodo: Periodo
  startParam: string
  endParam: string
  cachedEmployees: EmpleadoAsignado[] | undefined
  onCacheEmployees: (id: string, data: EmpleadoAsignado[]) => void
}

function PeriodEmployeePanel({
  periodo,
  startParam,
  endParam,
  cachedEmployees,
  onCacheEmployees,
}: PeriodEmployeePanelProps) {
  const [loading, setLoading] = useState(false)
  const [showAddPanel, setShowAddPanel] = useState(false)

  const [addFilterCC, setAddFilterCC] = useState("")
  const [addFilterProg, setAddFilterProg] = useState("")
  const [addFilterMod, setAddFilterMod] = useState("")
  const [addIsManual, setAddIsManual] = useState(false)
  const [addSelectedIds, setAddSelectedIds] = useState<string[]>([])
  const [addLoading, setAddLoading] = useState(false)
  const [disponibles, setDisponibles] = useState<Empleado[]>([])

  const employees = cachedEmployees

  async function fetchEmployees() {
    setLoading(true)
    try {
      const res = await fetch(`/api/payroll/periods/${periodo.id}/employees`)
      if (res.ok) {
        const data = await res.json()
        onCacheEmployees(periodo.id, data.empleados ?? [])
      }
    } catch {
      toast.error("Error al cargar empleados")
    } finally {
      setLoading(false)
    }
  }

  async function fetchDisponibles() {
    try {
      const res = await fetch(`/api/payroll/periods/${periodo.id}/employees?disponibles=true`)
      if (res.ok) {
        const data = await res.json()
        setDisponibles(data.empleados ?? [])
      }
    } catch { /* non-blocking */ }
  }

  useEffect(() => {
    if (!employees) {
      fetchEmployees()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleRemoveEmployee(empleadoId: string) {
    if (!confirm("¿Quitar este empleado del período?")) return
    try {
      const res = await fetch(`/api/payroll/periods/${periodo.id}/employees/${empleadoId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        toast.success("Empleado removido del período")
        fetchEmployees()
      } else {
        toast.error("Error al remover empleado")
      }
    } catch {
      toast.error("Error de conexión")
    }
  }

  async function handleAddEmployees() {
    setAddLoading(true)
    const criterio = deriveCriterio(addFilterCC, addFilterProg, addFilterMod, addIsManual)
    try {
      const body: Record<string, unknown> = {
        criterioSeleccion: criterio,
        centroCosto: addFilterCC || undefined,
        programa: addFilterProg || undefined,
        modalidad: addFilterMod || undefined,
      }
      if (criterio === "MANUAL") {
        body.empleadoIds = addSelectedIds
      }
      const res = await fetch(`/api/payroll/periods/${periodo.id}/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(`${data.added} empleado(s) agregado(s)`)
        setShowAddPanel(false)
        setAddFilterCC("")
        setAddFilterProg("")
        setAddFilterMod("")
        setAddIsManual(false)
        setAddSelectedIds([])
        fetchEmployees()
      } else {
        toast.error("Error al agregar empleados")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setAddLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="px-5 py-4 border-t bg-muted/20">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-20 bg-muted rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="border-t bg-muted/20 px-5 py-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          Empleados asignados ({employees?.length ?? 0})
        </p>
        {periodo.estadoPeriodo === "BORRADOR" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={() => {
              setShowAddPanel(v => !v)
              if (!showAddPanel) fetchDisponibles()
            }}
          >
            <Plus className="h-3 w-3" />
            Agregar empleados
          </Button>
        )}
      </div>

      {showAddPanel && periodo.estadoPeriodo === "BORRADOR" && (
        <div className="border rounded-lg p-3 bg-card space-y-3">
          <p className="text-xs font-semibold">Agregar empleados al período</p>
          <EmployeeFilterPanel
            empleados={disponibles}
            selectedIds={addSelectedIds}
            isManual={addIsManual}
            filterCC={addFilterCC}
            filterProg={addFilterProg}
            filterMod={addFilterMod}
            onChangeSelectedIds={setAddSelectedIds}
            onChangeIsManual={setAddIsManual}
            onChangeFilterCC={setAddFilterCC}
            onChangeFilterProg={setAddFilterProg}
            onChangeFilterMod={setAddFilterMod}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAddPanel(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
              onClick={handleAddEmployees}
              disabled={addLoading}
            >
              {addLoading ? "Agregando…" : "Agregar"}
            </Button>
          </div>
        </div>
      )}

      {(!employees || employees.length === 0) ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No hay empleados asignados a este período.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {employees.map(emp => (
            <div
              key={emp.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                {emp.nombres.charAt(0)}{emp.apellidos.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate leading-tight">
                  {emp.nombres} {emp.apellidos}
                </p>
                <p className="text-[11px] text-muted-foreground">CC {emp.numeroDocumento}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {emp.programa && (
                    <span className="text-[10px] text-muted-foreground">{emp.programa}</span>
                  )}
                  {emp.modalidad && (
                    <span className="text-[10px] text-muted-foreground">· {emp.modalidad}</span>
                  )}
                  {emp.turnosCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] py-0 px-1 h-4">
                      {emp.turnosCount} turnos
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Link href={`${BASE_DASH}/schedules?empleadoId=${emp.id}&startDate=${startParam}&endDate=${endParam}`}>
                  <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 gap-0.5">
                    <Calendar className="h-3 w-3" />
                    Programar
                  </Button>
                </Link>
                {periodo.estadoPeriodo === "BORRADOR" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[11px] px-2 gap-0.5 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleRemoveEmployee(emp.id)}
                  >
                    <X className="h-3 w-3" />
                    Quitar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Haz clic en "Programar" para ir directamente a la programación de turnos.
      </p>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────

export default function AuxiliarPeriodosPage() {
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [calculando, setCalculando] = useState<string | null>(null)
  const [expandedPeriodoId, setExpandedPeriodoId] = useState<string | null>(null)
  const [employeeCache, setEmployeeCache] = useState<Map<string, EmpleadoAsignado[]>>(new Map())

  // Create form state
  const [formData, setFormData] = useState({
    nombrePeriodo: "",
    tipoPeriodo: "MENSUAL",
    fechaInicio: "",
    fechaFin: "",
    documentos: "",
  })
  const [formFilterCC, setFormFilterCC] = useState("")
  const [formFilterProg, setFormFilterProg] = useState("")
  const [formFilterMod, setFormFilterMod] = useState("")
  const [formIsManual, setFormIsManual] = useState(false)
  const [formSelectedIds, setFormSelectedIds] = useState<string[]>([])

  useEffect(() => {
    fetchPeriodos()
    fetchEmpleados()
  }, [])

  // Auto-fill dates when tipoPeriodo changes
  useEffect(() => {
    const dates = getDefaultDatesForType(formData.tipoPeriodo)
    setFormData(prev => ({ ...prev, fechaInicio: dates.inicio, fechaFin: dates.fin }))
  }, [formData.tipoPeriodo])

  async function fetchPeriodos() {
    setLoading(true)
    try {
      const res = await fetch("/api/payroll/periods")
      if (res.ok) setPeriodos(await res.json())
    } catch { toast.error("Error al cargar períodos") }
    finally { setLoading(false) }
  }

  async function fetchEmpleados() {
    try {
      const res = await fetch("/api/employees?soloMios=true")
      if (res.ok) {
        const data = await res.json()
        setEmpleados(Array.isArray(data) ? data : (data.empleados ?? []))
      }
    } catch { /* non-blocking */ }
  }

  function cacheEmployees(periodoId: string, data: EmpleadoAsignado[]) {
    setEmployeeCache(prev => {
      const next = new Map(prev)
      next.set(periodoId, data)
      return next
    })
  }

  function resetForm() {
    const dates = getDefaultDatesForType("MENSUAL")
    setFormData({ nombrePeriodo: "", tipoPeriodo: "MENSUAL", fechaInicio: dates.inicio, fechaFin: dates.fin, documentos: "" })
    setFormFilterCC("")
    setFormFilterProg("")
    setFormFilterMod("")
    setFormIsManual(false)
    setFormSelectedIds([])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const criterioSeleccion = deriveCriterio(formFilterCC, formFilterProg, formFilterMod, formIsManual)
    const payload = {
      ...formData,
      criterioSeleccion,
      centroCosto: formFilterCC || undefined,
      programa: formFilterProg || undefined,
      modalidad: formFilterMod || undefined,
      empleadosSeleccionados: formIsManual ? formSelectedIds : undefined,
    }
    try {
      const res = await fetch("/api/payroll/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast.success("Período creado")
        setShowForm(false)
        resetForm()
        fetchPeriodos()
      } else {
        const err = await res.json()
        toast.error(err.error || "Error al crear período")
      }
    } catch { toast.error("Error de conexión") }
  }

  async function calcularPeriodo(periodoId: string) {
    setCalculando(periodoId)
    try {
      const res = await fetch(`/api/payroll/periods/${periodoId}/calculate`, { method: "POST" })
      if (res.ok) {
        toast.success("Cálculo iniciado — puede tardar unos segundos")
        fetchPeriodos()
      } else { toast.error("Error al iniciar cálculo") }
    } catch { toast.error("Error de conexión") }
    finally { setCalculando(null) }
  }

  function handleDelete(periodoId: string, nombre: string) {
    toast.warning("¿Eliminar período?", {
      description: `El período "${nombre}" se eliminará permanentemente.`,
      action: {
        label: "Eliminar",
        onClick: async () => {
          try {
            const res = await fetch(`/api/payroll/periods/${periodoId}`, { method: "DELETE" })
            if (res.ok) {
              toast.success("Período eliminado")
              fetchPeriodos()
            } else {
              const err = await res.json()
              toast.error(err.error || "Error al eliminar")
            }
          } catch {
            toast.error("Error de conexión")
          }
        },
      },
    })
  }

  function toggleExpanded(periodoId: string) {
    setExpandedPeriodoId(prev => prev === periodoId ? null : periodoId)
  }

  const totalPeriodos = periodos.length
  const enProceso = periodos.filter(p => p.estadoPeriodo === "PENDIENTE").length
  const calculados = periodos.filter(p => ["CALCULADO", "CERRADO"].includes(p.estadoPeriodo)).length

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="grid grid-cols-3 gap-3"><div className="h-16 bg-muted rounded-xl" /><div className="h-16 bg-muted rounded-xl" /><div className="h-16 bg-muted rounded-xl" /></div>
        <div className="h-48 bg-muted rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Períodos de Nómina</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Crea períodos, asigna empleados y programa sus turnos</p>
        </div>
        <Button
          onClick={() => { setShowForm(v => !v); if (!showForm) resetForm() }}
          className={`gap-1.5 shrink-0 ${showForm ? "" : "bg-emerald-600 hover:bg-emerald-700"}`}
          variant={showForm ? "outline" : "default"}
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancelar" : "Nuevo Período"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Períodos", value: totalPeriodos, color: "text-foreground", bg: "bg-muted/40" },
          { label: "En Proceso", value: enProceso, color: "text-amber-700", bg: "bg-amber-50" },
          { label: "Calculados", value: calculados, color: "text-emerald-700", bg: "bg-emerald-50" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border px-4 py-3 ${s.bg}`}>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="border-emerald-200 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-emerald-600" />
              Crear Nuevo Período
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nombre del Período *</Label>
                    <Input value={formData.nombrePeriodo} onChange={e => setFormData({ ...formData, nombrePeriodo: e.target.value })} placeholder="Ej: Mayo 2026" required className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo de Período *</Label>
                    <Select value={formData.tipoPeriodo} onValueChange={v => setFormData({ ...formData, tipoPeriodo: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SEMANAL">Semanal</SelectItem>
                        <SelectItem value="QUINCENAL">Quincenal</SelectItem>
                        <SelectItem value="MENSUAL">Mensual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Fecha Inicio *</Label>
                    <Input type="date" value={formData.fechaInicio} onChange={e => setFormData({ ...formData, fechaInicio: e.target.value })} required className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Fecha Fin *</Label>
                    <Input type="date" value={formData.fechaFin} onChange={e => setFormData({ ...formData, fechaFin: e.target.value })} required className="h-9" />
                  </div>
                </div>

                {/* Asignación empleados */}
                <div className="border-t pt-4 space-y-3">
                  <h3 className="font-medium text-sm flex items-center gap-2"><Users className="h-4 w-4" />Asignación de Empleados</h3>
                  <EmployeeFilterPanel
                    empleados={empleados}
                    selectedIds={formSelectedIds}
                    isManual={formIsManual}
                    filterCC={formFilterCC}
                    filterProg={formFilterProg}
                    filterMod={formFilterMod}
                    onChangeSelectedIds={setFormSelectedIds}
                    onChangeIsManual={setFormIsManual}
                    onChangeFilterCC={setFormFilterCC}
                    onChangeFilterProg={setFormFilterProg}
                    onChangeFilterMod={setFormFilterMod}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700">Crear Período</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {periodos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-2xl text-muted-foreground">
          <CalendarRange className="h-10 w-10 mb-3 opacity-20" />
          <p className="font-medium">No hay períodos creados</p>
          <p className="text-sm mt-1 opacity-60">Crea el primer período de nómina</p>
        </div>
      )}

      {/* Period cards */}
      <div className="space-y-4">
        {periodos.map(periodo => {
          const cfg = STATUS_CONFIG[periodo.estadoPeriodo] ?? STATUS_CONFIG.BORRADOR
          const StatusIcon = cfg.icon
          const startParam = toInputDate(periodo.fechaInicio)
          const endParam = toInputDate(periodo.fechaFin)
          const isExpanded = expandedPeriodoId === periodo.id
          const cached = employeeCache.get(periodo.id)
          const empCount = cached?.length ?? null

          return (
            <Card key={periodo.id} className="overflow-hidden shadow-sm">
              <div className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-lg leading-tight">{periodo.nombrePeriodo}</h3>
                    <Badge variant="outline" className={`text-[11px] font-semibold gap-1 ${cfg.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {cfg.label}
                    </Badge>
                    <Badge variant="secondary" className="text-[11px]">
                      {TIPO_LABEL[periodo.tipoPeriodo] ?? periodo.tipoPeriodo}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>{fmtDate(periodo.fechaInicio)}</span>
                    <span>→</span>
                    <span>{fmtDate(periodo.fechaFin)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  <Link href={`${BASE_DASH}/periodos/${periodo.id}`}>
                    <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                      Gestionar
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>

                  {/* Employee toggle */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => toggleExpanded(periodo.id)}
                  >
                    <Users className="h-3.5 w-3.5" />
                    {empCount !== null ? empCount : ""}
                    {" "}empleados
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </Button>

                  {periodo.estadoPeriodo === "BORRADOR" && (
                    <Button size="sm" variant="outline"
                      className="gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                      onClick={() => calcularPeriodo(periodo.id)}
                      disabled={calculando === periodo.id}
                    >
                      <Calculator className="h-3.5 w-3.5" />
                      {calculando === periodo.id ? "Calculando…" : "Calcular"}
                    </Button>
                  )}

                  {["CALCULADO", "CERRADO"].includes(periodo.estadoPeriodo) && (
                    <Link href={`/dashboard-auxiliar/periodos/${periodo.id}`}>
                      <Button size="sm" variant="outline"
                        className="gap-1.5 text-purple-700 border-purple-300 hover:bg-purple-50"
                      >
                        <BarChart2 className="h-3.5 w-3.5" />
                        Resultados
                      </Button>
                    </Link>
                  )}

                  {periodo.estadoPeriodo === "BORRADOR" && (
                    <Button size="sm" variant="outline"
                      className="gap-1.5 text-red-700 border-red-300 hover:bg-red-50"
                      onClick={() => handleDelete(periodo.id, periodo.nombrePeriodo)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </Button>
                  )}
                </div>
              </div>

              {/* Employee panel */}
              {isExpanded && (
                <PeriodEmployeePanel
                  periodo={periodo}
                  startParam={startParam}
                  endParam={endParam}
                  cachedEmployees={cached}
                  onCacheEmployees={cacheEmployees}
                />
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
