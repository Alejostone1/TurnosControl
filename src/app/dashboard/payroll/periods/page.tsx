"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  Calculator,
  BarChart2,
  Calendar,
  CalendarRange,
  ChevronDown,
  ChevronUp,
  X,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileEdit,
  ArrowRight,
  Edit,
  Trash2,
  RotateCcw,
  Zap,
  Info,
  UtensilsCrossed,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

// ─── Types ────────────────────────────────────────────────────

interface Empleado {
  id: string
  nombres: string
  apellidos: string
  numeroDocumento: string
  centroCosto: string | null
  programa: string | null
  modalidad: string | null
  cargo?: string
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
  tipoCalculoHorasExtras: string
  estadoPeriodo: string
  fechaInicio: string
  fechaFin: string
  minutosAlimentacion?: number | null
  _count?: { resultados: number; empleadosAsignados?: number }
}

// ─── Helpers ──────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
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
    const dow = today.getDay() // 0=Sun,1=Mon,...,6=Sat
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
      const fin = new Date(y, m + 1, 0) // last day of month
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

/** Derive criterioSeleccion from filter state and manual selection */
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
  BORRADOR:   { label: "Borrador",        color: "bg-slate-100 text-slate-700 border-slate-200",    icon: FileEdit },
  PENDIENTE:  { label: "Bloqueado",       color: "bg-orange-100 text-orange-700 border-orange-200", icon: AlertCircle },
  CALCULADO:  { label: "Calculado",       color: "bg-green-100 text-green-700 border-green-200",    icon: CheckCircle2 },
  CERRADO:    { label: "Cerrado",         color: "bg-blue-100 text-blue-700 border-blue-200",       icon: CheckCircle2 },
}

const TIPO_LABEL: Record<string, string> = {
  SEMANAL: "Semanal", QUINCENAL: "Quincenal", MENSUAL: "Mensual",
}

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
      {/* Filter dropdowns */}
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

      {/* Derived criterio + actions */}
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

      {/* Employee list */}
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
                    // switching to manual
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
  allEmpleados: Empleado[]
  cachedEmployees: EmpleadoAsignado[] | undefined
  onCacheEmployees: (id: string, data: EmpleadoAsignado[]) => void
}

function PeriodEmployeePanel({
  periodo,
  startParam,
  endParam,
  allEmpleados,
  cachedEmployees,
  onCacheEmployees,
}: PeriodEmployeePanelProps) {
  const [loading, setLoading] = useState(false)
  const [showAddPanel, setShowAddPanel] = useState(false)

  // Add-employee panel state
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

      {/* Add employee inline panel */}
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
            <Button type="button" size="sm" className="h-7 text-xs" onClick={handleAddEmployees} disabled={addLoading}>
              {addLoading ? "Agregando…" : "Agregar"}
            </Button>
          </div>
        </div>
      )}

      {/* Assigned employees list */}
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
                {emp.turnosCount > 0 && (
                  <Link href={`/dashboard/schedules/individual?empleadoId=${emp.id}&startDate=${startParam}&endDate=${endParam}`}>
                    <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 gap-0.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50">
                      <BarChart2 className="h-3 w-3" />
                      Ver
                    </Button>
                  </Link>
                )}
                <Link href={`/dashboard/schedules/individual?empleadoId=${emp.id}&startDate=${startParam}&endDate=${endParam}`}>
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
        Haz clic en "Programar" para ir directamente a la programación de turnos de este empleado.
      </p>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────

