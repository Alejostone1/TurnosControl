"use client"

import { useState, useEffect, useCallback } from "react"
import { Button }  from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge }   from "@/components/ui/badge"
import { Input }   from "@/components/ui/input"
import { Label }   from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Users, Calendar, Save, X, RefreshCw, ChevronLeft, ChevronRight,
  CalendarRange, FileEdit, CheckCircle2, AlertCircle, Trash2,
  ChevronDown, ChevronUp, Lock, Eye, CheckSquare, Square, AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Periodo {
  id: string; nombrePeriodo: string; tipoPeriodo: string
  estadoPeriodo: string; fechaInicio: string; fechaFin: string
}
interface Empleado {
  id: string; nombres: string; apellidos: string; numeroDocumento: string
  centroCosto: string | null; programa: string | null; modalidad: string | null
  turnosCount: number
}
interface Concepto {
  id: string; codigo: string; nombre: string; categoria: string
  tipoImpacto: string; horaInicioDefecto: string | null; horaFinDefecto: string | null
  horasFijas: number | null; cruzaMedianoche: boolean; color: string | null; icono: string | null
}
interface AsignacionTurno {
  id: string; empleadoId: string; conceptoId: string; novedadId?: string | null
  fechaTurno: string; horaInicioPersonalizada?: string | null; horaFinPersonalizada?: string | null
  concepto: Concepto; novedad?: Concepto | null
}
type PendingEntry = {
  conceptoId: string; novedadId?: string | null
  horaInicio?: string | null; horaFin?: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants & helpers
// ─────────────────────────────────────────────────────────────────────────────

const FESTIVOS_CO = new Set([
  "2025-01-01","2025-01-06","2025-03-24","2025-04-17","2025-04-18",
  "2025-05-01","2025-06-02","2025-06-23","2025-06-30","2025-07-20",
  "2025-08-07","2025-08-18","2025-10-13","2025-11-03","2025-11-17",
  "2025-12-08","2025-12-25",
  "2026-01-01","2026-01-12","2026-03-23","2026-04-02","2026-04-03",
  "2026-05-01","2026-05-25","2026-06-15","2026-06-22","2026-06-29",
  "2026-07-20","2026-08-07","2026-08-17","2026-10-12","2026-11-02",
  "2026-11-16","2026-12-08","2026-12-25",
])

const DIAS_CORTO = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"]
const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
]

const ESTADOS_ABIERTOS  = ["BORRADOR","PENDIENTE"]
const ESTADOS_CERRADOS  = ["CALCULADO","APROBADO","CERRADO"]

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  BORRADOR:  { label:"Borrador",   color:"bg-slate-100 text-slate-700 border-slate-200",  icon:FileEdit    },
  PENDIENTE: { label:"Procesando", color:"bg-amber-100 text-amber-700 border-amber-200",   icon:RefreshCw   },
  CALCULADO: { label:"Calculado",  color:"bg-green-100 text-green-700 border-green-200",   icon:CheckCircle2 },
  APROBADO:  { label:"Aprobado",   color:"bg-teal-100 text-teal-700 border-teal-200",      icon:CheckCircle2 },
  CERRADO:   { label:"Cerrado",    color:"bg-blue-100 text-blue-700 border-blue-200",      icon:Lock         },
}

