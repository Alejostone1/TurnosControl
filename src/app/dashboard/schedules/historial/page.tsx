"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  History,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Building2,
  BookOpen,
  Layers,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  ChevronDown,
  ChevronUp,
  CalendarRange,
} from "lucide-react"
import { toast } from "sonner"

interface Empleado {
  id: string
  nombres: string
  apellidos: string
  numeroDocumento: string
  centroCosto: string | null
  programa: string | null
  modalidad: string | null
}

interface Concepto {
  id: string
  codigo: string
  nombre: string
  color: string | null
  tipoImpacto: string
  horaInicioDefecto: string | null
  horaFinDefecto: string | null
}

interface Asignacion {
  id: string
  fechaTurno: string
  horaInicioPersonalizada: string | null
  horaFinPersonalizada: string | null
  empleado: Empleado
  concepto: Concepto
}

interface EmpleadoBasico {
  id: string
  nombres: string
  apellidos: string
  centroCosto: string | null
  programa: string | null
  modalidad: string | null
}

interface Periodo {
  id: string
  nombrePeriodo: string
  fechaInicio: string
  fechaFin: string
  estadoPeriodo: string
}

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const PAGE_SIZE = 10

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("T")[0].split("-")
  return `${d}/${m}/${y}`
}

function diaSemana(iso: string) {
  return DIAS[new Date(iso).getDay()]
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function monthStartStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}

type FilterMode = "todos" | "empleado" | "centro" | "programa" | "modalidad"
type DateMode   = "rango" | "periodo"

const FILTER_TABS: { key: FilterMode; label: string; icon: React.ElementType }[] = [
  { key: "todos",     label: "Todos",           icon: Layers },
  { key: "empleado",  label: "Por Empleado",    icon: User },
  { key: "centro",    label: "Centro de Costo", icon: Building2 },
  { key: "programa",  label: "Programa",        icon: BookOpen },
  { key: "modalidad", label: "Modalidad",       icon: Filter },
]

// ─── Accordion row per employee ──────────────────────────────