export default function PayrollPeriodsPage() {
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [calculando, setCalculando]   = useState<string | null>(null)
  const [reseteando, setReseteando]   = useState<string | null>(null)

  // Which period's employee panel is open
  const [expandedPeriodoId, setExpandedPeriodoId] = useState<string | null>(null)

  // Per-period employee cache: Map<periodoId, EmpleadoAsignado[]>
  const [employeeCache, setEmployeeCache] = useState<Map<string, EmpleadoAsignado[]>>(new Map())

  // Create form state
  const [formData, setFormData] = useState({
    nombrePeriodo: "",
    tipoPeriodo: "MENSUAL",
    tipoCalculoHorasExtras: "SEMANAL",
    fechaInicio: "",
    fechaFin: "",
    documentos: "",
    minutosAlimentacion: 30 as number,
  })
  const [formBreakMode, setFormBreakMode] = useState<number>(30)   // 0/30/60/-1(custom)
  const [formBreakCustom, setFormBreakCustom] = useState<number>(45)
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
    try {
      const res = await fetch("/api/payroll/periods")
      if (res.ok) setPeriodos(await res.json())
    } catch {
      toast.error("Error al cargar períodos")
    } finally {
      setLoading(false)
    }
  }

  async function fetchEmpleados() {
    try {
      const res = await fetch("/api/employees")
      if (res.ok) setEmpleados(await res.json())
    } catch {
      // non-blocking
    }
  }

  function cacheEmployees(periodoId: string, data: EmpleadoAsignado[]) {
    setEmployeeCache(prev => {
      const next = new Map(prev)
      next.set(periodoId, data)
      return next
    })
  }

  const resetForm = () => {
    const dates = getDefaultDatesForType("MENSUAL")
    setFormData({
      nombrePeriodo: "",
      tipoPeriodo: "MENSUAL",
      tipoCalculoHorasExtras: "SEMANAL",
      fechaInicio: dates.inicio,
      fechaFin: dates.fin,
      documentos: "",
      minutosAlimentacion: 30,
    })
    setFormBreakMode(30)
    setFormBreakCustom(45)
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
        setShowCreateForm(false)
        resetForm()
        fetchPeriodos()
      } else {
        const err = await res.json()
        toast.error(err.error || "Error al crear período")
      }
    } catch {
      toast.error("Error de conexión")
    }
  }

  async function calcularPeriodo(periodoId: string, forzar = false) {
    setCalculando(periodoId)
    try {
      const url = `/api/payroll/periods/${periodoId}/calculate${forzar ? "?forzar=true" : ""}`
      const res = await fetch(url, { method: "POST" })
      const data = await res.json()

      if (res.ok) {
        const msg = data.sinTurnos > 0
          ? `Nómina calculada. ${data.sinTurnos} empleado(s) sin turnos quedaron en $0.`
          : data.message || "Nómina calculada exitosamente"
        toast.success(msg)
        fetchPeriodos()
        return
      }

      if (res.status === 422 && data.code === "TURNOS_INCOMPLETOS") {
        toast.warning(
          `${data.sinTurnos} de ${data.totalEmpleados} empleado(s) sin turnos`,
          {
            description: "¿Calcular de todas formas? Los empleados sin turnos quedarán en $0.",
            action: {
              label: "Calcular de todas formas",
              onClick: () => calcularPeriodo(periodoId, true),
            },
            duration: 10000,
          }
        )
        return
      }

      if (res.status === 422 && data.code === "SIN_EMPLEADOS") {
        toast.error("Sin empleados", { description: data.error })
        return
      }

      toast.error(data.error || "Error al calcular")
    } catch {
      toast.error("Error de conexión")
    } finally {
      setCalculando(null)
    }
  }

  async function handleResetPeriodo(periodoId: string, nombrePeriodo: string) {
    if (!confirm(`¿Resetear "${nombrePeriodo}" a Borrador? Se podrá recalcular después.`)) return
    setReseteando(periodoId)
    try {
      const res = await fetch(`/api/payroll/periods/${periodoId}/reset`, { method: "POST" })
      if (res.ok) {
        toast.success("Período reseteado a Borrador")
        fetchPeriodos()
      } else {
        const err = await res.json()
        toast.error(err.error || "Error al resetear")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setReseteando(null)
    }
  }

  async function handleDeletePeriodo(periodoId: string, nombrePeriodo: string) {
    if (!confirm(`¿Estás seguro de que deseas eliminar el período "${nombrePeriodo}"? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      const res = await fetch(`/api/payroll/periods/${periodoId}`, {
        method: "DELETE"
      })

      if (res.ok) {
        toast.success("Período eliminado exitosamente")
        fetchPeriodos()
      } else {
        const error = await res.json()
        toast.error(error.error || "Error al eliminar período")
      }
    } catch {
      toast.error("Error de conexión")
    }
  }

  function toggleExpanded(periodoId: string) {
    setExpandedPeriodoId(prev => prev === periodoId ? null : periodoId)
  }

  function canEditPeriodo(estado: string) {
    return estado === "BORRADOR"
  }

  function canDeletePeriodo(estado: string) {
    return estado === "BORRADOR"
  }

  // Stats
  const totalPeriodos = periodos.length
  const enProceso = periodos.filter(p => p.estadoPeriodo === "PENDIENTE").length
  const calculados = periodos.filter(p => p.estadoPeriodo === "CALCULADO" || p.estadoPeriodo === "CERRADO").length

  if (loading) {
    return (
      <div className="space-y-5">
        <h1 className="text-xl md:text-3xl font-bold">Períodos de Nómina</h1>
        <div className="animate-pulse space-y-3">
          <div className="h-20 bg-muted rounded-xl" />
          <div className="h-48 bg-muted rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Períodos de Nómina</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Crea períodos, asigna empleados y programa sus turnos
          </p>
        </div>
        <Button
          onClick={() => { setShowCreateForm(v => !v); if (!showCreateForm) resetForm() }}
          className="gap-1.5 shrink-0 self-start"
          variant={showCreateForm ? "outline" : "default"}
        >
          {showCreateForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showCreateForm ? "Cancelar" : "Nuevo Período"}
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Períodos", value: totalPeriodos, color: "text-foreground", bg: "bg-muted/40" },
          { label: "En Proceso",     value: enProceso,     color: "text-amber-700",  bg: "bg-amber-50" },
          { label: "Calculados",     value: calculados,    color: "text-green-700",  bg: "bg-green-50" },
        ].map(stat => (
          <div key={stat.label} className={`rounded-xl border px-4 py-3 ${stat.bg}`}>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ── Create Form ── */}
      {showCreateForm && (
        <Card className="border-primary/30 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-primary" />
              Crear Nuevo Período
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Datos básicos del período */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nombre del Período *</Label>
                    <Input
                      value={formData.nombrePeriodo}
                      onChange={e => setFormData({ ...formData, nombrePeriodo: e.target.value })}
                      placeholder="Ej: Mayo 2026"
                      required
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo de Período *</Label>
                    <Select
                      value={formData.tipoPeriodo}
                      onValueChange={v => setFormData({ ...formData, tipoPeriodo: v })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SEMANAL">Semanal</SelectItem>
                        <SelectItem value="QUINCENAL">Quincenal</SelectItem>
                        <SelectItem value="MENSUAL">Mensual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/60 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-indigo-600 shrink-0" />
                        <Label className="text-xs font-semibold text-indigo-800">Método de Cálculo de Horas Extras *</Label>
                      </div>
                      <Select
                        value={formData.tipoCalculoHorasExtras}
                        onValueChange={v => setFormData({ ...formData, tipoCalculoHorasExtras: v })}
                      >
                        <SelectTrigger className="h-9 border-indigo-300 bg-white focus:ring-indigo-400">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SEMANAL">
                            Semanal — acumula Dom→Sáb; extras al superar el tope semanal
                          </SelectItem>
                          <SelectItem value="DIARIO">
                            Diario — extras al superar la jornada estándar por día
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-start gap-1.5 text-[11px] text-indigo-700/80">
                        <Info className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>
                          Tope semanal configurable en <strong>Configuración → Legal</strong>.
                          Desde el <strong>01/08/2026</strong> la jornada legal en Colombia baja de 44 a <strong>42 h/semana</strong>.
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* ── Rango de fechas ── */}
                  <div className="sm:col-span-2 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/60 to-violet-50/40 p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <CalendarRange className="h-4 w-4 text-blue-500 shrink-0" />
                      <span className="text-xs font-bold text-blue-800 uppercase tracking-wide">Rango de Fechas del Período</span>
                      {formData.fechaInicio && formData.fechaFin && (() => {
                        const dias = Math.round(
                          (new Date(formData.fechaFin).getTime() - new Date(formData.fechaInicio).getTime()) / 86400000
                        ) + 1
                        return dias > 0 ? (
                          <span className="ml-auto inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 text-white text-[11px] font-bold shadow-sm">
                            <CalendarRange className="h-2.5 w-2.5" />
                            {dias} días
                          </span>
                        ) : null
                      })()}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">📅 Fecha Inicio *</Label>
                        <Input
                          type="date"
                          value={formData.fechaInicio}
                          onChange={e => setFormData({ ...formData, fechaInicio: e.target.value })}
                          required
                          className="h-10 border-2 border-blue-200 focus-visible:ring-blue-300 bg-white font-semibold text-sm rounded-lg shadow-sm"
                        />
                        {formData.fechaInicio && (
                          <p className="text-[10px] text-blue-600 font-medium capitalize leading-none pt-0.5">
                            {new Date(formData.fechaInicio + "T12:00:00").toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-violet-600 uppercase tracking-wide">📅 Fecha Fin *</Label>
                        <Input
                          type="date"
                          value={formData.fechaFin}
                          onChange={e => setFormData({ ...formData, fechaFin: e.target.value })}
                          required
                          className="h-10 border-2 border-violet-200 focus-visible:ring-violet-300 bg-white font-semibold text-sm rounded-lg shadow-sm"
                        />
                        {formData.fechaFin && (
                          <p className="text-[10px] text-violet-600 font-medium capitalize leading-none pt-0.5">
                            {new Date(formData.fechaFin + "T12:00:00").toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Descuento de Alimentación ── */}
                <div className="sm:col-span-2 rounded-xl border-2 border-orange-200 bg-orange-50/60 p-3 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="h-4 w-4 text-orange-600 shrink-0" />
                    <Label className="text-xs font-semibold text-orange-800">Descuento de Alimentación (por defecto del período)</Label>
                  </div>
                  <div className="flex gap-1.5 flex-wrap items-center">
                    {([0, 30, 60] as const).map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          setFormBreakMode(v)
                          setFormData(prev => ({ ...prev, minutosAlimentacion: v }))
                        }}
                        className={[
                          "text-xs font-medium px-3 py-1.5 rounded-lg border transition-all",
                          formBreakMode === v
                            ? "border-orange-500 bg-orange-100 text-orange-900 shadow-sm"
                            : "border-border text-muted-foreground hover:border-orange-300 hover:text-orange-700 bg-white",
                        ].join(" ")}
                      >
                        {v === 0 ? "Sin descuento" : v === 30 ? "30 min" : "1 hora"}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setFormBreakMode(-1)
                        setFormData(prev => ({ ...prev, minutosAlimentacion: formBreakCustom }))
                      }}
                      className={[
                        "text-xs font-medium px-3 py-1.5 rounded-lg border transition-all",
                        formBreakMode === -1
                          ? "border-orange-500 bg-orange-100 text-orange-900 shadow-sm"
                          : "border-border text-muted-foreground hover:border-orange-300 hover:text-orange-700 bg-white",
                      ].join(" ")}
                    >
                      Personalizado
                    </button>
                    {formBreakMode === -1 && (
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min={0}
                          max={120}
                          value={formBreakCustom}
                          onChange={e => {
                            const v = Math.max(0, parseInt(e.target.value) || 0)
                            setFormBreakCustom(v)
                            setFormData(prev => ({ ...prev, minutosAlimentacion: v }))
                          }}
                          className="h-8 w-20 text-xs"
                        />
                        <span className="text-xs text-muted-foreground">min</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-orange-700/80 flex items-start gap-1.5">
                    <Info className="h-3 w-3 mt-0.5 shrink-0" />
                    Este valor se aplica a todos los turnos del período. Puede sobreescribirse turno a turno desde la programación individual.
                  </p>
                </div>

                {/* Selección de empleados */}
                <div className="space-y-3 border-t pt-4">
                  <h3 className="font-medium text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Asignación de Empleados
                  </h3>
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
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm">
                  Crear Período
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Empty state ── */}
      {periodos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-2xl text-muted-foreground">
          <CalendarRange className="h-10 w-10 mb-3 opacity-20" />
          <p className="font-medium">No hay períodos creados</p>
          <p className="text-sm mt-1 opacity-60">Crea el primer período de nómina</p>
        </div>
      )}

      {/* ── Period Cards ── */}
      <div className="space-y-4">
        {periodos.map((periodo) => {
          const cfg = STATUS_CONFIG[periodo.estadoPeriodo] ?? STATUS_CONFIG.BORRADOR
          const StatusIcon = cfg.icon
          const isExpanded = expandedPeriodoId === periodo.id
          const startParam = toInputDate(periodo.fechaInicio)
          const endParam = toInputDate(periodo.fechaFin)
          const cached = employeeCache.get(periodo.id)
          const empCount = cached?.length ?? null

          return (
            <Card key={periodo.id} className="overflow-hidden shadow-sm">
              {/* Stuck-period warning banner */}
              {periodo.estadoPeriodo === "PENDIENTE" && (
                <div className="flex items-center gap-2.5 px-4 py-2 bg-orange-50 border-b border-orange-200 text-orange-800 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 text-orange-500" />
                  <span>
                    <strong>Período bloqueado.</strong> El cálculo anterior quedó incompleto (posiblemente por un error de conexión).
                    Haz clic en <strong>Resetear</strong> para volver a Borrador y recalcular.
                  </span>
                </div>
              )}

              {/* Card header */}
              <div className="px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base sm:text-lg leading-tight">{periodo.nombrePeriodo}</h3>
                    <Badge
                      variant="outline"
                      className={`text-[11px] font-semibold gap-1 ${cfg.color}`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {cfg.label}
                    </Badge>
                    <Badge variant="secondary" className="text-[11px]">
                      {TIPO_LABEL[periodo.tipoPeriodo] ?? periodo.tipoPeriodo}
                    </Badge>
                    <Badge variant="outline" className="text-[11px] gap-1 bg-violet-50 text-violet-700 border-violet-200">
                      ⚡ {periodo.tipoCalculoHorasExtras === "DIARIO" ? "Cálculo Diario" : "Cálculo Semanal"}
                    </Badge>
                    {periodo.minutosAlimentacion != null && (
                      <Badge variant="outline" className="text-[11px] gap-1 bg-orange-50 text-orange-700 border-orange-200">
                        🍽 {periodo.minutosAlimentacion === 0 ? "Sin desc. alim." : `${periodo.minutosAlimentacion}min alim.`}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>{fmtDate(periodo.fechaInicio)}</span>
                    <span>→</span>
                    <span>{fmtDate(periodo.fechaFin)}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {/* Primary: go to period detail */}
                  <Link href={`/dashboard/payroll/periods/${periodo.id}`}>
                    <Button size="sm" className="gap-1.5">
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

                  {/* Quick shortcuts */}
                  {periodo.estadoPeriodo === "BORRADOR" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                      onClick={() => calcularPeriodo(periodo.id)}
                      disabled={calculando === periodo.id}
                    >
                      {calculando === periodo.id
                        ? <><Clock className="h-3.5 w-3.5 animate-spin" /> Calculando…</>
                        : <><Calculator className="h-3.5 w-3.5" /> Calcular</>
                      }
                    </Button>
                  )}

                  {/* Reset bloqueado (PENDIENTE o CALCULADO) */}
                  {(periodo.estadoPeriodo === "PENDIENTE" || periodo.estadoPeriodo === "CALCULADO") && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-orange-700 border-orange-300 hover:bg-orange-50"
                      onClick={() => handleResetPeriodo(periodo.id, periodo.nombrePeriodo)}
                      disabled={reseteando === periodo.id}
                    >
                      <RotateCcw className={`h-3.5 w-3.5 ${reseteando === periodo.id ? "animate-spin" : ""}`} />
                      {reseteando === periodo.id ? "Reseteando…" : "Resetear"}
                    </Button>
                  )}

                  {(periodo.estadoPeriodo === "CALCULADO" || periodo.estadoPeriodo === "CERRADO") && (
                    <Link href={`/dashboard/payroll/results?periodoId=${periodo.id}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-purple-700 border-purple-300 hover:bg-purple-50"
                      >
                        <BarChart2 className="h-3.5 w-3.5" />
                        Resultados
                      </Button>
                    </Link>
                  )}

                  {/* Editar período - solo si está en borrador */}
                  {canEditPeriodo(periodo.estadoPeriodo) && (
                    <Link href={`/dashboard/payroll/periods/${periodo.id}/edit`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-blue-700 border-blue-300 hover:bg-blue-50"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                    </Link>
                  )}

                  {/* Eliminar período - solo si está en borrador */}
                  {canDeletePeriodo(periodo.estadoPeriodo) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-red-700 border-red-300 hover:bg-red-50"
                      onClick={() => handleDeletePeriodo(periodo.id, periodo.nombrePeriodo)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </Button>
                  )}
                </div>
              </div>

              {/* ── Employee panel ── */}
              {isExpanded && (
                <PeriodEmployeePanel
                  periodo={periodo}
                  startParam={startParam}
                  endParam={endParam}
                  allEmpleados={empleados}
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