function isFestivoCO(dk: string): boolean {
  return FESTIVOS_CO.has(dk)
}
function isDomingo(dk: string): boolean {
  const [y,m,d] = dk.split("-").map(Number)
  return new Date(y, m-1, d, 12).getDay() === 0
}
function getDow(dk: string): number {
  const [y,m,d] = dk.split("-").map(Number)
  return new Date(y, m-1, d, 12).getDay()
}
function toDateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`
}
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}
function fmtLong(dk: string): string {
  const [y,m,d] = dk.split("-").map(Number)
  return `${DIAS_CORTO[getDow(dk)]} ${d} de ${MESES[m-1]} ${y}`
}
function fmtShort(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO",{ day:"numeric", month:"short", year:"numeric" })
}
function getConceptoHoras(c: Concepto, horaInicio?: string | null, horaFin?: string | null): number {
  if (c.horasFijas != null) return c.horasFijas
  const start = horaInicio || c.horaInicioDefecto
  const end   = horaFin   || c.horaFinDefecto
  if (start && end) {
    const [sh, sm] = start.split(":").map(Number)
    const [eh, em] = end.split(":").map(Number)
    let mins = (eh * 60 + em) - (sh * 60 + sm)
    if (mins <= 0) mins += 24 * 60
    return Math.round(mins / 6) / 10
  }
  return 8
}
function getMonthsInPeriodo(inicio: string, fin: string): { year: number; month: number }[] {
  const [sy,sm] = inicio.split("-").map(Number)
  const [ey,em] = fin.split("-").map(Number)
  const result: { year: number; month: number }[] = []
  let y = sy, m = sm
  while (y < ey || (y === ey && m <= em)) {
    result.push({ year: y, month: m - 1 })
    if (m === 12) { y++; m = 1 } else { m++ }
  }
  return result
}
function todayKey(): string {
  const n = new Date()
  return toDateKey(n.getFullYear(), n.getMonth()+1, n.getDate())
}
function getMondayOf(dk: string): string {
  const [y,m,d] = dk.split("-").map(Number)
  const dt  = new Date(y, m-1, d, 12)
  const dow = dt.getDay() // 0=Sun
  const offset = dow === 0 ? -6 : 1 - dow
  const mon = new Date(y, m-1, d + offset, 12)
  return toDateKey(mon.getFullYear(), mon.getMonth()+1, mon.getDate())
}
function getWeekDates(mondayDk: string): string[] {
  const [y,m,d] = mondayDk.split("-").map(Number)
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const dt = new Date(y, m-1, d+i, 12)
    dates.push(toDateKey(dt.getFullYear(), dt.getMonth()+1, dt.getDate()))
  }
  return dates
}

// ─────────────────────────────────────────────────────────────────────────────
// ConceptoPicker — modal grande con info completa
// ─────────────────────────────────────────────────────────────────────────────

function ConceptoPicker({
  date, conceptos, turnoId, novedadId, manualStart, manualEnd,
  onTurno, onTurnoQuick, onNovedad, onManualStart, onManualEnd,
  onClear, onClose, onConfirm,
}: {
  date: string; conceptos: Concepto[]
  turnoId: string | null; novedadId: string | null
  manualStart: string; manualEnd: string
  onTurno: (id: string | null) => void
  onTurnoQuick: (id: string) => void
  onNovedad: (id: string | null) => void
  onManualStart: (v: string) => void
  onManualEnd: (v: string) => void
  onClear: () => void; onClose: () => void; onConfirm: () => void
}) {
  const turnoConceptos   = conceptos.filter(c => c.categoria === "TURNO_LABORAL")
  const novedadConceptos = conceptos.filter(c => c.categoria !== "TURNO_LABORAL")
  const manualC = conceptos.find(c => c.codigo === "M")
  const isManualSel = turnoId === manualC?.id
  const festivo = isFestivoCO(date) || isDomingo(date)

  function horasLabel(c: Concepto): string {
    if (c.horasFijas != null) return `${c.horasFijas}h fijas`
    if (c.horaInicioDefecto && c.horaFinDefecto)
      return `${c.horaInicioDefecto} – ${c.horaFinDefecto}`
    return ""
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md border border-border flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className={`px-5 py-4 flex items-center justify-between shrink-0 ${
          festivo ? "bg-amber-50 border-b border-amber-200" : "bg-violet-50 border-b border-violet-200"
        }`}>
          <div>
            <p className="font-bold text-base text-gray-900">{fmtLong(date)}</p>
            {festivo && (
              <p className="text-xs font-medium mt-0.5 text-amber-700">
                {isDomingo(date) ? "🟠 Domingo" : "🔴 Festivo colombiano"}
              </p>
            )}
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-black/10 transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5">
          {/* ── Turnos ── */}
          <div className="space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-700">
              Tipo de turno
            </p>
            <div className="grid grid-cols-4 gap-2">
              {turnoConceptos.map(c => {
                const active = turnoId === c.id
                const isManual = c.codigo === "M"
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      if (active) { onTurno(null) }
                      else if (isManual) { onTurno(c.id) }
                      else { onTurnoQuick(c.id) }
                    }}
                    className={`
                      flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-2xl border-2
                      transition-all duration-150 text-center
                      ${active
                        ? "border-transparent text-white shadow-lg scale-[1.06]"
                        : "border-gray-200 hover:border-gray-400 bg-white hover:shadow-sm"
                      }
                    `}
                    style={active ? { backgroundColor: c.color ?? "#6366f1" } : {}}
                  >
                    <span className="text-3xl leading-none">{c.icono ?? "📋"}</span>
                    <span className={`text-sm font-extrabold leading-none tracking-tight ${active ? "" : "text-gray-900"}`}>
                      {c.codigo}
                    </span>
                    <span className={`text-[10px] leading-tight text-center ${active ? "opacity-90" : "text-gray-700"}`}>
                      {c.nombre.replace("Turno ", "")}
                    </span>
                    {horasLabel(c) && (
                      <span className={`text-[9px] leading-none ${active ? "opacity-70" : "text-gray-600"}`}>
                        {horasLabel(c)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Manual times ── */}
          {isManualSel && (
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-sky-50 border border-sky-200 p-3">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-sky-700 font-semibold">Hora inicio</Label>
                <Input type="time" value={manualStart} onChange={e => onManualStart(e.target.value)}
                  className="h-9 text-sm bg-white border-sky-300 focus:border-sky-500" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-sky-700 font-semibold">Hora fin</Label>
                <Input type="time" value={manualEnd} onChange={e => onManualEnd(e.target.value)}
                  className="h-9 text-sm bg-white border-sky-300 focus:border-sky-500" />
              </div>
            </div>
          )}

          {/* ── Novedades ── */}
          <div className="space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-700">
              Novedad / Ausencia
            </p>
            <div className="grid grid-cols-4 gap-2">
              {novedadConceptos.map(c => {
                const active = novedadId === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => onNovedad(active ? null : c.id)}
                    className={`
                      flex flex-col items-center gap-1 py-3 px-1 rounded-xl border-2
                      transition-all text-center
                      ${active
                        ? "border-transparent text-white shadow-md scale-[1.04]"
                        : "border-gray-200 hover:border-gray-400 bg-white"
                      }
                    `}
                    style={active ? { backgroundColor: c.color ?? "#94a3b8" } : {}}
                  >
                    <span className="text-2xl leading-none">{c.icono ?? "📋"}</span>
                    <span className={`text-[11px] font-bold leading-none ${active ? "" : "text-gray-900"}`}>
                      {c.codigo}
                    </span>
                    <span className={`text-[9px] leading-tight text-center line-clamp-2 ${active ? "opacity-85" : "text-gray-700"}`}>
                      {c.nombre}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t bg-gray-50/80 flex items-center justify-between gap-3 shrink-0">
          <Button size="sm" variant="ghost"
            className="gap-1.5 text-muted-foreground h-9 text-sm"
            onClick={onClear}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Limpiar día
          </Button>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-9" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="h-9 px-5 bg-violet-600 hover:bg-violet-700 gap-1.5"
              disabled={!turnoId && !novedadId}
              onClick={onConfirm}
            >
              <CheckSquare className="h-4 w-4" />
              Confirmar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ClosedPeriodView — turnos de solo lectura por empleado
// ─────────────────────────────────────────────────────────────────────────────

function ClosedPeriodView({
  empleados, allShifts, conceptos, loading, periodStart, periodEnd,
}: {
  empleados: Empleado[]
  allShifts: Record<string, AsignacionTurno[]>
  conceptos: Concepto[]
  loading: boolean
  periodStart: string
  periodEnd: string
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setExpanded(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  function expandAll()   { setExpanded(new Set(empleados.map(e => e.id))) }
  function collapseAll() { setExpanded(new Set()) }

  if (loading) return (
    <div className="space-y-2">
      {[1,2,3,4].map(i => <div key={i} className="h-14 bg-muted/40 rounded-xl animate-pulse" />)}
    </div>
  )

  // Build sorted list of all dates in the period
  const allDates: string[] = []
  {
    const [sy,sm,sd] = periodStart.split("-").map(Number)
    const [ey,em,ed] = periodEnd.split("-").map(Number)
    const cursor = new Date(sy, sm-1, sd, 12)
    const end    = new Date(ey, em-1, ed, 12)
    while (cursor <= end) {
      allDates.push(toDateKey(cursor.getFullYear(), cursor.getMonth()+1, cursor.getDate()))
      cursor.setDate(cursor.getDate() + 1)
    }
  }

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-blue-600" />
          <p className="text-sm font-semibold text-blue-800">Período cerrado — solo lectura</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={expandAll}>
            <ChevronDown className="h-3 w-3" /> Expandir todos
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={collapseAll}>
            <ChevronUp className="h-3 w-3" /> Colapsar todos
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Empleados", value: empleados.length },
          { label: "Días en período", value: allDates.length },
          {
            label: "Turnos asignados",
            value: Object.values(allShifts).reduce((s, arr) => s + arr.length, 0),
          },
        ].map(({ label, value }) => (
          <div key={label} className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-center">
            <p className="text-[10px] text-blue-600 uppercase tracking-wide font-semibold">{label}</p>
            <p className="font-bold text-xl text-blue-800">{value}</p>
          </div>
        ))}
      </div>

      {/* Employee accordions */}
      {empleados.map(emp => {
        const shifts = allShifts[emp.id] ?? []
        const isOpen = expanded.has(emp.id)
        const shiftMap: Record<string, AsignacionTurno> = {}
        shifts.forEach(s => { shiftMap[s.fechaTurno.substring(0,10)] = s })

        // Initials
        const initials = `${emp.nombres[0]}${emp.apellidos[0]}`.toUpperCase()
        const colors = ["#6366f1","#8b5cf6","#3b82f6","#0ea5e9","#10b981","#f59e0b","#ef4444","#ec4899"]
        const colorIdx = (emp.nombres.charCodeAt(0) + emp.apellidos.charCodeAt(0)) % colors.length
        const avatarColor = colors[colorIdx]

        // Predominant concept
        const counts: Record<string, number> = {}
        shifts.forEach(s => { counts[s.concepto.codigo] = (counts[s.concepto.codigo] ?? 0) + 1 })
        const topCodigo = Object.entries(counts).sort((a,b) => b[1]-a[1])[0]?.[0]
        const topC = topCodigo ? conceptos.find(c => c.codigo === topCodigo) : null

        return (
          <div key={emp.id}
            className="rounded-xl border border-border overflow-hidden transition-all"
            style={{ borderLeftWidth: 3, borderLeftColor: avatarColor }}
          >
            {/* Accordion header */}
            <button
              onClick={() => toggle(emp.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors text-left"
            >
              {/* Avatar */}
              <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: avatarColor }}
              >
                {initials}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{emp.nombres} {emp.apellidos}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {emp.centroCosto && <span>{emp.centroCosto}</span>}
                  {emp.programa    && <span className="ml-1">· {emp.programa}</span>}
                  {emp.modalidad   && <span className="ml-1">· {emp.modalidad}</span>}
                </p>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-1.5 shrink-0">
                {topC && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full text-white font-bold"
                    style={{ backgroundColor: topC.color ?? "#6366f1" }}
                  >
                    {topC.icono} {topC.codigo}
                  </span>
                )}
                <Badge variant="outline" className="text-[10px]">
                  {shifts.length} turno{shifts.length !== 1 ? "s" : ""}
                </Badge>
                {isOpen
                  ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                }
              </div>
            </button>

            {/* Accordion body — mini calendar */}
            {isOpen && (
              <div className="px-4 pb-4 pt-1 border-t bg-muted/5">
                {shifts.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    Sin turnos registrados en este período.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {allDates.map(dk => {
                      const s = shiftMap[dk]
                      const [,, d] = dk.split("-")
                      const dom = isDomingo(dk)
                      const fest = isFestivoCO(dk)

                      if (!s) return (
                        <div key={dk}
                          className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center border text-[10px] ${
                            dom || fest ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-gray-50 border-gray-200 text-gray-400"
                          }`}
                        >
                          <span className="font-medium">{parseInt(d)}</span>
                          {(dom||fest) && <span className="text-[8px]">{dom?"Dom":"F"}</span>}
                        </div>
                      )

                      return (
                        <div
                          key={dk}
                          title={`${dk}: [${s.concepto.codigo}] ${s.concepto.nombre}${s.novedad ? ` + ${s.novedad.nombre}` : ""}`}
                          className="w-10 h-10 rounded-lg flex flex-col items-center justify-center text-white text-[10px] font-bold shadow-sm"
                          style={{ backgroundColor: s.concepto.color ?? "#6366f1" }}
                        >
                          <span className="text-[11px] font-bold">{parseInt(d)}</span>
                          <span className="text-[9px] opacity-90">{s.concepto.codigo}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Shift count breakdown */}
                {shifts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {Object.entries(counts).map(([codigo, cnt]) => {
                      const c = conceptos.find(x => x.codigo === codigo)
                      return (
                        <span key={codigo}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: c?.color ?? "#6366f1" }}
                        >
                          {c?.icono} {codigo}: {cnt}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ProgramacionMasivaPage() {
  // ── Init data ──
  const [periodos, setPeriodos]     = useState<Periodo[]>([])
  const [conceptos, setConceptos]   = useState<Concepto[]>([])
  const [loadingInit, setLoadingInit] = useState(true)

  // ── Period tabs ──
  const [periodTab, setPeriodTab] = useState<"abiertos"|"cerrados">("abiertos")

  // ── Period selection ──
  const [selectedPeriodoId, setSelectedPeriodoId] = useState("")

  // ── Employees ──
  const [empleados, setEmpleados]       = useState<Empleado[]>([])
  const [loadingEmps, setLoadingEmps]   = useState(false)
  const [filterCC, setFilterCC]         = useState("")
  const [filterProg, setFilterProg]     = useState("")
  const [filterMod, setFilterMod]       = useState("")
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set())
  const [empPanelOpen, setEmpPanelOpen] = useState(true)

  // ── Closed period view ──
  const [allShifts, setAllShifts]       = useState<Record<string, AsignacionTurno[]>>({})
  const [loadingShifts, setLoadingShifts] = useState(false)

  // ── Calendar ──
  const [vista, setVista]         = useState<"mensual"|"semanal"|"diario">("mensual")
  const [diaActual, setDiaActual] = useState("")
  const [semanaInicio, setSemanaInicio] = useState("")

  // ── Employee preview modal ──
  const [previewEmpId, setPreviewEmpId]     = useState<string | null>(null)
  const [previewShifts, setPreviewShifts]   = useState<AsignacionTurno[]>([])
  const [loadingPreview, setLoadingPreview] = useState(false)

  // ── Edit mode cancel state ──
  const [preEditState, setPreEditState] = useState<{
    pendingMap: Record<string, PendingEntry>
    selectedIds: Set<string>
  } | null>(null)

  // ── Pending map ──
  const [pendingMap, setPendingMap] = useState<Record<string, PendingEntry>>({})

  // ── Picker ──
  const [pickerDate, setPickerDate]       = useState<string | null>(null)
  const [pickerTurnoId, setPickerTurnoId]     = useState<string | null>(null)
  const [pickerNovedadId, setPickerNovedadId] = useState<string | null>(null)
  const [manualStart, setManualStart]     = useState("07:00")
  const [manualEnd, setManualEnd]         = useState("19:00")

  // ── Save ──
  const [saving, setSaving] = useState(false)

  // ── Load periods + concepts ──
  useEffect(() => {
    Promise.all([
      fetch("/api/payroll/periods").then(r => r.json()),
      fetch("/api/concepts").then(r => r.json()),
    ]).then(([pers, concs]) => {
      setPeriodos(Array.isArray(pers) ? pers : [])
      setConceptos(Array.isArray(concs) ? concs : [])
    }).catch(() => toast.error("Error al cargar datos"))
    .finally(() => setLoadingInit(false))
  }, [])

  // ── Load employees when period changes ──
  useEffect(() => {
    if (!selectedPeriodoId) { setEmpleados([]); return }
    setLoadingEmps(true)
    setSelectedIds(new Set())
    setPendingMap({})
    setAllShifts({})
    fetch(`/api/payroll/periods/${selectedPeriodoId}/employees`)
      .then(r => r.json())
      .then(data => {
        setEmpleados(data.empleados ?? [])
        const p = periodos.find(p => p.id === selectedPeriodoId)
        if (p) {
          const pi = p.fechaInicio.substring(0,10)
          setDiaActual(pi)
          setSemanaInicio(getMondayOf(pi))
        }
      })
      .catch(() => toast.error("Error al cargar empleados"))
      .finally(() => setLoadingEmps(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriodoId])

  // ── Fetch shifts for CLOSED periods ──
  useEffect(() => {
    const p = periodos.find(x => x.id === selectedPeriodoId)
    if (!p || !ESTADOS_CERRADOS.includes(p.estadoPeriodo)) return
    if (empleados.length === 0) return

    const start = p.fechaInicio.substring(0,10)
    const end   = p.fechaFin.substring(0,10)
    setLoadingShifts(true)

    Promise.all(
      empleados.map(emp =>
        fetch(`/api/schedules?startDate=${start}&endDate=${end}&empleadoId=${emp.id}`)
          .then(r => r.ok ? r.json() : [])
          .catch(() => [] as AsignacionTurno[])
      )
    ).then(results => {
      const map: Record<string, AsignacionTurno[]> = {}
      empleados.forEach((emp, i) => { map[emp.id] = results[i] ?? [] })
      setAllShifts(map)
    }).finally(() => setLoadingShifts(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriodoId, empleados])

  // ── Derived ──
  const selectedPeriodo = periodos.find(p => p.id === selectedPeriodoId)
  const periodStart = selectedPeriodo?.fechaInicio.substring(0,10) ?? ""
  const periodEnd   = selectedPeriodo?.fechaFin.substring(0,10)   ?? ""
  const isClosed    = selectedPeriodo ? ESTADOS_CERRADOS.includes(selectedPeriodo.estadoPeriodo) : false

  const inPeriod = useCallback((dk: string) =>
    !!periodStart && !!periodEnd && dk >= periodStart && dk <= periodEnd,
  [periodStart, periodEnd])

  // Period tab lists
  const periodosAbiertos = periodos.filter(p => ESTADOS_ABIERTOS.includes(p.estadoPeriodo))
  const periodosCerrados = periodos.filter(p => ESTADOS_CERRADOS.includes(p.estadoPeriodo))
  const visiblePeriodos  = periodTab === "abiertos" ? periodosAbiertos : periodosCerrados

  // Employee filters
  const uniqueCentros     = Array.from(new Set(empleados.map(e => e.centroCosto).filter(Boolean))) as string[]
  const uniqueProgramas   = Array.from(new Set(empleados.map(e => e.programa).filter(Boolean)))    as string[]
  const uniqueModalidades = Array.from(new Set(empleados.map(e => e.modalidad).filter(Boolean)))   as string[]

  const filteredEmpleados = empleados.filter(e => {
    if (filterCC   && e.centroCosto !== filterCC)   return false
    if (filterProg && e.programa    !== filterProg)  return false
    if (filterMod  && e.modalidad   !== filterMod)   return false
    return true
  })

  const targetEmpleados = empleados.filter(e => selectedIds.has(e.id))

  const pendingDays = Object.keys(pendingMap)
  const totalTurnos = targetEmpleados.length * pendingDays.length

  // Hours progress bar
  const horasStats = (() => {
    let ord = 0, ext = 0
    for (const entry of Object.values(pendingMap)) {
      const c = conceptos.find(x => x.id === entry.conceptoId)
      if (!c) continue
      const h = getConceptoHoras(c, entry.horaInicio, entry.horaFin)
      ord += Math.min(h, 8)
      ext += Math.max(0, h - 8)
    }
    return {
      ordinarias: Math.round(ord * 10) / 10,
      extra:      Math.round(ext * 10) / 10,
      total:      Math.round((ord + ext) * 10) / 10,
    }
  })()
  const periodDays = (periodStart && periodEnd) ? (() => {
    const [sy,sm,sd] = periodStart.split("-").map(Number)
    const [ey,em,ed] = periodEnd.split("-").map(Number)
    return Math.round(
      (new Date(ey,em-1,ed,12).getTime() - new Date(sy,sm-1,sd,12).getTime())
      / (1000*60*60*24)
    ) + 1
  })() : 0
  // floor(días/7) × 44 → solo semanas completas; 30 días = 176h, domingo = descanso
  const maxHorasPeriodo = Math.floor(periodDays / 7) * 44
  const pctOrd  = maxHorasPeriodo > 0 ? Math.min(100, (horasStats.ordinarias / maxHorasPeriodo) * 100) : 0
  const pctExt  = maxHorasPeriodo > 0 ? Math.min(100 - pctOrd, (horasStats.extra / maxHorasPeriodo) * 100) : 0

  // ── Employee helpers ──
  function toggleEmp(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  function seleccionarTodos() {
    setSelectedIds(new Set(filteredEmpleados.map(e => e.id)))
  }
  function quitarTodos() {
    setSelectedIds(new Set())
  }
  function limpiarFiltros() {
    setFilterCC(""); setFilterProg(""); setFilterMod("")
    setSelectedIds(new Set())
  }
  function isChecked(emp: Empleado) {
    return selectedIds.has(emp.id)
  }

  // ── Employee preview ──
  async function openEmpPreview(emp: Empleado) {
    setPreviewEmpId(emp.id)
    setPreviewShifts([])
    setLoadingPreview(true)
    try {
      const res = await fetch(`/api/schedules?startDate=${periodStart}&endDate=${periodEnd}&empleadoId=${emp.id}`)
      if (res.ok) setPreviewShifts(await res.json())
    } catch {
      // silent
    } finally {
      setLoadingPreview(false)
    }
  }
  function editarTurnosEmp(emp: Empleado) {
    setPreEditState({ pendingMap: { ...pendingMap }, selectedIds: new Set(selectedIds) })
    const newMap: Record<string, PendingEntry> = {}
    previewShifts.forEach(s => {
      newMap[s.fechaTurno.substring(0, 10)] = {
        conceptoId: s.conceptoId,
        novedadId:  s.novedadId  ?? null,
        horaInicio: s.horaInicioPersonalizada ?? null,
        horaFin:    s.horaFinPersonalizada    ?? null,
      }
    })
    setPendingMap(newMap)
    setSelectedIds(new Set([emp.id]))
    setPreviewEmpId(null)
  }
  function cancelarEdicion() {
    if (!preEditState) return
    setPendingMap(preEditState.pendingMap)
    setSelectedIds(preEditState.selectedIds)
    setPreEditState(null)
  }

  // ── Week navigation ──
  function prevWeek() {
    if (!semanaInicio || !periodStart) return
    const [y,m,d] = semanaInicio.split("-").map(Number)
    const prev = new Date(y, m-1, d-7, 12)
    const dk = toDateKey(prev.getFullYear(), prev.getMonth()+1, prev.getDate())
    if (dk >= getMondayOf(periodStart)) setSemanaInicio(dk)
  }
  function nextWeek() {
    if (!semanaInicio || !periodEnd) return
    const [y,m,d] = semanaInicio.split("-").map(Number)
    const next = new Date(y, m-1, d+7, 12)
    const dk = toDateKey(next.getFullYear(), next.getMonth()+1, next.getDate())
    if (dk <= periodEnd) setSemanaInicio(dk)
  }

  // ── Picker helpers ──
  function openPicker(dk: string) {
    if (!inPeriod(dk)) return
    const existing = pendingMap[dk]
    if (existing) {
      const mainC = conceptos.find(c => c.id === existing.conceptoId)
      const isTurno = mainC?.categoria === "TURNO_LABORAL"
      setPickerTurnoId(isTurno ? existing.conceptoId : null)
      setPickerNovedadId(existing.novedadId ?? (!isTurno ? existing.conceptoId : null))
      setManualStart(existing.horaInicio ?? "07:00")
      setManualEnd(existing.horaFin     ?? "19:00")
    } else {
      setPickerTurnoId(null); setPickerNovedadId(null)
      setManualStart("07:00"); setManualEnd("19:00")
    }
    setPickerDate(dk)
  }
  function closePicker() {
    setPickerDate(null); setPickerTurnoId(null); setPickerNovedadId(null)
  }
  function clearPickerDay() {
    if (!pickerDate) return
    setPendingMap(prev => { const n = {...prev}; delete n[pickerDate]; return n })
    closePicker()
  }
  function confirmPicker() {
    if (!pickerDate) return
    if (!pickerTurnoId && !pickerNovedadId) { clearPickerDay(); return }
    const primaryId   = pickerTurnoId || pickerNovedadId!
    const secondaryId = pickerTurnoId ? pickerNovedadId : null
    const manualC     = conceptos.find(c => c.codigo === "M")
    const isM         = pickerTurnoId === manualC?.id
    setPendingMap(prev => ({
      ...prev,
      [pickerDate]: {
        conceptoId: primaryId,
        novedadId:  secondaryId,
        horaInicio: isM ? manualStart : null,
        horaFin:    isM ? manualEnd   : null,
      },
    }))
    closePicker()
  }
  function turnoQuickConfirm(cId: string) {
    if (!pickerDate) return
    setPendingMap(prev => ({
      ...prev,
      [pickerDate]: {
        conceptoId: cId,
        novedadId:  pickerNovedadId ?? null,
        horaInicio: null,
        horaFin:    null,
      },
    }))
    closePicker()
  }

  // ── Daily nav ──
  function prevDay() {
    if (!diaActual || !periodStart) return
    const [y,m,d] = diaActual.split("-").map(Number)
    const prev = new Date(y, m-1, d-1, 12)
    const dk = toDateKey(prev.getFullYear(), prev.getMonth()+1, prev.getDate())
    if (dk >= periodStart) setDiaActual(dk)
  }
  function nextDay() {
    if (!diaActual || !periodEnd) return
    const [y,m,d] = diaActual.split("-").map(Number)
    const next = new Date(y, m-1, d+1, 12)
    const dk = toDateKey(next.getFullYear(), next.getMonth()+1, next.getDate())
    if (dk <= periodEnd) setDiaActual(dk)
  }

  // ── Save ──
  async function handleSave() {
    if (pendingDays.length === 0)     return toast.info("No hay días marcados en el calendario")
    if (targetEmpleados.length === 0) return toast.error("Selecciona al menos un empleado")
    setSaving(true)
    try {
      const asignaciones = targetEmpleados.flatMap(emp =>
        pendingDays.map(fecha => ({
          empleadoId: emp.id, fechaTurno: fecha,
          conceptoId: pendingMap[fecha].conceptoId,
          novedadId:  pendingMap[fecha].novedadId  ?? null,
          horaInicioPersonalizada: pendingMap[fecha].horaInicio ?? null,
          horaFinPersonalizada:    pendingMap[fecha].horaFin    ?? null,
        }))
      )
      const res = await fetch("/api/schedules/batch", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asignaciones, eliminaciones: [] }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(data.message ?? `${totalTurnos} turnos guardados correctamente`)
        setPendingMap({})
        setPreEditState(null)
      } else {
        const err = await res.json()
        toast.error(err.error ?? "Error al guardar turnos")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setSaving(false)
    }
  }

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loadingInit) return (
    <div className="space-y-4">
      <div className="h-20 bg-muted rounded-xl animate-pulse" />
      <div className="h-48 bg-muted rounded-xl animate-pulse" />
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // Monthly calendar
  // ─────────────────────────────────────────────────────────────────────────

  function renderMonthCalendar() {
    if (!periodStart || !periodEnd) return null
    const months   = getMonthsInPeriodo(periodStart, periodEnd)
    const today    = todayKey()

    return (
      <div className="space-y-8">
        {months.map(({ year, month }) => {
          const totalDays = daysInMonth(year, month)
          const firstDow  = new Date(year, month, 1, 12).getDay()

          return (
            <div key={`${year}-${month}`}>
              <h3 className="font-bold text-sm mb-3 text-foreground">
                {MESES[month]} {year}
              </h3>

              {/* Headers */}
              <div className="grid grid-cols-7 mb-1">
                {DIAS_CORTO.map((d,i) => (
                  <div key={d} className={`text-center text-[10px] font-bold uppercase tracking-wider py-1 ${i===0?"text-amber-600":"text-muted-foreground"}`}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDow }).map((_,i) => <div key={`e${i}`} />)}

                {Array.from({ length: totalDays }).map((_,i) => {
                  const day     = i + 1
                  const dk      = toDateKey(year, month+1, day)
                  const inside  = inPeriod(dk)
                  const festivo = isFestivoCO(dk)
                  const dom     = isDomingo(dk)
                  const isToday = dk === today
                  const pending = pendingMap[dk]
                  const pC      = pending ? conceptos.find(c => c.id === pending.conceptoId) : null
                  const pN      = pending?.novedadId ? conceptos.find(c => c.id === pending.novedadId) : null

                  return (
                    <button
                      key={dk}
                      onClick={() => inside ? openPicker(dk) : undefined}
                      disabled={!inside}
                      className={`
                        relative min-h-[62px] rounded-xl border-2 text-left p-1.5
                        flex flex-col items-start gap-0.5 transition-all duration-100
                        ${inside
                          ? "cursor-pointer hover:border-violet-500 hover:shadow-lg active:scale-[0.96]"
                          : "cursor-default opacity-20 pointer-events-none"
                        }
                        ${dom || festivo
                          ? "bg-amber-50/80 border-amber-300"
                          : "bg-white border-gray-200"
                        }
                        ${isToday ? "ring-2 ring-violet-500 ring-offset-1 border-transparent" : ""}
                        ${pC ? "border-violet-400 shadow-md" : ""}
                      `}
                    >
                      <span className={`text-[11px] font-bold leading-none ${
                        dom ? "text-amber-700" : festivo ? "text-rose-600" : "text-foreground"
                      }`}>
                        {day}
                      </span>
                      {dom && <span className="text-[8px] text-amber-600 leading-none font-semibold">Dom</span>}
                      {festivo && !dom && <span className="text-[8px] text-rose-500 leading-none font-semibold">Fest</span>}

                      {pC && (
                        <div className="mt-auto w-full">
                          <span
                            className="block w-full text-center rounded-lg text-[10px] font-extrabold leading-tight py-1 text-white"
                            style={{ backgroundColor: pC.color ?? "#6366f1" }}
                          >
                            {pC.icono} {pC.codigo}
                          </span>
                          {pN && (
                            <span
                              className="block w-full text-center rounded-md text-[9px] font-bold leading-tight py-0.5 mt-0.5 text-white opacity-90"
                              style={{ backgroundColor: pN.color ?? "#94a3b8" }}
                            >
                              +{pN.codigo}
                            </span>
                          )}
                        </div>
                      )}
                      {inside && !pC && (
                        <span className="mt-auto text-[18px] text-muted-foreground/25 leading-none self-center">+</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Daily view
  // ─────────────────────────────────────────────────────────────────────────

  function renderDailyView() {
    const dk = diaActual
    if (!dk) return null
    const festivo  = isFestivoCO(dk)
    const dom      = isDomingo(dk)
    const inside   = inPeriod(dk)
    const pending  = pendingMap[dk]
    const pC       = pending ? conceptos.find(c => c.id === pending.conceptoId) : null
    const pN       = pending?.novedadId ? conceptos.find(c => c.id === pending.novedadId) : null
    const turnoConceptos   = conceptos.filter(c => c.categoria === "TURNO_LABORAL")
    const novedadConceptos = conceptos.filter(c => c.categoria !== "TURNO_LABORAL")
    const manualC = conceptos.find(c => c.codigo === "M")

    function setTurnoInline(cId: string) {
      const current = pendingMap[dk]
      const nov = current?.novedadId ?? null
      const isM = cId === manualC?.id
      if (current?.conceptoId === cId) {
        // deselect
        if (nov) setPendingMap(prev => ({...prev, [dk]: { conceptoId: nov, novedadId: null }}))
        else setPendingMap(prev => { const n = {...prev}; delete n[dk]; return n })
      } else {
        setPendingMap(prev => ({
          ...prev,
          [dk]: {
            conceptoId: cId, novedadId: nov,
            horaInicio: isM ? (current?.horaInicio ?? "07:00") : null,
            horaFin:    isM ? (current?.horaFin    ?? "19:00") : null,
          },
        }))
      }
    }

    function setNovedadInline(cId: string) {
      const current = pendingMap[dk]
      const mainIsT = current?.conceptoId && conceptos.find(x => x.id === current.conceptoId)?.categoria === "TURNO_LABORAL"
      if (current?.novedadId === cId) {
        if (mainIsT) setPendingMap(prev => ({...prev, [dk]: { ...prev[dk], novedadId: null }}))
        else setPendingMap(prev => { const n = {...prev}; delete n[dk]; return n })
      } else {
        if (mainIsT) {
          setPendingMap(prev => ({...prev, [dk]: { ...prev[dk], novedadId: cId }}))
        } else {
          setPendingMap(prev => ({...prev, [dk]: { conceptoId: cId, novedadId: null }}))
        }
      }
    }

    return (
      <div className="space-y-4">
        {/* Day nav */}
        <div className="flex items-center justify-between gap-3">
          <Button size="sm" variant="outline" onClick={prevDay}
            disabled={dk <= periodStart} className="gap-1 h-9">
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
          <div className="text-center">
            <p className="font-bold text-base">{fmtLong(dk)}</p>
            {(festivo || dom) && (
              <Badge variant="outline" className="mt-1 border-amber-300 text-amber-700 bg-amber-50 text-[10px]">
                {dom ? "Domingo" : "Festivo"}
              </Badge>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={nextDay}
            disabled={dk >= periodEnd} className="gap-1 h-9">
            Siguiente <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {!inside ? (
          <div className="rounded-xl border bg-muted/10 flex flex-col items-center py-8 gap-2 text-muted-foreground">
            <AlertCircle className="h-8 w-8 opacity-20" />
            <p className="text-sm">Fuera del período</p>
          </div>
        ) : (
          <>
            {/* Current */}
            {pC ? (
              <div className="rounded-2xl p-4 flex items-center justify-between gap-3 text-white shadow-lg"
                style={{ background: `linear-gradient(135deg, ${pC.color ?? "#6366f1"}, ${pC.color ?? "#6366f1"}aa)` }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{pC.icono}</span>
                  <div>
                    <p className="font-extrabold text-xl leading-none">[{pC.codigo}]</p>
                    <p className="text-sm opacity-90">{pC.nombre}</p>
                    {pN && <p className="text-xs opacity-75 mt-0.5">+ {pN.icono} {pN.nombre}</p>}
                    {pC.codigo === "M" && pending.horaInicio && (
                      <p className="text-xs opacity-80 mt-0.5">{pending.horaInicio} – {pending.horaFin}</p>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => {
                  setPendingMap(prev => { const n={...prev}; delete n[dk]; return n })
                }} className="text-white hover:bg-white/20 border border-white/40 gap-1.5">
                  <Trash2 className="h-3.5 w-3.5" /> Quitar
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/30 flex flex-col items-center py-5 gap-1.5 text-muted-foreground">
                <Calendar className="h-7 w-7 opacity-30" />
                <p className="text-sm">Sin turno asignado</p>
              </div>
            )}

            {/* Turno picker inline */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-700">Tipo de turno</p>
              <div className="grid grid-cols-4 gap-2">
                {turnoConceptos.map(c => {
                  const active = pC?.id === c.id
                  const label  = c.horaInicioDefecto && c.horaFinDefecto
                    ? `${c.horaInicioDefecto}–${c.horaFinDefecto}`
                    : c.nombre.replace("Turno ","")
                  return (
                    <button key={c.id} onClick={() => setTurnoInline(c.id)}
                      className={`flex flex-col items-center gap-1.5 py-4 rounded-2xl border-2 transition-all ${
                        active
                          ? "border-transparent text-white shadow-lg scale-[1.04]"
                          : "border-gray-200 hover:border-gray-400 bg-white hover:shadow-sm"
                      }`}
                      style={active ? { backgroundColor: c.color ?? "#6366f1" } : {}}
                    >
                      <span className="text-3xl leading-none">{c.icono}</span>
                      <span className={`text-sm font-extrabold ${active ? "" : "text-gray-900"}`}>{c.codigo}</span>
                      <span className={`text-[9px] ${active ? "opacity-85" : "text-gray-600"}`}>{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Manual times */}
            {pC?.codigo === "M" && (
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-sky-50 border border-sky-200 p-3">
                <div className="space-y-1">
                  <Label className="text-xs text-sky-700 font-semibold">Hora inicio</Label>
                  <Input type="time" value={pending?.horaInicio ?? "07:00"}
                    onChange={e => setPendingMap(prev => ({...prev, [dk]: {...prev[dk], horaInicio: e.target.value}}))}
                    className="h-9 bg-white border-sky-300" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-sky-700 font-semibold">Hora fin</Label>
                  <Input type="time" value={pending?.horaFin ?? "19:00"}
                    onChange={e => setPendingMap(prev => ({...prev, [dk]: {...prev[dk], horaFin: e.target.value}}))}
                    className="h-9 bg-white border-sky-300" />
                </div>
              </div>
            )}

            {/* Novedad inline */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-700">Novedad / Ausencia</p>
              <div className="grid grid-cols-4 gap-2">
                {novedadConceptos.map(c => {
                  const active = pN?.id === c.id
                  return (
                    <button key={c.id} onClick={() => setNovedadInline(c.id)}
                      className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all ${
                        active
                          ? "border-transparent text-white shadow-md scale-[1.03]"
                          : "border-gray-200 hover:border-gray-400 bg-white"
                      }`}
                      style={active ? { backgroundColor: c.color ?? "#94a3b8" } : {}}
                    >
                      <span className="text-2xl leading-none">{c.icono}</span>
                      <span className={`text-[11px] font-bold ${active?"":"text-gray-900"}`}>{c.codigo}</span>
                      <span className={`text-[9px] leading-tight text-center line-clamp-1 ${active?"opacity-85":"text-gray-600"}`}>{c.nombre}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Weekly view
  // ─────────────────────────────────────────────────────────────────────────

  function renderWeekView() {
    if (!semanaInicio) return null
    const weekDates = getWeekDates(semanaInicio)
    const today = todayKey()

    return (
      <div className="space-y-3">
        {/* Week navigation */}
        <div className="flex items-center justify-between gap-3">
          <Button size="sm" variant="outline" onClick={prevWeek}
            disabled={semanaInicio <= getMondayOf(periodStart)} className="gap-1 h-9">
            <ChevronLeft className="h-4 w-4" /> Sem. anterior
          </Button>
          <div className="text-center">
            <p className="font-bold text-sm">
              {weekDates[0].split("-").reverse().slice(0,2).join("/")} – {weekDates[6].split("-").reverse().slice(0,2).join("/")} · {MESES[parseInt(weekDates[0].split("-")[1])-1]}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={nextWeek}
            disabled={semanaInicio > periodEnd} className="gap-1 h-9">
            Sem. siguiente <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* 7-column grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {weekDates.map(dk => {
            const inside  = inPeriod(dk)
            const festivo = isFestivoCO(dk)
            const dom     = isDomingo(dk)
            const isToday = dk === today
            const pending = pendingMap[dk]
            const pC = pending ? conceptos.find(c => c.id === pending.conceptoId) : null
            const pN = pending?.novedadId ? conceptos.find(c => c.id === pending.novedadId) : null
            const dow = getDow(dk)
            const [,,d] = dk.split("-")

            return (
              <button
                key={dk}
                onClick={() => inside ? openPicker(dk) : undefined}
                disabled={!inside}
                className={`
                  relative min-h-[100px] rounded-xl border text-center p-2
                  flex flex-col items-center gap-1 transition-all duration-100
                  ${inside
                    ? "cursor-pointer hover:border-violet-400 hover:shadow-md active:scale-[0.96]"
                    : "cursor-default opacity-25 pointer-events-none"
                  }
                  ${dom || festivo ? "bg-amber-50/80 border-amber-200" : "bg-white border-border/60"}
                  ${isToday ? "ring-2 ring-violet-500 ring-offset-1 border-transparent" : ""}
                  ${pC ? "border-violet-300 shadow-sm" : ""}
                `}
              >
                <span className={`text-[10px] font-bold uppercase tracking-wide ${
                  dom ? "text-amber-600" : "text-muted-foreground"
                }`}>
                  {DIAS_CORTO[dow]}
                </span>
                <span className={`text-xl font-extrabold leading-none ${
                  dom ? "text-amber-700" : festivo ? "text-rose-600" : "text-foreground"
                }`}>
                  {parseInt(d)}
                </span>
                {festivo && !dom && (
                  <span className="text-[8px] text-rose-500 font-semibold">Fest</span>
                )}
                {pC ? (
                  <div className="mt-auto w-full space-y-0.5">
                    <span
                      className="block w-full text-center rounded-lg text-[10px] font-extrabold py-1 text-white leading-tight"
                      style={{ backgroundColor: pC.color ?? "#6366f1" }}
                    >
                      {pC.icono} {pC.codigo}
                    </span>
                    {pN && (
                      <span
                        className="block w-full text-center rounded-md text-[9px] font-bold py-0.5 text-white opacity-90"
                        style={{ backgroundColor: pN.color ?? "#94a3b8" }}
                      >
                        +{pN.codigo}
                      </span>
                    )}
                  </div>
                ) : inside ? (
                  <span className="mt-auto text-[22px] text-muted-foreground/20 leading-none">+</span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-violet-600" />
            <h1 className="text-2xl font-bold">Programación Masiva</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Selecciona empleados, marca días en el calendario y guarda en bloque
          </p>
        </div>
        {selectedPeriodo && !isClosed && (
          <Button
            onClick={handleSave}
            disabled={saving || pendingDays.length === 0 || targetEmpleados.length === 0}
            className="gap-2 bg-violet-600 hover:bg-violet-700 shrink-0 h-10 px-5"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving
              ? "Guardando..."
              : totalTurnos > 0
                ? `Guardar ${totalTurnos} turnos`
                : "Guardar"
            }
          </Button>
        )}
      </div>

      {/* ── Step 1: Period selector with tabs ── */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-3">
          {/* Tab row */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <CalendarRange className="h-3.5 w-3.5" />
              1. Selecciona un período
            </p>
            <div className="flex bg-muted rounded-lg p-0.5">
              <button
                onClick={() => { setPeriodTab("abiertos"); setSelectedPeriodoId("") }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  periodTab === "abiertos"
                    ? "bg-white shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileEdit className="h-3 w-3" />
                En Proceso
                {periodosAbiertos.length > 0 && (
                  <Badge className="h-4 px-1 text-[9px] bg-violet-600 text-white">{periodosAbiertos.length}</Badge>
                )}
              </button>
              <button
                onClick={() => { setPeriodTab("cerrados"); setSelectedPeriodoId("") }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  periodTab === "cerrados"
                    ? "bg-white shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Lock className="h-3 w-3" />
                Calculado / Cerrado
                {periodosCerrados.length > 0 && (
                  <Badge className="h-4 px-1 text-[9px] bg-blue-600 text-white">{periodosCerrados.length}</Badge>
                )}
              </button>
            </div>
          </div>

          {visiblePeriodos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              {periodTab === "abiertos"
                ? "No hay períodos en proceso. Crea uno en Nómina → Períodos."
                : "No hay períodos calculados o cerrados aún."
              }
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {visiblePeriodos.map(p => {
                const cfg = STATUS_CONFIG[p.estadoPeriodo] ?? STATUS_CONFIG.BORRADOR
                const Icon = cfg.icon
                const isSelected = p.id === selectedPeriodoId
                const isCerradoP = ESTADOS_CERRADOS.includes(p.estadoPeriodo)
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPeriodoId(p.id === selectedPeriodoId ? "" : p.id)}
                    className={`text-left px-3 py-2.5 rounded-xl border transition-all ${
                      isSelected
                        ? isCerradoP
                          ? "border-blue-400 bg-blue-50 ring-1 ring-blue-300"
                          : "border-violet-400 bg-violet-50 ring-1 ring-violet-300"
                        : "hover:bg-muted/40 border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-sm font-semibold truncate">{p.nombrePeriodo}</span>
                      <Badge variant="outline" className={`text-[10px] gap-0.5 shrink-0 ${cfg.color}`}>
                        <Icon className="h-2.5 w-2.5" />
                        {cfg.label}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {fmtShort(p.fechaInicio)} → {fmtShort(p.fechaFin)}
                    </p>
                    {isCerradoP && isSelected && (
                      <p className="text-[10px] text-blue-600 mt-0.5 flex items-center gap-0.5">
                        <Eye className="h-2.5 w-2.5" /> Solo lectura
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Content when period selected ── */}
      {selectedPeriodo && (
        <>
          {isClosed ? (
            /* ── CLOSED: Read-only view ── */
            <Card className="border-blue-200">
              <CardContent className="pt-4 pb-4">
                {loadingEmps ? (
                  <div className="space-y-2">
                    {[1,2,3].map(i => <div key={i} className="h-12 bg-muted/40 rounded-xl animate-pulse" />)}
                  </div>
                ) : empleados.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <p className="text-xs text-amber-700">Este período no tiene empleados asignados.</p>
                  </div>
                ) : (
                  <ClosedPeriodView
                    empleados={empleados}
                    allShifts={allShifts}
                    conceptos={conceptos}
                    loading={loadingShifts}
                    periodStart={periodStart}
                    periodEnd={periodEnd}
                  />
                )}
              </CardContent>
            </Card>
          ) : (
            /* ── OPEN: Employee selector + Calendar editor ── */
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 items-start">

              {/* ── Left: Employee panel ── */}
              <div className="space-y-3">
                <button
                  onClick={() => setEmpPanelOpen(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-violet-200 bg-violet-50 text-sm font-semibold hover:bg-violet-100 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-violet-600" />
                    Empleados del período
                    <Badge className="bg-violet-600 text-white text-[10px] h-5 px-1.5">
                      {targetEmpleados.length}/{empleados.length}
                    </Badge>
                  </span>
                  {empPanelOpen
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  }
                </button>

                {empPanelOpen && (
                  <Card className="border-violet-200">
                    <CardContent className="pt-3 pb-3 space-y-3">
                      {loadingEmps ? (
                        <div className="space-y-2">
                          {[1,2,3].map(i => <div key={i} className="h-8 bg-muted rounded animate-pulse" />)}
                        </div>
                      ) : empleados.length === 0 ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                          <p className="text-xs text-amber-700">
                            Sin empleados.{" "}
                            <a href="/dashboard/payroll/periods" className="underline font-medium">
                              Agrégalos en Nómina → Períodos
                            </a>
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Filters */}
                          <div className="grid grid-cols-3 gap-1.5">
                            <Select value={filterCC || "__all__"} onValueChange={v => { setFilterCC(v==="__all__"?"":v); }}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Centro" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__all__">Centro</SelectItem>
                                {uniqueCentros.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Select value={filterProg || "__all__"} onValueChange={v => { setFilterProg(v==="__all__"?"":v); }}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Programa" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__all__">Programa</SelectItem>
                                {uniqueProgramas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Select value={filterMod || "__all__"} onValueChange={v => { setFilterMod(v==="__all__"?"":v); }}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Modalidad" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__all__">Modalidad</SelectItem>
                                {uniqueModalidades.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm" variant="outline"
                              className="h-7 text-xs gap-1 flex-1 border-green-300 text-green-700 hover:bg-green-50"
                              onClick={seleccionarTodos}
                            >
                              <CheckSquare className="h-3 w-3" />
                              Todos ({filteredEmpleados.length})
                            </Button>
                            <Button
                              size="sm" variant="outline"
                              className="h-7 text-xs gap-1 flex-1 border-rose-200 text-rose-600 hover:bg-rose-50"
                              onClick={quitarTodos}
                            >
                              <Square className="h-3 w-3" />
                              Ninguno
                            </Button>
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 text-xs gap-0.5 text-muted-foreground"
                              onClick={limpiarFiltros}
                              title="Limpiar filtros y selección"
                            >
                              <X className="h-3 w-3" />
                              Reset
                            </Button>
                          </div>

                          {/* Employee list */}
                          <div className="border rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
                            <div className="divide-y">
                              {filteredEmpleados.map(emp => {
                                const checked = isChecked(emp)
                                return (
                                  <label
                                    key={emp.id}
                                    className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-muted/20 transition-colors ${
                                      checked
                                        ? "bg-violet-50/60"
                                        : emp.turnosCount > 0
                                          ? "bg-emerald-50/60"
                                          : ""
                                    }`}
                                  >
                                    <input
                                      type="checkbox" checked={checked}
                                      onChange={() => toggleEmp(emp.id)}
                                      className="rounded border-gray-300 accent-violet-600 w-3.5 h-3.5"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium truncate">{emp.apellidos} {emp.nombres}</p>
                                      <p className="text-[9px] text-muted-foreground truncate">
                                        {emp.programa ?? emp.centroCosto ?? emp.numeroDocumento}
                                      </p>
                                    </div>
                                    {emp.turnosCount > 0 && (
                                      <div className="flex items-center gap-1 shrink-0">
                                        <Badge variant="secondary" className="text-[9px] py-0 px-1 h-4">
                                          {emp.turnosCount}
                                        </Badge>
                                        <button
                                          type="button"
                                          onClick={e => { e.preventDefault(); e.stopPropagation(); openEmpPreview(emp) }}
                                          title="Ver turnos guardados"
                                          className="text-muted-foreground hover:text-violet-600 transition-colors"
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </label>
                                )
                              })}
                            </div>
                          </div>

                          {/* Counter */}
                          {targetEmpleados.length > 0 && pendingDays.length > 0 && (
                            <div className="rounded-xl bg-violet-600 text-white px-3 py-2.5 text-center">
                              <p className="font-extrabold text-2xl leading-none">{totalTurnos}</p>
                              <p className="text-xs opacity-80 mt-0.5">
                                {targetEmpleados.length} empl. × {pendingDays.length} días
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* ── Right: Calendar ── */}
              <Card>
                <CardContent className="pt-4 pb-4 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      2. Marca los días del calendario
                    </p>
                    <div className="flex items-center gap-2">
                      {pendingDays.length > 0 && (
                        <Button size="sm" variant="outline"
                          className="h-7 text-xs gap-1 text-muted-foreground"
                          onClick={() => { setPendingMap({}); setPreEditState(null) }}
                        >
                          <Trash2 className="h-3 w-3" />
                          Limpiar todo ({pendingDays.length})
                        </Button>
                      )}
                      <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
                        {([["mensual","Mensual"],["semanal","Semanal"],["diario","Diario"]] as const).map(([v, label]) => (
                          <button key={v} onClick={() => setVista(v)}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                              vista === v ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Edit mode cancel banner */}
                  {preEditState !== null && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5">
                      <div className="flex items-center gap-2 text-sm text-blue-800 min-w-0">
                        <FileEdit className="h-4 w-4 text-blue-600 shrink-0" />
                        <span className="truncate">
                          Modo edición —{" "}
                          <strong>
                            {targetEmpleados[0]
                              ? `${targetEmpleados[0].apellidos} ${targetEmpleados[0].nombres}`
                              : "empleado"
                            }
                          </strong>
                        </span>
                      </div>
                      <Button
                        size="sm" variant="outline"
                        onClick={cancelarEdicion}
                        className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-100 shrink-0 h-8"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancelar
                      </Button>
                    </div>
                  )}

                  {/* Legend */}
                  <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground border-b pb-3">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block" />
                      Dom / Festivo
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded ring-2 ring-violet-500 inline-block" />
                      Hoy
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-violet-500 inline-block" />
                      Turno marcado
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-gray-100 opacity-40 inline-block" />
                      Fuera del período
                    </span>
                  </div>

                  {/* Multi-selection alert */}
                  {selectedIds.size > 1 && (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <p>
                        <strong>{selectedIds.size} empleados seleccionados —</strong>{" "}
                        los {pendingDays.length > 0 ? `${pendingDays.length} día${pendingDays.length !== 1 ? "s" : ""} marcados` : "días que marques"} se aplicarán a <strong>todos por igual</strong>.
                      </p>
                    </div>
                  )}

                  {/* Hours progress bar */}
                  {pendingDays.length > 0 && (
                    <div className="rounded-xl border border-border bg-muted/10 px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-foreground flex items-center gap-1.5">
                          <span>⏱</span> Horas en plantilla
                        </span>
                        <span className="font-extrabold text-sm">
                          {horasStats.total}h
                          <span className="font-normal text-muted-foreground text-[10px] ml-1">
                            / {maxHorasPeriodo}h jornada
                          </span>
                        </span>
                      </div>
                      {/* Bar */}
                      <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-300 rounded-l-full"
                          style={{ width: `${pctOrd}%` }}
                        />
                        <div
                          className="h-full bg-orange-400 transition-all duration-300"
                          style={{ width: `${pctExt}%` }}
                        />
                      </div>
                      {/* Legend row */}
                      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                          Jornada: <strong className="text-foreground ml-0.5">{horasStats.ordinarias}h</strong>
                        </span>
                        {horasStats.extra > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" />
                            Extra: <strong className="text-orange-600 ml-0.5">{horasStats.extra}h</strong>
                          </span>
                        )}
                        <span className="ml-auto">{pendingDays.length} día{pendingDays.length !== 1 ? "s" : ""} marcado{pendingDays.length !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  )}

                  {vista === "mensual" ? renderMonthCalendar()
                    : vista === "semanal" ? renderWeekView()
                    : renderDailyView()
                  }
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* ── Empty state ── */}
      {!selectedPeriodoId && (
        <div className="rounded-2xl border bg-muted/10 flex flex-col items-center py-16 text-muted-foreground gap-2">
          <CalendarRange className="h-10 w-10 opacity-20" />
          <p className="font-medium text-sm">Selecciona un período para continuar</p>
          <p className="text-xs opacity-60">
            Usa las pestañas para ver períodos en proceso o ya cerrados
          </p>
        </div>
      )}

      {/* ── Employee preview modal ── */}
      {previewEmpId && (() => {
        const emp = empleados.find(e => e.id === previewEmpId)
        if (!emp) return null

        const allDates: string[] = []
        if (periodStart && periodEnd) {
          const [sy,sm,sd] = periodStart.split("-").map(Number)
          const [ey,em,ed] = periodEnd.split("-").map(Number)
          const cursor = new Date(sy, sm-1, sd, 12)
          const endDt  = new Date(ey, em-1, ed, 12)
          while (cursor <= endDt) {
            allDates.push(toDateKey(cursor.getFullYear(), cursor.getMonth()+1, cursor.getDate()))
            cursor.setDate(cursor.getDate() + 1)
          }
        }

        const shiftMap: Record<string, AsignacionTurno> = {}
        previewShifts.forEach(s => { shiftMap[s.fechaTurno.substring(0,10)] = s })

        const counts: Record<string, number> = {}
        previewShifts.forEach(s => { counts[s.concepto.codigo] = (counts[s.concepto.codigo] ?? 0) + 1 })

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPreviewEmpId(null)} />
            <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-border flex flex-col max-h-[88vh] overflow-hidden">

              {/* Header */}
              <div className="px-5 py-4 border-b bg-violet-50 shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-lg leading-tight text-gray-900">
                      {emp.apellidos} {emp.nombres}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {emp.numeroDocumento}
                      {emp.centroCosto && <span> · {emp.centroCosto}</span>}
                      {emp.programa    && <span> · {emp.programa}</span>}
                    </p>
                  </div>
                  <button onClick={() => setPreviewEmpId(null)} className="rounded-full p-1.5 hover:bg-black/10 transition-colors shrink-0">
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="overflow-y-auto p-5 flex-1">
                {loadingPreview ? (
                  <div className="flex justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin text-violet-600" />
                  </div>
                ) : previewShifts.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-muted-foreground gap-2">
                    <Calendar className="h-8 w-8 opacity-20" />
                    <p className="text-sm">Sin turnos guardados en este período</p>
                  </div>
                ) : (
                  <>
                    {/* Count label */}
                    <p className="text-sm font-semibold text-gray-800 mb-3">
                      {previewShifts.length} turnos guardados en el período
                    </p>

                    {/* Day chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {allDates.map(dk => {
                        const s    = shiftMap[dk]
                        const [,,day] = dk.split("-")
                        const dom  = isDomingo(dk)
                        const fest = isFestivoCO(dk)
                        const dow  = getDow(dk)
                        const dayAbbr = DIAS_CORTO[dow]

                        if (!s) return (
                          <div key={dk} className={`w-11 h-[52px] rounded-lg flex flex-col items-center justify-center border text-[10px] ${
                            dom || fest
                              ? "bg-amber-50 border-amber-300 text-amber-600"
                              : "bg-gray-50 border-gray-200 text-gray-400"
                          }`}>
                            <span className="text-[8px] leading-none font-medium">{dayAbbr}</span>
                            <span className="font-bold text-xs leading-tight">{parseInt(day)}</span>
                            {(dom || fest) && <span className="text-[7px] leading-none">{dom ? "Dom" : "Fest"}</span>}
                          </div>
                        )

                        return (
                          <div key={dk}
                            title={`${dayAbbr} ${parseInt(day)}: [${s.concepto.codigo}] ${s.concepto.nombre}${s.novedad ? ` + ${s.novedad.codigo}` : ""}`}
                            className="w-11 h-[52px] rounded-lg flex flex-col items-center justify-center text-white shadow-sm border border-white/20"
                            style={{ backgroundColor: s.concepto.color ?? "#6366f1" }}
                          >
                            <span className="text-[8px] leading-none font-medium opacity-80">{dayAbbr}</span>
                            <span className="text-xs font-bold leading-tight">{parseInt(day)}</span>
                            <span className="text-[10px] font-extrabold leading-none">{s.concepto.codigo}</span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Summary by concept */}
                    <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t">
                      {Object.entries(counts).map(([codigo, cnt]) => {
                        const c = conceptos.find(x => x.codigo === codigo)
                        return (
                          <span key={codigo}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full text-white"
                            style={{ backgroundColor: c?.color ?? "#6366f1" }}
                          >
                            {c?.icono} {codigo}: {cnt}
                          </span>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Footer with Editar button */}
              {!loadingPreview && previewShifts.length > 0 && (
                <div className="px-5 py-3 border-t bg-gray-50 shrink-0 flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">
                    Editar carga los turnos en el calendario para modificar y re-guardar
                  </p>
                  <Button
                    size="sm"
                    className="gap-1.5 bg-violet-600 hover:bg-violet-700 shrink-0"
                    onClick={() => editarTurnosEmp(emp)}
                  >
                    <FileEdit className="h-3.5 w-3.5" />
                    Editar turnos
                  </Button>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* ── Picker modal ── */}
      {pickerDate && (
        <ConceptoPicker
          date={pickerDate} conceptos={conceptos}
          turnoId={pickerTurnoId} novedadId={pickerNovedadId}
          manualStart={manualStart} manualEnd={manualEnd}
          onTurno={setPickerTurnoId} onTurnoQuick={turnoQuickConfirm}
          onNovedad={setPickerNovedadId}
          onManualStart={setManualStart} onManualEnd={setManualEnd}
          onClear={clearPickerDay} onClose={closePicker} onConfirm={confirmPicker}
        />
      )}
    </div>
  )
}