function EmpleadoAccordion({ emp, asigs }: { emp: Empleado; asigs: Asignacion[] }) {
  const [open, setOpen] = useState(false)

  const sorted = useMemo(
    () => [...asigs].sort((a, b) => a.fechaTurno < b.fechaTurno ? -1 : 1),
    [asigs]
  )

  const accentColor = sorted[0]?.concepto.color || "#7C3AED"

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderLeftWidth: 4, borderLeftColor: accentColor }}>
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
      >
        {/* Name + tags — no avatar */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight truncate">
            {emp.apellidos} {emp.nombres}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            {emp.centroCosto && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5">
                <Building2 className="h-2.5 w-2.5" />
                {emp.centroCosto}
              </span>
            )}
            {emp.programa && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5">
                <BookOpen className="h-2.5 w-2.5" />
                {emp.programa}
              </span>
            )}
            {emp.modalidad && (
              <span className="text-[10px] text-muted-foreground">{emp.modalidad}</span>
            )}
          </div>
        </div>

        {/* Shift count + chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" className="text-[11px] font-medium">
            {asigs.length} turno{asigs.length !== 1 ? "s" : ""}
          </Badge>
          {open
            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />
          }
        </div>
      </button>

      {/* Collapsible shifts */}
      {open && (
        <div className="divide-y border-t bg-background text-sm">
          {sorted.map(a => {
            const hIn  = a.horaInicioPersonalizada || a.concepto.horaInicioDefecto
            const hFin = a.horaFinPersonalizada   || a.concepto.horaFinDefecto
            const dotColor = a.concepto.color || "#94A3B8"
            return (
              <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/10 transition-colors">
                {/* Date block */}
                <div className="w-[4.5rem] shrink-0 text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: accentColor }}>
                    {diaSemana(a.fechaTurno)}
                  </p>
                  <p className="text-xs font-bold leading-tight">
                    {fmtDate(a.fechaTurno).slice(0, 5)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {a.fechaTurno.slice(0, 4)}
                  </p>
                </div>

                {/* Color dot */}
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />

                {/* Concept */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{a.concepto.nombre}</p>
                  <p className="text-[10px] text-muted-foreground">
                    [{a.concepto.codigo}] · {a.concepto.tipoImpacto}
                  </p>
                </div>

                {/* Hours */}
                {(hIn || hFin) ? (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 bg-muted/40 rounded px-2 py-0.5">
                    <Clock className="h-3 w-3" />
                    <span>{hIn ?? "?"} – {hFin ?? "?"}</span>
                  </div>
                ) : (
                  <span className="text-[10px] text-muted-foreground/40 shrink-0 italic">Sin hora</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────

export default function HistorialPage() {
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [empleados, setEmpleados]       = useState<EmpleadoBasico[]>([])
  const [periodos, setPeriodos]         = useState<Periodo[]>([])
  const [loading, setLoading]           = useState(false)
  const [loadingEmps, setLoadingEmps]   = useState(true)
  const [exporting, setExporting]       = useState(false)

  const [filterMode, setFilterMode]     = useState<FilterMode>("todos")
  const [dateMode, setDateMode]         = useState<DateMode>("rango")
  const [selectedPeriodoId, setSelectedPeriodoId] = useState("")
  const [fechaInicio, setFechaInicio]   = useState(monthStartStr())
  const [fechaFin, setFechaFin]         = useState(todayStr())
  const [searchText, setSearchText]     = useState("")
  const [currentPage, setCurrentPage]   = useState(1)

  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState("")
  const [selectedCentro, setSelectedCentro]         = useState("")
  const [selectedPrograma, setSelectedPrograma]     = useState("")
  const [selectedModalidad, setSelectedModalidad]   = useState("")

  // Load employees and periods once
  useEffect(() => {
    fetch("/api/employees")
      .then(r => r.json())
      .then(data => setEmpleados(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingEmps(false))

    fetch("/api/payroll/periods")
      .then(r => r.json())
      .then(data => {
        const list: Periodo[] = Array.isArray(data) ? data : (data.periodos ?? [])
        // Sort newest first
        list.sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio))
        setPeriodos(list)
      })
      .catch(() => {})
  }, [])

  const uniqueCentros     = Array.from(new Set(empleados.map(e => e.centroCosto).filter(Boolean))) as string[]
  const uniqueProgramas   = Array.from(new Set(empleados.map(e => e.programa).filter(Boolean)))    as string[]
  const uniqueModalidades = Array.from(new Set(empleados.map(e => e.modalidad).filter(Boolean)))   as string[]

  // Resolve effective date range
  const { effectiveStart, effectiveEnd } = useMemo(() => {
    if (dateMode === "periodo" && selectedPeriodoId) {
      const p = periodos.find(x => x.id === selectedPeriodoId)
      if (p) return { effectiveStart: p.fechaInicio.substring(0, 10), effectiveEnd: p.fechaFin.substring(0, 10) }
    }
    return { effectiveStart: fechaInicio, effectiveEnd: fechaFin }
  }, [dateMode, selectedPeriodoId, periodos, fechaInicio, fechaFin])

  const buildParams = useCallback(() => {
    const params = new URLSearchParams({ startDate: effectiveStart, endDate: effectiveEnd, limit: "1000" })
    if (filterMode === "empleado"  && selectedEmpleadoId) params.set("empleadoId", selectedEmpleadoId)
    if (filterMode === "centro"    && selectedCentro)     params.set("centroCosto", selectedCentro)
    if (filterMode === "programa"  && selectedPrograma)   params.set("programa",    selectedPrograma)
    if (filterMode === "modalidad" && selectedModalidad)  params.set("modalidad",   selectedModalidad)
    return params
  }, [effectiveStart, effectiveEnd, filterMode, selectedEmpleadoId, selectedCentro, selectedPrograma, selectedModalidad])

  const buscar = useCallback(async () => {
    if (dateMode === "periodo" && !selectedPeriodoId) return
    setLoading(true)
    setCurrentPage(1)
    try {
      const res = await fetch(`/api/schedules?${buildParams()}`)
      if (res.ok) {
        setAsignaciones(await res.json())
      } else {
        toast.error("Error al cargar historial")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setLoading(false)
    }
  }, [buildParams, dateMode, selectedPeriodoId])

  useEffect(() => { buscar() }, [buscar])

  // Group by employee
  const grouped = useMemo(() => {
    const map = new Map<string, { emp: Empleado; asigs: Asignacion[] }>()
    for (const a of asignaciones) {
      if (!map.has(a.empleado.id)) map.set(a.empleado.id, { emp: a.empleado, asigs: [] })
      map.get(a.empleado.id)!.asigs.push(a)
    }
    return Array.from(map.values()).sort((a, b) =>
      `${a.emp.apellidos} ${a.emp.nombres}`.localeCompare(`${b.emp.apellidos} ${b.emp.nombres}`)
    )
  }, [asignaciones])

  // Client-side search
  const filteredGroups = useMemo(() => {
    if (!searchText.trim()) return grouped
    const q = searchText.toLowerCase()
    return grouped.filter(({ emp }) =>
      `${emp.nombres} ${emp.apellidos}`.toLowerCase().includes(q) ||
      emp.numeroDocumento?.includes(q)
    )
  }, [grouped, searchText])

  // Pagination
  const totalPages  = Math.max(1, Math.ceil(filteredGroups.length / PAGE_SIZE))
  const pagedGroups = filteredGroups.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const totalShifts = filteredGroups.reduce((s, g) => s + g.asigs.length, 0)

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = buildParams()
      if (searchText.trim()) params.set("search", searchText.trim())
      const res = await fetch(`/api/schedules/export?${params}`)
      if (!res.ok) { toast.error("Error al exportar"); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement("a")
      a.href     = url
      a.download = `Historial_Turnos_${effectiveStart}_${effectiveEnd}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Error al exportar")
    } finally {
      setExporting(false)
    }
  }

  // Selected period label
  const selectedPeriodo = periodos.find(p => p.id === selectedPeriodoId)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-6 w-6 text-purple-600" />
            <h1 className="text-2xl font-bold">Historial de Turnos</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Registro de turnos programados — filtra por período o rango de fechas
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 shrink-0"
          onClick={handleExport}
          disabled={exporting || asignaciones.length === 0}
        >
          {exporting
            ? <RefreshCw className="h-4 w-4 animate-spin" />
            : <Download className="h-4 w-4" />
          }
          Exportar Excel
        </Button>
      </div>

      {/* Filter panel */}
      <Card className="border-purple-200">
        <CardContent className="pt-4 pb-3 space-y-3">

          {/* Date mode toggle */}
          <div className="flex items-center gap-1 p-0.5 bg-muted/40 rounded-lg w-fit">
            <button
              onClick={() => setDateMode("periodo")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                dateMode === "periodo"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarRange className="h-3.5 w-3.5" />
              Por Período
            </button>
            <button
              onClick={() => setDateMode("rango")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                dateMode === "rango"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              Por Fechas
            </button>
          </div>

          {/* Date inputs */}
          {dateMode === "periodo" ? (
            <div className="space-y-1">
              <Label className="text-xs">Período de nómina</Label>
              <Select
                value={selectedPeriodoId || "__none__"}
                onValueChange={v => setSelectedPeriodoId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger className="h-8 text-xs max-w-sm">
                  <SelectValue placeholder="Seleccionar período..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Seleccionar —</SelectItem>
                  {periodos.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombrePeriodo}
                      <span className="ml-2 text-muted-foreground text-[10px]">
                        ({p.fechaInicio.substring(0,10)} → {p.fechaFin.substring(0,10)})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPeriodo && (
                <p className="text-[10px] text-muted-foreground pl-1">
                  {selectedPeriodo.fechaInicio.substring(0,10)} al {selectedPeriodo.fechaFin.substring(0,10)}
                  {" · "}
                  <span className={`font-medium ${
                    selectedPeriodo.estadoPeriodo === "CALCULADO" || selectedPeriodo.estadoPeriodo === "CERRADO"
                      ? "text-emerald-600" : "text-amber-600"
                  }`}>
                    {selectedPeriodo.estadoPeriodo}
                  </span>
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 max-w-xs">
              <div className="space-y-1">
                <Label className="text-xs">Fecha inicio</Label>
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={fechaInicio}
                  onChange={e => { setFechaInicio(e.target.value); if (e.target.value > fechaFin) setFechaFin(e.target.value) }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fecha fin</Label>
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={fechaFin}
                  min={fechaInicio}
                  onChange={e => setFechaFin(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="border-t pt-3 space-y-2">
            {/* Filter mode tabs */}
            <div className="flex flex-wrap gap-1.5">
              {FILTER_TABS.map(tab => {
                const Icon   = tab.icon
                const active = filterMode === tab.key
                return (
                  <button
                    key={tab.key}
                    onClick={() => setFilterMode(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                      active
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-background text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* Dynamic filter select */}
            <div className="flex items-end gap-3">
              <div className="flex-1 max-w-xs space-y-1">
                {filterMode !== "todos" && (
                  <>
                    <Label className="text-xs">
                      {filterMode === "empleado"  && "Empleado"}
                      {filterMode === "centro"    && "Centro de Costo"}
                      {filterMode === "programa"  && "Programa"}
                      {filterMode === "modalidad" && "Modalidad"}
                    </Label>

                    {filterMode === "empleado" && (
                      <Select value={selectedEmpleadoId || "__all__"} onValueChange={v => setSelectedEmpleadoId(v === "__all__" ? "" : v)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder={loadingEmps ? "Cargando..." : "Seleccionar empleado..."} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Todos</SelectItem>
                          {empleados.map(e => (
                            <SelectItem key={e.id} value={e.id}>{e.apellidos} {e.nombres}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {filterMode === "centro" && (
                      <Select value={selectedCentro || "__all__"} onValueChange={v => setSelectedCentro(v === "__all__" ? "" : v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar centro..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Todos</SelectItem>
                          {uniqueCentros.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}

                    {filterMode === "programa" && (
                      <Select value={selectedPrograma || "__all__"} onValueChange={v => setSelectedPrograma(v === "__all__" ? "" : v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar programa..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Todos</SelectItem>
                          {uniqueProgramas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}

                    {filterMode === "modalidad" && (
                      <Select value={selectedModalidad || "__all__"} onValueChange={v => setSelectedModalidad(v === "__all__" ? "" : v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar modalidad..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Todas</SelectItem>
                          {uniqueModalidades.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </>
                )}
              </div>

              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={buscar} disabled={loading}>
                {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                Buscar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary + Search */}
      {!loading && asignaciones.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-xs"
              placeholder="Buscar empleado o documento..."
              value={searchText}
              onChange={e => { setSearchText(e.target.value); setCurrentPage(1) }}
            />
            {searchText && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => { setSearchText(""); setCurrentPage(1) }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[11px]">
              {totalShifts} turno{totalShifts !== 1 ? "s" : ""}
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              {filteredGroups.length} empleado{filteredGroups.length !== 1 ? "s" : ""}
            </Badge>
            {searchText && <span className="text-[11px] text-purple-600">· filtrado</span>}
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : dateMode === "periodo" && !selectedPeriodoId ? (
        <div className="rounded-xl border bg-muted/10 flex flex-col items-center py-16 text-muted-foreground gap-2">
          <CalendarRange className="h-10 w-10 opacity-20" />
          <p className="font-medium text-sm">Selecciona un período de nómina</p>
          <p className="text-xs">Elige un período arriba para ver el historial de turnos</p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="rounded-xl border bg-muted/10 flex flex-col items-center py-16 text-muted-foreground gap-2">
          <Calendar className="h-10 w-10 opacity-20" />
          <p className="font-medium text-sm">
            {asignaciones.length === 0
              ? "No hay turnos en este período"
              : "Ningún empleado coincide con la búsqueda"}
          </p>
          <p className="text-xs">
            {asignaciones.length === 0
              ? "Ajusta los filtros o elige otro período"
              : "Prueba con otro nombre o borra el buscador"}
          </p>
        </div>
      ) : (
        <>
          {/* Accordion list */}
          <div className="space-y-2">
            {pagedGroups.map(({ emp, asigs }) => (
              <EmpleadoAccordion key={emp.id} emp={emp} asigs={asigs} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">
                Página {currentPage} de {totalPages} · {filteredGroups.length} empleado{filteredGroups.length !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…")
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, i) =>
                    p === "…" ? (
                      <span key={`ellipsis-${i}`} className="text-xs text-muted-foreground px-1">…</span>
                    ) : (
                      <Button
                        key={p}
                        variant={currentPage === p ? "default" : "outline"}
                        size="sm"
                        className="h-7 w-7 p-0 text-xs"
                        onClick={() => setCurrentPage(p as number)}
                      >
                        {p}
                      </Button>
                    )
                  )
                }

                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
