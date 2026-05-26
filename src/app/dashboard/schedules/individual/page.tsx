"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, X, Plus, User, Settings, Clock, BarChart2, ArrowLeft, CalendarRange, Search, Filter, Building2, Users, Lock, AlertTriangle, UtensilsCrossed } from "lucide-react"
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
  estaActivo: boolean
}

interface ConceptoNomina {
  id: string
  codigo: string
  nombre: string
  categoria: string
  tipoImpacto: string
  horaInicioDefecto: string | null
  horaFinDefecto: string | null
  horasFijas: number | null
  color: string | null
  icono: string | null
  cruzaMedianoche: boolean
  afectaLiquidacion: boolean
}

interface AsignacionTurno {
  id: string
  empleadoId: string
  conceptoId: string
  novedadId?: string | null
  fechaTurno: string
  horaInicioPersonalizada?: string | null
  horaFinPersonalizada?: string | null
  minutosAlimentacion?: number | null
  concepto: ConceptoNomina
  novedad?: ConceptoNomina | null
}

// ─── Colombian public holidays 2025-2026 ─────────────────────

const FESTIVOS_CO = new Set([
  "2025-01-01", "2025-01-06", "2025-03-24", "2025-04-17", "2025-04-18",
  "2025-05-01", "2025-06-02", "2025-06-23", "2025-06-30", "2025-07-20",
  "2025-08-07", "2025-08-18", "2025-10-13", "2025-11-03", "2025-11-17",
  "2025-12-08", "2025-12-25",
  "2026-01-01", "2026-01-12", "2026-03-23", "2026-04-02", "2026-04-03",
  "2026-05-01", "2026-05-18", "2026-06-08", "2026-06-15", "2026-06-29",
  "2026-07-20", "2026-08-07", "2026-08-17", "2026-10-12", "2026-11-02",
  "2026-11-16", "2026-12-08", "2026-12-25",
])

// ─── Helpers ──────────────────────────────────────────────────

function localDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}

function getWeeksInRange(startStr: string, endStr: string): Date[][] {
  const start = parseLocalDate(startStr)
  const end = parseLocalDate(endStr)
  const weeks: Date[][] = []
  const cursor = new Date(start)
  // Rewind to the Sunday of the start week
  cursor.setDate(cursor.getDate() - cursor.getDay())
  while (cursor <= end) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + i, 12))
    }
    weeks.push(week)
    cursor.setDate(cursor.getDate() + 7)
  }
  return weeks
}

// Calculate hours for a concept, using personalized times if provided.
// breakMinutes: meal break deduction to subtract from positive (working) hours.
function getConceptoHoras(
  concepto: ConceptoNomina,
  horaInicioPersonalizada?: string | null,
  horaFinPersonalizada?: string | null,
  breakMinutes: number = 0
): number {
  if (concepto.tipoImpacto === "NEUTRO") return 0

  const useStart = horaInicioPersonalizada || concepto.horaInicioDefecto
  const useEnd = horaFinPersonalizada || concepto.horaFinDefecto

  let hours = 0
  if (concepto.horasFijas != null) {
    hours = concepto.horasFijas
  } else if (useStart && useEnd) {
    const [sh, sm] = useStart.split(":").map(Number)
    const [eh, em] = useEnd.split(":").map(Number)
    let startMin = sh * 60 + sm
    let endMin = eh * 60 + em
    // <= handles same-time (e.g. 07:00→07:00 = 24h) and regular cross-midnight
    if (concepto.cruzaMedianoche && endMin <= startMin) endMin += 1440
    hours = (endMin - startMin) / 60
  }

  const raw = concepto.tipoImpacto === "RESTA_HORAS" ? -hours : hours
  // Apply meal break only to positive (paid-work) hours; never go below 0
  return raw > 0 ? Math.max(0, raw - breakMinutes / 60) : raw
}

// Get shift type classification for calculations
function getShiftType(
  concepto: ConceptoNomina,
  horaInicio?: string | null
): 'diurna' | 'nocturna' | 'mixed' {
  const startHour = (horaInicio || concepto.horaInicioDefecto || '07:00').split(':')[0]
  const startNum = parseInt(startHour, 10)

  // Night shift starts at 7pm (19) according to Colombian law
  if (startNum >= 19 || startNum < 6) return 'nocturna'
  if (startNum >= 6 && startNum < 19) return 'diurna'
  return 'diurna'
}

// Hour classification (8 buckets per Colombian labor law)
interface HourClassification {
  ordinarias: number
  nocturnas: number
  festivas: number
  nocturnasFestivas: number
  extraDiurna: number
  extraNocturna: number
  extraFestiva: number
  extraNocturnaFestiva: number
}

const EMPTY_CLASS: HourClassification = {
  ordinarias: 0, nocturnas: 0, festivas: 0, nocturnasFestivas: 0,
  extraDiurna: 0, extraNocturna: 0, extraFestiva: 0, extraNocturnaFestiva: 0,
}

function calculateHourClassification(
  horaInicio: string,
  horaFin: string,
  festDay: boolean,
  weekTotalSoFar: number,
  topeHoras: number,
  breakMinutes: number = 0
): HourClassification {
  const [sh, sm] = horaInicio.split(':').map(Number)
  const [eh, em] = horaFin.split(':').map(Number)

  let startMin = sh * 60 + sm
  let endMin = eh * 60 + em
  if (endMin <= startMin) endMin += 1440
  // Descanso descontado desde el INICIO del turno (Ley 2466/2025)
  startMin = startMin + breakMinutes

  let ordinarias = 0, nocturnas = 0, festivas = 0, nocturnasFestivas = 0
  let extraDiurna = 0, extraNocturna = 0, extraFestiva = 0, extraNocturnaFestiva = 0
  let weekRunning = weekTotalSoFar

  for (let m = startMin; m < endMin; m += 60) {
    const minOfDay = m % 1440
    // Nocturno 19:00–06:00 (Ley 2466/2025, vigente desde dic. 25/2025)
    const isNight = minOfDay >= 19 * 60 || minOfDay < 6 * 60
    const isExtra = weekRunning >= topeHoras
    weekRunning++

    if (festDay) {
      if (isNight) {
        if (isExtra) { extraNocturnaFestiva++ } else { nocturnasFestivas++ }
      } else {
        if (isExtra) { extraFestiva++ } else { festivas++ }
      }
    } else {
      if (isNight) {
        if (isExtra) { extraNocturna++ } else { nocturnas++ }
      } else {
        if (isExtra) { extraDiurna++ } else { ordinarias++ }
      }
    }
  }

  return { ordinarias, nocturnas, festivas, nocturnasFestivas, extraDiurna, extraNocturna, extraFestiva, extraNocturnaFestiva }
}

function getDayClassification(
  asignacion: AsignacionTurno,
  date: Date,
  weekTotalSoFar: number,
  topeHoras: number,
  breakMinutes: number = 0
): HourClassification {
  const c = asignacion.concepto
  if (c.tipoImpacto === "NEUTRO") return { ...EMPTY_CLASS }

  const festDay = isFestivo(date)
  const sign = c.tipoImpacto === "RESTA_HORAS" ? -1 : 1

  // Fixed-hours concepts (absences, paid holidays, etc.)
  if (c.horasFijas != null) {
    const h = c.horasFijas
    if (sign === -1) {
      // Ausencia/descuento: resta siempre de ordinarias (o festivas si aplica)
      return festDay ? { ...EMPTY_CLASS, festivas: -h } : { ...EMPTY_CLASS, ordinarias: -h }
    }
    // Cuántas horas caben dentro de las 44h ordinarias y cuántas son extras
    const ordinary = Math.min(h, Math.max(0, topeHoras - weekTotalSoFar))
    const extra = h - ordinary
    if (festDay) return { ...EMPTY_CLASS, festivas: ordinary, extraFestiva: extra }
    return { ...EMPTY_CLASS, ordinarias: ordinary, extraDiurna: extra }
  }

  // Time-based shifts
  const start = asignacion.horaInicioPersonalizada || c.horaInicioDefecto
  const end = asignacion.horaFinPersonalizada || c.horaFinDefecto
  if (!start || !end) return { ...EMPTY_CLASS }

  const cls = calculateHourClassification(start, end, festDay, weekTotalSoFar, topeHoras, breakMinutes)
  if (sign === -1) {
    return {
      ordinarias: -cls.ordinarias, nocturnas: -cls.nocturnas,
      festivas: -cls.festivas, nocturnasFestivas: -cls.nocturnasFestivas,
      extraDiurna: -cls.extraDiurna, extraNocturna: -cls.extraNocturna,
      extraFestiva: -cls.extraFestiva, extraNocturnaFestiva: -cls.extraNocturnaFestiva,
    }
  }
  return cls
}

function isFestivo(date: Date): boolean {
  return FESTIVOS_CO.has(localDateKey(date)) || date.getDay() === 0
}

// Returns array of {year, month} objects (month is 0-indexed) in the range
function getMonthsInRange(startStr: string, endStr: string): { year: number; month: number }[] {
  const start = parseLocalDate(startStr)
  const end = parseLocalDate(endStr)
  const months: { year: number; month: number }[] = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1, 12)
  while (cursor <= end) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return months
}

// ─── Sunday-first day labels ──────────────────────────────────

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

// ─── Types ─────────────────────────────────────────────────────

interface PeriodoCalculado {
  id: string
  nombrePeriodo: string
  fechaInicio: string
  fechaFin: string
  estadoPeriodo: string
}

// ─── Page ─────────────────────────────────────────────────────

function SchedulesPageInner() {
  const searchParams = useSearchParams()
  const today = new Date()
  const defaultStart = localDateKey(new Date(today.getFullYear(), today.getMonth(), 1, 12))
  const defaultEnd = localDateKey(new Date(today.getFullYear(), today.getMonth() + 1, 0, 12))

  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [conceptos, setConceptos] = useState<ConceptoNomina[]>([])
  const [asignaciones, setAsignaciones] = useState<AsignacionTurno[]>([])
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState(searchParams.get("empleadoId") ?? "")
  const [startDate, setStartDate] = useState(searchParams.get("startDate") ?? defaultStart)
  const [endDate, setEndDate] = useState(searchParams.get("endDate") ?? defaultEnd)
  const periodoId = searchParams.get("periodoId")
  const periodoNombre = searchParams.get("periodoNombre")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirtyDates, setDirtyDates] = useState<Set<string>>(new Set())
  const [showResults, setShowResults] = useState(false)
  const [horasSemana, setHorasSemana] = useState(44)
  const [showLegend, setShowLegend] = useState(false)

  // Estados para filtros y buscador
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    centroCosto: "all",
    programa: "all",
    modalidad: "all",
    estado: "todos" // "todos", "activos", "inactivos"
  })
  const [viewMode, setViewMode] = useState<'individual' | 'general'>('individual')
  const [vistaCalendario, setVistaCalendario] = useState<'mensual' | 'semanal' | 'diario'>('semanal')
  const [diaActual, setDiaActual] = useState(searchParams.get("startDate") ?? defaultStart)

  // Periods in CALCULADO/APROBADO/CERRADO overlapping the current date range
  const [periodosCalculados, setPeriodosCalculados] = useState<PeriodoCalculado[]>([])

  // Meal break state (period-level default + per-shift picker override)
  const [periodBreakMinutes, setPeriodBreakMinutes] = useState<number>(0)
  const [pickerBreakMin, setPickerBreakMin] = useState<number>(0)    // 0/30/60/-1(custom)
  const [pickerBreakCustom, setPickerBreakCustom] = useState<number>(30)

  // Dual picker state
  const [pickerDate, setPickerDate] = useState<string | null>(null)
  const [lockedConfirmDate, setLockedConfirmDate] = useState<string | null>(null)
  const [pickerTurnoId, setPickerTurnoId] = useState<string | null>(null)
  const [pickerNovedadId, setPickerNovedadId] = useState<string | null>(null)
  const [manualStart, setManualStart] = useState("07:00")
  const [manualEnd, setManualEnd] = useState("19:00")

  // Load period-level meal break from URL periodoId or from first overlapping period
  useEffect(() => {
    if (periodoId) {
      fetch(`/api/payroll/periods/${periodoId}`)
        .then(r => r.ok ? r.json() : null)
        .then((p: any) => { if (p?.minutosAlimentacion != null) setPeriodBreakMinutes(p.minutosAlimentacion) })
        .catch(() => {})
    }
  }, [periodoId])

  useEffect(() => { fetchInitialData() }, [])

  useEffect(() => {
    if (selectedEmpleadoId) fetchAsignaciones()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmpleadoId, startDate, endDate])

  // Fetch periods that overlap this date range and are in a locked state
  useEffect(() => {
    if (!startDate || !endDate) return
    fetch(`/api/payroll/periods?startDate=${startDate}&endDate=${endDate}&estados=CALCULADO,APROBADO,CERRADO`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setPeriodosCalculados(Array.isArray(data) ? data.filter((p: PeriodoCalculado) =>
        ["CALCULADO", "APROBADO", "CERRADO"].includes(p.estadoPeriodo)
      ) : []))
      .catch(() => {})
  }, [startDate, endDate])

  // Keep diaActual clamped within [startDate, endDate]
  useEffect(() => {
    if (!startDate || !endDate) return
    const d = parseLocalDate(diaActual)
    const s = parseLocalDate(startDate)
    const e = parseLocalDate(endDate)
    if (d < s) setDiaActual(startDate)
    else if (d > e) setDiaActual(endDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate])

  async function fetchInitialData() {
    try {
      const [er, cr, lr] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/concepts"),
        fetch("/api/settings/legal"),
      ])
      if (er.ok) {
        setEmpleados(await er.json())
      } else {
        toast.error("No se pudieron cargar los empleados")
      }
      if (cr.ok) {
        setConceptos(await cr.json())
      } else {
        toast.error("No se pudieron cargar los conceptos de nómina")
      }
      if (lr.ok) {
        const legalData = await lr.json()
        const horas = legalData?.configuracion?.horasSemanalesMaximas
        if (typeof horas === "number" && horas > 0) setHorasSemana(horas)
      }
    } catch {
      toast.error("Error al cargar datos")
    } finally {
      setLoading(false)
    }
  }

  async function fetchAsignaciones() {
    try {
      const res = await fetch(
        `/api/schedules?startDate=${startDate}&endDate=${endDate}&empleadoId=${selectedEmpleadoId}`
      )
      if (res.ok) {
        setAsignaciones(await res.json())
        setDirtyDates(new Set())
      } else {
        const err = await res.json()
        toast.error(err.error || "Error al obtener la programación")
      }
    } catch {
      toast.error("Error al cargar turnos")
    }
  }

  // Funciones para filtrar empleados
  const getFilteredEmpleados = () => {
    return empleados.filter((empleado: Empleado) => {
      // Filtro de búsqueda
      const matchesSearch = searchTerm === "" ||
        `${empleado.nombres} ${empleado.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        empleado.numeroDocumento.includes(searchTerm)

      // Filtro de centro de costo
      const matchesCentroCosto = filters.centroCosto === "all" || filters.centroCosto === "" || empleado.centroCosto === filters.centroCosto

      // Filtro de programa
      const matchesPrograma = filters.programa === "all" || filters.programa === "" || empleado.programa === filters.programa

      // Filtro de modalidad
      const matchesModalidad = filters.modalidad === "all" || filters.modalidad === "" || empleado.modalidad === filters.modalidad

      // Filtro de estado
      const matchesEstado = filters.estado === "todos" ||
        (filters.estado === "activos" && empleado.estaActivo) ||
        (filters.estado === "inactivos" && !empleado.estaActivo)

      return matchesSearch && matchesCentroCosto && matchesPrograma && matchesModalidad && matchesEstado
    })
  }

  // Funciones para obtener valores únicos
  const getCentrosCosto = () => {
    const centros = Array.from(new Set(empleados.map(e => e.centroCosto).filter((centro): centro is string => Boolean(centro))))
    return centros.sort()
  }

  const getProgramas = () => {
    const programas = Array.from(new Set(empleados.map(e => e.programa).filter((programa): programa is string => Boolean(programa))))
    return programas.sort()
  }

  const getModalidades = () => {
    const modalidades = Array.from(new Set(empleados.map(e => e.modalidad).filter((modalidad): modalidad is string => Boolean(modalidad))))
    return modalidades.sort()
  }

  const clearFilters = () => {
    setFilters({
      centroCosto: "all",
      programa: "all",
      modalidad: "all",
      estado: "todos"
    })
    setSearchTerm("")
  }

  const activeFiltersCount = Object.values(filters).filter(f => f !== "all" && f !== "" && f !== "todos").length + (searchTerm !== "" ? 1 : 0)

  function getAsignacion(dateKey: string): AsignacionTurno | undefined {
    return asignaciones.find(
      a => a.empleadoId === selectedEmpleadoId && a.fechaTurno.substring(0, 10) === dateKey
    )
  }

  // Effective meal break for a given assignment (individual override > period default)
  function getEffectiveBreak(asignacion: AsignacionTurno): number {
    if (asignacion.minutosAlimentacion !== null && asignacion.minutosAlimentacion !== undefined) {
      return asignacion.minutosAlimentacion
    }
    return periodBreakMinutes
  }

  function openPicker(dk: string) {
    const existing = getAsignacion(dk)
    if (existing) {
      const isTurno = existing.concepto.categoria === "TURNO_LABORAL"
      setPickerTurnoId(isTurno ? existing.conceptoId : null)
      setPickerNovedadId(existing.novedadId || (!isTurno ? existing.conceptoId : null))
      setManualStart(existing.horaInicioPersonalizada || "07:00")
      setManualEnd(existing.horaFinPersonalizada || "19:00")
      // Load per-shift break override (null = inherit from period)
      const breakVal = existing.minutosAlimentacion ?? periodBreakMinutes
      if (breakVal === 0 || breakVal === 30 || breakVal === 60) {
        setPickerBreakMin(breakVal)
      } else {
        setPickerBreakMin(-1)
        setPickerBreakCustom(breakVal)
      }
    } else {
      setPickerTurnoId(null)
      setPickerNovedadId(null)
      setManualStart("07:00")
      setManualEnd("19:00")
      // Default to period break
      if (periodBreakMinutes === 0 || periodBreakMinutes === 30 || periodBreakMinutes === 60) {
        setPickerBreakMin(periodBreakMinutes)
      } else {
        setPickerBreakMin(-1)
        setPickerBreakCustom(periodBreakMinutes)
      }
    }
    setPickerDate(dk)
  }

  function closePicker() {
    setPickerDate(null)
    setPickerTurnoId(null)
    setPickerNovedadId(null)
  }

  function assignShift(
    dateKey: string,
    turnoId: string | null,
    novedadId: string | null,
    horaInicio?: string,
    horaFin?: string,
    breakOverride?: number | null,
  ) {
    if (!turnoId && !novedadId) {
      removeShift(dateKey)
      return
    }
    const primaryId = turnoId || novedadId!
    const secondaryId = turnoId ? novedadId : null
    const primaryConcepto = conceptos.find(c => c.id === primaryId)!
    const secondaryConcepto = secondaryId ? (conceptos.find(c => c.id === secondaryId) ?? null) : null

    setAsignaciones(prev => {
      const rest = prev.filter(
        a => !(a.empleadoId === selectedEmpleadoId && a.fechaTurno.substring(0, 10) === dateKey)
      )
      return [
        ...rest,
        {
          id: getAsignacion(dateKey)?.id || `tmp-${Date.now()}`,
          empleadoId: selectedEmpleadoId,
          conceptoId: primaryId,
          novedadId: secondaryId,
          fechaTurno: dateKey,
          horaInicioPersonalizada: horaInicio ?? null,
          horaFinPersonalizada: horaFin ?? null,
          minutosAlimentacion: breakOverride !== undefined ? breakOverride : (getAsignacion(dateKey)?.minutosAlimentacion ?? null),
          concepto: primaryConcepto,
          novedad: secondaryConcepto,
        },
      ]
    })
    setDirtyDates(prev => {
      const newSet = new Set(prev)
      newSet.add(dateKey)
      return newSet
    })
  }

  function removeShift(dateKey: string) {
    setAsignaciones(prev =>
      prev.filter(
        a => !(a.empleadoId === selectedEmpleadoId && a.fechaTurno.substring(0, 10) === dateKey)
      )
    )
    setDirtyDates(prev => {
      const newSet = new Set(prev)
      newSet.add(dateKey)
      return newSet
    })
  }

  function confirmPicker() {
    if (!pickerDate) return
    const manualConcepto = conceptos.find(c => c.codigo === "M")
    const isManual = pickerTurnoId === manualConcepto?.id
    const breakFinal = pickerBreakMin === -1 ? pickerBreakCustom : pickerBreakMin
    assignShift(
      pickerDate,
      pickerTurnoId,
      pickerNovedadId,
      isManual ? manualStart : undefined,
      isManual ? manualEnd : undefined,
      breakFinal !== periodBreakMinutes ? breakFinal : null,  // null = inherit from period
    )
    closePicker()
  }

  async function saveAssignments() {
    if (!dirtyDates.size) return toast.info("No hay cambios pendientes")
    setSaving(true)
    try {
      const toSave = asignaciones.filter(
        a => a.empleadoId === selectedEmpleadoId && dirtyDates.has(a.fechaTurno.substring(0, 10))
      )
      const toDelete = Array.from(dirtyDates).filter(
        dk => !asignaciones.find(
          a => a.empleadoId === selectedEmpleadoId && a.fechaTurno.substring(0, 10) === dk
        )
      )
      // Collect which dirty dates overlap with calculated periods (for audit)
      const fechasEnPeriodosCalculados = Array.from(dirtyDates)
        .map(dk => ({ dk, periodo: getCalculatedPeriodForDate(dk) }))
        .filter(x => x.periodo !== null)
        .map(x => ({ fechaTurno: x.dk, periodoId: x.periodo!.id, periodoNombre: x.periodo!.nombrePeriodo }))

      const res = await fetch("/api/schedules/batch", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asignaciones: toSave.map(a => ({
            empleadoId: a.empleadoId,
            conceptoId: a.conceptoId,
            novedadId: a.novedadId ?? null,
            fechaTurno: a.fechaTurno.substring(0, 10),
            horaInicioPersonalizada: a.horaInicioPersonalizada,
            horaFinPersonalizada: a.horaFinPersonalizada,
            minutosAlimentacion: a.minutosAlimentacion ?? null,
          })),
          eliminaciones: toDelete.map(dk => ({ empleadoId: selectedEmpleadoId, fechaTurno: dk })),
          fechasEnPeriodosCalculados,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(data.message || "Turnos guardados")
        setDirtyDates(new Set())
        fetchAsignaciones()
      } else {
        const err = await res.json()
        toast.error(err.error || "Error al guardar turnos")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setSaving(false)
    }
  }

  // ─── Derived ──────────────────────────────────────────────────

  function getCalculatedPeriodForDate(dk: string): PeriodoCalculado | null {
    return periodosCalculados.find(p => {
      const fi = p.fechaInicio.substring(0, 10)
      const ff = p.fechaFin.substring(0, 10)
      return dk >= fi && dk <= ff
    }) ?? null
  }

  const weeks = startDate && endDate ? getWeeksInRange(startDate, endDate) : []
  const startDateObj = startDate ? parseLocalDate(startDate) : null
  const endDateObj = endDate ? parseLocalDate(endDate) : null
  const selectedEmpleado = empleados.find(e => e.id === selectedEmpleadoId)
  const manualConcepto = conceptos.find(c => c.codigo === "M")

  const turnoConceptos = conceptos.filter(c => c.categoria === "TURNO_LABORAL")
  const novedadConceptos = conceptos.filter(c => c.categoria !== "TURNO_LABORAL")

  const pickerDateObj = pickerDate ? parseLocalDate(pickerDate) : null
  const pickerExisting = pickerDate ? getAsignacion(pickerDate) : undefined
  const isManualSelected = pickerTurnoId === manualConcepto?.id

  const totalHoras = weeks.reduce((sum, week) =>
    sum + week.reduce((ws, d) => {
      const a = getAsignacion(localDateKey(d))
      return a ? ws + getConceptoHoras(a.concepto, a.horaInicioPersonalizada, a.horaFinPersonalizada, getEffectiveBreak(a)) : ws
    }, 0)
    , 0)

  // ─── Loading ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-5">
        <h1 className="text-3xl font-bold">Programación de Turnos</h1>
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-muted rounded-xl" />
          <div className="h-40 bg-muted rounded-xl" />
        </div>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Period context banner ── */}
      {periodoId && periodoNombre && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border bg-indigo-50 border-indigo-200 text-indigo-800">
          <CalendarRange className="h-4 w-4 shrink-0 text-indigo-600" />
          <span className="text-sm font-medium flex-1">
            Programando para período: <strong>{decodeURIComponent(periodoNombre)}</strong>
          </span>
          <Link href={`/dashboard/payroll/periods/${periodoId}`}>
            <Button variant="ghost" size="sm" className="gap-1.5 text-indigo-700 hover:bg-indigo-100 h-7 text-xs">
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver al período
            </Button>
          </Link>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Programación de Turnos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {periodoId ? "Asigna turnos dentro de este período de nómina" : "Selecciona empleado y período para asignar turnos"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/dashboard/settings/concepts">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              Conceptos
            </Button>
          </Link>
          {selectedEmpleado && (
            <Button
              variant={showResults ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => setShowResults(v => !v)}
            >
              <BarChart2 className="h-3.5 w-3.5" />
              {showResults ? "Ver Programación" : "Ver Resultados"}
            </Button>
          )}
          <Button
            onClick={saveAssignments}
            disabled={saving || !dirtyDates.size}
            size="sm"
            className="gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Guardando…" : dirtyDates.size ? `Guardar (${dirtyDates.size})` : "Guardar"}
          </Button>
        </div>
      </div>

      {/* ── Controls ── */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="space-y-4">
            {/* Barra de búsqueda y filtros */}
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Buscar por nombre, apellido o documento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="relative"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <Badge className="ml-2 bg-blue-600 text-white" variant="secondary">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <Button
                    variant={viewMode === 'individual' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('individual')}
                    className="text-xs"
                  >
                    Individual
                  </Button>
                  <Button
                    variant={viewMode === 'general' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('general')}
                    className="text-xs"
                  >
                    General
                  </Button>
                </div>
              </div>
            </div>

            {/* Vista calendario toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Vista:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                {(['mensual', 'semanal', 'diario'] as const).map(v => (
                  <Button
                    key={v}
                    variant={vistaCalendario === v ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setVistaCalendario(v)}
                    className="text-xs capitalize"
                  >
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Panel de filtros */}
            {showFilters && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Centro de Costo</Label>
                    <Select
                      value={filters.centroCosto}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, centroCosto: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {getCentrosCosto().map(centro => (
                          <SelectItem key={centro} value={centro}>{centro}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Programa</Label>
                    <Select
                      value={filters.programa}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, programa: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {getProgramas().map(programa => (
                          <SelectItem key={programa} value={programa}>{programa}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Modalidad</Label>
                    <Select
                      value={filters.modalidad}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, modalidad: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {getModalidades().map(modalidad => (
                          <SelectItem key={modalidad} value={modalidad}>{modalidad}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Estado</Label>
                    <Select
                      value={filters.estado}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, estado: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="activos">Activos</SelectItem>
                        <SelectItem value="inactivos">Inactivos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end mt-3">
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Limpiar Filtros
                  </Button>
                </div>
              </div>
            )}

            {/* Selección de empleado y fechas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Empleado</Label>
                <Select value={selectedEmpleadoId} onValueChange={setSelectedEmpleadoId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="— Selecciona —" />
                  </SelectTrigger>
                  <SelectContent>
                    {getFilteredEmpleados().map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        <div className="flex items-center gap-2">
                          <span>{e.nombres} {e.apellidos}</span>
                          {!e.estaActivo && <Badge variant="destructive" className="text-xs">Inactivo</Badge>}
                        </div>
                        <span className="text-muted-foreground ml-1.5 text-xs">· {e.numeroDocumento}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Desde</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hasta</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Empty state / Vista General ── */}
      {!selectedEmpleadoId ? (
        viewMode === 'individual' ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-2xl">
            <User className="h-10 w-10 mb-3 opacity-20" />
            <p className="font-medium">Selecciona un empleado para comenzar</p>
            <p className="text-sm mt-1 opacity-60">Luego ajusta el período y haz clic en cada día</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Programación General</h2>
              <Badge variant="outline" className="text-xs">
                {getFilteredEmpleados().length} empleados encontrados
              </Badge>
            </div>

            {/* Vista de tarjetas de empleados */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {getFilteredEmpleados().map(empleado => (
                <Card key={empleado.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                          {empleado.nombres.charAt(0)}{empleado.apellidos.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm leading-tight">
                            {empleado.nombres} {empleado.apellidos}
                          </h3>
                          <p className="text-xs text-muted-foreground">CC {empleado.numeroDocumento}</p>
                        </div>
                      </div>
                      {!empleado.estaActivo && (
                        <Badge variant="destructive" className="text-xs">Inactivo</Badge>
                      )}
                    </div>

                    {/* Información adicional */}
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {empleado.centroCosto && (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          <span>{empleado.centroCosto}</span>
                        </div>
                      )}
                      {empleado.programa && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{empleado.programa}</span>
                        </div>
                      )}
                      {empleado.modalidad && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{empleado.modalidad}</span>
                        </div>
                      )}
                    </div>

                    {/* Botón de acción */}
                    <div className="mt-3 pt-3 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => setSelectedEmpleadoId(empleado.id)}
                      >
                        Programar Turnos
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {getFilteredEmpleados().length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium text-gray-500">No se encontraron empleados</p>
                <p className="text-sm text-gray-400 mt-1">
                  {searchTerm || activeFiltersCount > 0
                    ? "Intenta ajustar los filtros o términos de búsqueda"
                    : "No hay empleados registrados"
                  }
                </p>
              </div>
            )}
          </div>
        )
      ) : null}

      {/* ── Employee info bar ── */}
      {selectedEmpleado && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-blue-50/60 dark:bg-blue-950/30 border-blue-200/60 flex-wrap">
          {/* Avatar inicial */}
          <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
            {selectedEmpleado.nombres.charAt(0)}{selectedEmpleado.apellidos.charAt(0)}
          </div>

          {/* Nombre + CC */}
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-base leading-tight text-blue-900 dark:text-blue-100">
              {selectedEmpleado.nombres} {selectedEmpleado.apellidos}
            </span>
            <span className="text-xs text-blue-600/80 dark:text-blue-300">
              CC {selectedEmpleado.numeroDocumento}
            </span>
          </div>

          <div className="w-px h-8 bg-blue-200 hidden sm:block" />

          {/* Período */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5 text-sm text-blue-800 dark:text-blue-200">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-blue-500 uppercase tracking-wide">Desde</span>
              <span className="font-semibold capitalize">
                {startDate
                  ? parseLocalDate(startDate).toLocaleDateString("es-CO", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
                  : "—"}
              </span>
            </div>
            <span className="text-blue-400 hidden sm:inline">→</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-blue-500 uppercase tracking-wide">Hasta</span>
              <span className="font-semibold capitalize">
                {endDate
                  ? parseLocalDate(endDate).toLocaleDateString("es-CO", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
                  : "—"}
              </span>
            </div>
          </div>

          <div className="w-px h-8 bg-blue-200 hidden sm:block" />

          {/* Horas + Sin guardar */}
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {totalHoras !== 0 && (
              <Badge variant="secondary" className="text-xs gap-1 bg-blue-100 text-blue-800 border-blue-200">
                <Clock className="h-3 w-3" />
                {totalHoras.toFixed(1)} h en el período
              </Badge>
            )}
            {periodBreakMinutes > 0 && (
              <Badge variant="secondary" className="text-xs gap-1 bg-orange-50 text-orange-700 border border-orange-200">
                <UtensilsCrossed className="h-3 w-3" />
                {periodBreakMinutes}min desc. alim.
              </Badge>
            )}
            {dirtyDates.size > 0 && (
              <Badge variant="outline" className="text-orange-600 border-orange-300 gap-1 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
                {dirtyDates.size} sin guardar
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* ── Results View ── */}
      {selectedEmpleado && showResults && (
        <div className="space-y-6">
          {weeks.map((week, wi) => {
            // Build day results with running weekly total
            let weekRunning = 0
            const dayResults = week.map(date => {
              const dk = localDateKey(date)
              const inRange = startDateObj && endDateObj && date >= startDateObj && date <= endDateObj
              const a = getAsignacion(dk)
              const cls = a ? getDayClassification(a, date, weekRunning, horasSemana, getEffectiveBreak(a)) : null
              const total = cls
                ? cls.ordinarias + cls.nocturnas + cls.festivas + cls.nocturnasFestivas +
                cls.extraDiurna + cls.extraNocturna + cls.extraFestiva + cls.extraNocturnaFestiva
                : 0
              if (cls) weekRunning += Math.max(0, total)
              const turno = a?.concepto.categoria === "TURNO_LABORAL" ? a.concepto : null
              const novedad = a?.novedad || (a?.concepto.categoria !== "TURNO_LABORAL" ? a?.concepto : null) || null
              const display = turno ?? novedad ?? null
              return { date, dk, inRange, a, cls, total, display }
            })

            // Week totals
            const totCls = dayResults.reduce((acc, dr) => ({
              ordinarias: acc.ordinarias + (dr.cls?.ordinarias ?? 0),
              nocturnas: acc.nocturnas + (dr.cls?.nocturnas ?? 0),
              festivas: acc.festivas + (dr.cls?.festivas ?? 0),
              nocturnasFestivas: acc.nocturnasFestivas + (dr.cls?.nocturnasFestivas ?? 0),
              extraDiurna: acc.extraDiurna + (dr.cls?.extraDiurna ?? 0),
              extraNocturna: acc.extraNocturna + (dr.cls?.extraNocturna ?? 0),
              extraFestiva: acc.extraFestiva + (dr.cls?.extraFestiva ?? 0),
              extraNocturnaFestiva: acc.extraNocturnaFestiva + (dr.cls?.extraNocturnaFestiva ?? 0),
            }), { ...EMPTY_CLASS })
            const totHoras = dayResults.reduce((s, dr) => s + dr.total, 0)

            // Tope configurable desde Configuración → Legal → Jornada
            const TOPE_SEMANAL = horasSemana
            // Horas positivas realmente programadas (excluye descuentos/ausencias negativas)
            const horasPositivas = dayResults.reduce((s, dr) => s + Math.max(0, dr.total), 0)
            // Horas extras ya clasificadas en la tabla
            const extrasTotal = totCls.extraDiurna + totCls.extraNocturna + totCls.extraFestiva + totCls.extraNocturnaFestiva
            // Déficit: horas que faltan para llegar a 44h
            const deficit = Math.max(0, TOPE_SEMANAL - horasPositivas)

            const fmt = (n: number) => {
              if (n === 0) return <span className="text-muted-foreground/40">0.0</span>
              const colored = n < 0 ? "text-red-500" : ""
              return <span className={colored}>{n.toFixed(1)}</span>
            }

            return (
              <div key={wi} className="rounded-2xl overflow-hidden border shadow-sm">
                {/* Week header */}
                <div className="bg-[#1e3a6e] text-white px-4 py-2 flex items-center justify-between">
                  <span className="font-semibold text-sm">
                    Semana {wi + 1} ({week[0].toLocaleDateString("es-CO", { day: "numeric", month: "numeric", year: "numeric" })} – {week[6].toLocaleDateString("es-CO", { day: "numeric", month: "numeric", year: "numeric" })})
                  </span>
                </div>

                {/* Tope banner */}
                <div className={[
                  "border-b px-4 py-2 text-sm flex flex-wrap items-center gap-x-4 gap-y-1",
                  extrasTotal > 0
                    ? "bg-red-50 border-red-200 text-red-800"
                    : deficit > 0
                      ? "bg-amber-50 border-amber-200 text-amber-800"
                      : "bg-green-50 border-green-200 text-green-800"
                ].join(" ")}>
                  <span>
                    Objetivo semana:&nbsp;<strong>{TOPE_SEMANAL}h</strong>
                  </span>
                  <span>
                    Programadas:&nbsp;<strong>{horasPositivas.toFixed(2)}h</strong>
                  </span>
                  {deficit > 0 && (
                    <span className="font-semibold">
                      ⚠ Déficit:&nbsp;{deficit.toFixed(2)}h (faltan para completar la semana)
                    </span>
                  )}
                  {extrasTotal > 0 && deficit === 0 && (
                    <span className="font-semibold">
                      ⏱ Horas extras:&nbsp;{extrasTotal.toFixed(2)}h sobre las 44h
                    </span>
                  )}
                  {deficit === 0 && extrasTotal === 0 && (
                    <span className="font-semibold">✓ Semana completa</span>
                  )}
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#2d4a8a] text-white text-[11px]">
                        <th className="px-3 py-2 text-left font-medium w-24">Día</th>
                        <th className="px-2 py-2 text-left font-medium w-20">Turno</th>
                        <th className="px-2 py-2 text-center font-medium">Horas<br />Ordinarias</th>
                        <th className="px-2 py-2 text-center font-medium">Horas<br />Nocturnas</th>
                        <th className="px-2 py-2 text-center font-medium">Horas<br />Festivas</th>
                        <th className="px-2 py-2 text-center font-medium">Horas<br />Noc. Festivas</th>
                        <th className="px-2 py-2 text-center font-medium">Extras<br />Ordinarias</th>
                        <th className="px-2 py-2 text-center font-medium">Extras<br />Nocturnas</th>
                        <th className="px-2 py-2 text-center font-medium">Extras<br />Festivas</th>
                        <th className="px-2 py-2 text-center font-medium">Extras<br />Noc. Festivas</th>
                        <th className="px-2 py-2 text-center font-medium">Horas<br />x Turno</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayResults.map((dr, di) => {
                        const festivo = isFestivo(dr.date)
                        const rowBg = festivo ? "bg-red-50" : di % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                        const dayName = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][dr.date.getDay()]
                        const dateLabel = dr.date.toLocaleDateString("es-CO", { day: "numeric", month: "numeric", year: "numeric" })
                        return (
                          <tr key={di} className={`${rowBg} border-b border-gray-100 ${!dr.inRange ? "opacity-40" : ""}`}>
                            <td className="px-3 py-2">
                              <div className="font-semibold">{dayName}</div>
                              <div className="text-muted-foreground">{dateLabel}</div>
                            </td>
                            <td className="px-2 py-2">
                              {dr.display ? (
                                <div className="flex flex-col gap-0.5">
                                  <div
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded self-start text-[11px] font-bold"
                                    style={{
                                      backgroundColor: (dr.display.color || "#94a3b8") + "22",
                                      color: dr.display.color || "#64748b",
                                    }}
                                  >
                                    <span>{dr.display.icono}</span>
                                    <span>{dr.display.codigo}</span>
                                  </div>
                                  {(dr.a?.horaInicioPersonalizada || dr.display.horaInicioDefecto) && (
                                    <span className="text-[9px] text-muted-foreground leading-tight">
                                      {dr.a?.horaInicioPersonalizada || dr.display.horaInicioDefecto}–{dr.a?.horaFinPersonalizada || dr.display.horaFinDefecto}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground/40 text-xs">—</span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-center text-green-700">{dr.cls ? fmt(dr.cls.ordinarias) : <span className="text-muted-foreground/40">0.0</span>}</td>
                            <td className="px-2 py-2 text-center text-blue-700">{dr.cls ? fmt(dr.cls.nocturnas) : <span className="text-muted-foreground/40">0.0</span>}</td>
                            <td className="px-2 py-2 text-center text-orange-600">{dr.cls ? fmt(dr.cls.festivas) : <span className="text-muted-foreground/40">0.0</span>}</td>
                            <td className="px-2 py-2 text-center text-purple-700">{dr.cls ? fmt(dr.cls.nocturnasFestivas) : <span className="text-muted-foreground/40">0.0</span>}</td>
                            <td className="px-2 py-2 text-center text-emerald-600">{dr.cls ? fmt(dr.cls.extraDiurna) : <span className="text-muted-foreground/40">0.0</span>}</td>
                            <td className="px-2 py-2 text-center text-cyan-600">{dr.cls ? fmt(dr.cls.extraNocturna) : <span className="text-muted-foreground/40">0.0</span>}</td>
                            <td className="px-2 py-2 text-center text-amber-600">{dr.cls ? fmt(dr.cls.extraFestiva) : <span className="text-muted-foreground/40">0.0</span>}</td>
                            <td className="px-2 py-2 text-center text-rose-600">{dr.cls ? fmt(dr.cls.extraNocturnaFestiva) : <span className="text-muted-foreground/40">0.0</span>}</td>
                            <td className="px-2 py-2 text-center font-bold">{dr.total !== 0 ? dr.total.toFixed(1) : <span className="text-muted-foreground/40">0.0</span>}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#1e3a6e] border-t-2 border-blue-400/60 font-bold text-[11px]">
                        <td className="px-3 py-2.5 text-white" colSpan={2}>TOTAL SEMANA</td>
                        {[
                          totCls.ordinarias,
                          totCls.nocturnas,
                          totCls.festivas,
                          totCls.nocturnasFestivas,
                          totCls.extraDiurna,
                          totCls.extraNocturna,
                          totCls.extraFestiva,
                          totCls.extraNocturnaFestiva,
                        ].map((val, i) => (
                          <td key={i} className="px-2 py-2.5 text-center">
                            {val === 0
                              ? <span className="text-white/25 font-normal">0.0</span>
                              : <span className="text-white text-xs font-bold">{val.toFixed(1)}</span>
                            }
                          </td>
                        ))}
                        <td className="px-2 py-2.5 text-center">
                          <span className={`text-sm font-bold ${extrasTotal > 0 ? "text-yellow-300" : "text-white"}`}>
                            {totHoras.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Semanal (current behavior) ── */}
      {selectedEmpleado && !showResults && vistaCalendario === 'semanal' &&
        weeks.map((week, wi) => {
          const weekHours = week.reduce((sum, d) => {
            const a = getAsignacion(localDateKey(d))
            return a ? sum + getConceptoHoras(a.concepto, a.horaInicioPersonalizada, a.horaFinPersonalizada, getEffectiveBreak(a)) : sum
          }, 0)
          const overLimit = weekHours > horasSemana

          return (
            <Card key={wi} className="overflow-hidden">
              {/* Week header */}
              <CardHeader className="py-2 px-4 bg-muted/30 border-b flex-row items-center justify-between space-y-0">
                <span className="text-xs font-medium text-muted-foreground">
                  Sem. {wi + 1}&nbsp;·&nbsp;
                  {week[0].toLocaleDateString("es-CO", { day: "numeric", month: "short" })} –{" "}
                  {week[6].toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
                </span>
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1.5">
                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${overLimit ? "bg-destructive" : "bg-primary"}`}
                        style={{ width: `${Math.min((weekHours / horasSemana) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{weekHours.toFixed(1)}/{horasSemana}h</span>
                  </div>
                  <Badge
                    variant={overLimit ? "destructive" : weekHours > 0 ? "default" : "secondary"}
                    className="text-xs py-0 h-5"
                  >
                    {weekHours.toFixed(1)} h
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-2">
                <div className="grid grid-cols-7 gap-1.5">
                  {week.map((date, di) => {
                    const dk = localDateKey(date)
                    const asignacion = getAsignacion(dk)
                    const inRange =
                      startDateObj && endDateObj && date >= startDateObj && date <= endDateObj
                    const dirty = dirtyDates.has(dk)
                    const publicHoliday = FESTIVOS_CO.has(dk)
                    const isSunday = date.getDay() === 0
                    const isSaturday = date.getDay() === 6
                    const festivo = publicHoliday || isSunday
                    const calculatedPeriod = inRange ? getCalculatedPeriodForDate(dk) : null

                    const turno =
                      asignacion?.concepto.categoria === "TURNO_LABORAL"
                        ? asignacion.concepto
                        : null
                    const novedad =
                      asignacion?.novedad ||
                      (asignacion?.concepto.categoria !== "TURNO_LABORAL"
                        ? asignacion?.concepto
                        : null) ||
                      null
                    const displayConcepto = turno ?? novedad ?? null
                    const horas = asignacion ? getConceptoHoras(asignacion.concepto, asignacion.horaInicioPersonalizada, asignacion.horaFinPersonalizada, getEffectiveBreak(asignacion)) : 0
                    const color = displayConcepto?.color || null

                    return (
                      <div key={di} className="flex flex-col gap-1">
                        <div className={`text-center leading-none ${!inRange ? "opacity-25" : ""}`}>
                          <div className={`text-[10px] font-semibold uppercase ${festivo ? "text-red-500" : "text-muted-foreground"}`}>
                            {DIAS[di]}
                          </div>
                          <div className={`text-sm font-bold ${festivo ? "text-red-500" : ""}`}>
                            {date.getDate()}
                          </div>
                        </div>

                        <div
                          onClick={() => {
                            if (!inRange) return
                            if (asignacion && !dirty) { setLockedConfirmDate(dk) } else { openPicker(dk) }
                          }}
                          title={
                            calculatedPeriod
                              ? `⚠ Período calculado: ${calculatedPeriod.nombrePeriodo}`
                              : asignacion
                                ? [turno ? turno.nombre : null, novedad ? novedad.nombre : null, horas ? `${horas}h` : null].filter(Boolean).join(" + ")
                                : undefined
                          }
                          className={[
                            "relative rounded-lg border-2 transition-all select-none",
                            "h-[60px] flex flex-col items-center justify-center gap-0.5 p-1",
                            !inRange
                              ? "opacity-20 border-dashed border-gray-200 cursor-not-allowed"
                              : asignacion
                                ? "cursor-pointer hover:opacity-75 border-solid"
                                : [
                                  "cursor-pointer border-dashed border-gray-200",
                                  "hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10",
                                  publicHoliday ? "bg-orange-200/60 dark:bg-orange-900/40" :
                                    isSunday ? "bg-orange-50 dark:bg-orange-950/30" :
                                      isSaturday ? "bg-slate-50 dark:bg-slate-900/30" : "",
                                ].join(" "),
                          ].join(" ")}
                          style={
                            asignacion
                              ? { borderColor: color || "#94a3b8", backgroundColor: (color || "#94a3b8") + "1a" }
                              : {}
                          }
                        >
                          {dirty && inRange && (
                            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-orange-400" />
                          )}
                          {asignacion && !dirty && inRange && (
                            <span className="absolute top-0.5 right-0.5 rounded bg-white/80 p-0.5" title="Turno guardado — clic para editar">
                              <Lock className="h-2.5 w-2.5 text-slate-500" />
                            </span>
                          )}
                          {calculatedPeriod && inRange && (
                            <span className="absolute bottom-0.5 right-0.5" title={`Período calculado: ${calculatedPeriod.nombrePeriodo}`}>
                              <Lock className="h-2.5 w-2.5 text-amber-500 opacity-80" />
                            </span>
                          )}
                          {festivo && inRange && !asignacion && (
                            <span className="absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full bg-red-400 opacity-60" />
                          )}

                          {asignacion ? (
                            <>
                              <span className="text-base leading-none">{displayConcepto?.icono || "📅"}</span>
                              <span
                                className="text-[11px] font-bold leading-none"
                                style={{ color: color || "inherit" }}
                              >
                                {displayConcepto?.codigo}
                              </span>
                              {horas > 0 && (
                                <span className="text-[9px] text-muted-foreground leading-none">
                                  {horas % 1 === 0 ? horas : horas.toFixed(1)}h
                                </span>
                              )}
                              {asignacion && getEffectiveBreak(asignacion) > 0 && (
                                <span className="text-[8px] text-orange-400 leading-none" title={`Descuento alim.: ${getEffectiveBreak(asignacion)}min`}>
                                  🍽
                                </span>
                              )}
                              {turno && novedad && (
                                <span
                                  className="absolute bottom-0.5 left-0.5 text-[8px] font-bold px-0.5 rounded leading-tight"
                                  style={{
                                    color: novedad.color || "#64748b",
                                    backgroundColor: (novedad.color || "#64748b") + "28",
                                  }}
                                >
                                  {novedad.codigo}
                                </span>
                              )}
                            </>
                          ) : inRange ? (
                            <Plus className="h-3.5 w-3.5 text-gray-300" />
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}

      {/* ── Mensual ── */}
      {selectedEmpleado && !showResults && vistaCalendario === 'mensual' && (
        <div className="space-y-4">
          {getMonthsInRange(startDate, endDate).map(({ year, month }) => {
            const monthStart = new Date(year, month, 1, 12)
            const monthEnd = new Date(year, month + 1, 0, 12)
            const firstDayOfWeek = monthStart.getDay() // 0=Sun
            const daysInMonth = monthEnd.getDate()
            const monthName = monthStart.toLocaleDateString("es-CO", { month: "long", year: "numeric" })

            // Build calendar cells: leading empties + day cells
            const cells: (number | null)[] = [
              ...Array(firstDayOfWeek).fill(null),
              ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
            ]
            // Pad to complete last row
            while (cells.length % 7 !== 0) cells.push(null)

            return (
              <Card key={`${year}-${month}`} className="overflow-hidden">
                <div className="bg-[#1e3a6e] text-white px-4 py-2.5">
                  <span className="font-semibold text-sm capitalize">{monthName}</span>
                </div>
                <CardContent className="p-3">
                  {/* Day-of-week header */}
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {DIAS.map(d => (
                      <div key={d} className="text-center text-[10px] font-bold text-muted-foreground uppercase py-1">
                        {d}
                      </div>
                    ))}
                  </div>
                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {cells.map((day, ci) => {
                      if (day === null) return <div key={ci} />
                      const date = new Date(year, month, day, 12)
                      const dk = localDateKey(date)
                      const inRange = startDateObj && endDateObj && date >= startDateObj && date <= endDateObj
                      const asignacion = getAsignacion(dk)
                      const publicHoliday = FESTIVOS_CO.has(dk)
                      const isSunday = date.getDay() === 0
                      const festivo = publicHoliday || isSunday
                      const dirty = dirtyDates.has(dk)
                      const calculatedPeriodM = inRange ? getCalculatedPeriodForDate(dk) : null
                      const turno = asignacion?.concepto.categoria === "TURNO_LABORAL" ? asignacion.concepto : null
                      const novedad = asignacion?.novedad || (asignacion?.concepto.categoria !== "TURNO_LABORAL" ? asignacion?.concepto : null) || null
                      const displayConcepto = turno ?? novedad ?? null
                      const color = displayConcepto?.color || null

                      return (
                        <div
                          key={ci}
                          onClick={() => {
                            if (!inRange) return
                            if (asignacion && !dirty) { setLockedConfirmDate(dk) } else { openPicker(dk) }
                          }}
                          title={calculatedPeriodM ? `⚠ Período calculado: ${calculatedPeriodM.nombrePeriodo}` : undefined}
                          className={[
                            "relative rounded-lg border-2 transition-all select-none",
                            "h-[54px] flex flex-col items-center justify-center gap-0.5 p-1 cursor-pointer",
                            !inRange
                              ? "opacity-20 border-dashed border-gray-200 cursor-not-allowed"
                              : asignacion
                                ? "hover:opacity-75 border-solid"
                                : [
                                  "border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/50",
                                  festivo ? "bg-red-50/60" : "",
                                ].join(" "),
                          ].join(" ")}
                          style={asignacion && inRange ? { borderColor: color || "#94a3b8", backgroundColor: (color || "#94a3b8") + "1a" } : {}}
                        >
                          {dirty && inRange && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-orange-400" />}
                          {asignacion && !dirty && inRange && (
                            <span className="absolute top-0.5 right-0.5 rounded bg-white/80 p-0.5" title="Turno guardado — clic para editar">
                              <Lock className="h-2 w-2 text-slate-500" />
                            </span>
                          )}
                          {calculatedPeriodM && inRange && (
                            <span className="absolute bottom-0.5 right-0.5">
                              <Lock className="h-2 w-2 text-amber-500 opacity-80" />
                            </span>
                          )}
                          <span className={`text-[10px] font-bold ${festivo ? "text-red-500" : "text-muted-foreground"}`}>
                            {day}
                          </span>
                          {asignacion && inRange ? (
                            <>
                              <span className="text-sm leading-none">{displayConcepto?.icono || "📅"}</span>
                              <span className="text-[9px] font-bold leading-none" style={{ color: color || "inherit" }}>
                                {displayConcepto?.codigo}
                              </span>
                            </>
                          ) : inRange ? (
                            <Plus className="h-3 w-3 text-gray-300" />
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Diario ── */}
      {selectedEmpleado && !showResults && vistaCalendario === 'diario' && (() => {
        const diaDate = parseLocalDate(diaActual)
        const dk = localDateKey(diaDate)
        const asignacion = getAsignacion(dk)
        const festivo = isFestivo(diaDate)
        const turno = asignacion?.concepto.categoria === "TURNO_LABORAL" ? asignacion.concepto : null
        const novedad = asignacion?.novedad || (asignacion?.concepto.categoria !== "TURNO_LABORAL" ? asignacion?.concepto : null) || null
        const displayConcepto = turno ?? novedad ?? null
        const horas = asignacion ? getConceptoHoras(asignacion.concepto, asignacion.horaInicioPersonalizada, asignacion.horaFinPersonalizada, getEffectiveBreak(asignacion)) : 0
        const color = displayConcepto?.color || null

        // Compute weekTotalSoFar: sum of all days in the same calendar week before diaDate
        const weekDay = diaDate.getDay() // 0=Sun
        const weekSunday = new Date(diaDate.getFullYear(), diaDate.getMonth(), diaDate.getDate() - weekDay, 12)
        let weekTotalSoFar = 0
        for (let i = 0; i < weekDay; i++) {
          const d = new Date(weekSunday.getFullYear(), weekSunday.getMonth(), weekSunday.getDate() + i, 12)
          const a = getAsignacion(localDateKey(d))
          if (a) weekTotalSoFar += Math.max(0, getConceptoHoras(a.concepto, a.horaInicioPersonalizada, a.horaFinPersonalizada, getEffectiveBreak(a)))
        }

        const cls = asignacion ? getDayClassification(asignacion, diaDate, weekTotalSoFar, horasSemana, getEffectiveBreak(asignacion)) : null

        const prevDay = new Date(diaDate.getFullYear(), diaDate.getMonth(), diaDate.getDate() - 1, 12)
        const nextDay = new Date(diaDate.getFullYear(), diaDate.getMonth(), diaDate.getDate() + 1, 12)
        const canPrev = startDateObj && prevDay >= startDateObj
        const canNext = endDateObj && nextDay <= endDateObj
        const calculatedPeriodD = getCalculatedPeriodForDate(dk)

        const dayLabel = diaDate.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

        const hourRows = cls ? [
          { label: "Ordinarias", val: cls.ordinarias, color: "text-green-700" },
          { label: "Nocturnas", val: cls.nocturnas, color: "text-blue-700" },
          { label: "Festivas", val: cls.festivas, color: "text-orange-600" },
          { label: "Noc. Festivas", val: cls.nocturnasFestivas, color: "text-purple-700" },
          { label: "Extra Diurna", val: cls.extraDiurna, color: "text-emerald-600" },
          { label: "Extra Nocturna", val: cls.extraNocturna, color: "text-cyan-600" },
          { label: "Extra Festiva", val: cls.extraFestiva, color: "text-amber-600" },
          { label: "Extra Noc. Fest.", val: cls.extraNocturnaFestiva, color: "text-rose-600" },
        ].filter(r => r.val !== 0) : []

        return (
          <Card className="overflow-hidden">
            {/* Day navigation header */}
            <div className="bg-[#1e3a6e] text-white px-4 py-3 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 gap-1 disabled:opacity-40"
                disabled={!canPrev}
                onClick={() => canPrev && setDiaActual(localDateKey(prevDay))}
              >
                ← Anterior
              </Button>
              <span className="font-semibold text-sm capitalize text-center">{dayLabel}</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 gap-1 disabled:opacity-40"
                disabled={!canNext}
                onClick={() => canNext && setDiaActual(localDateKey(nextDay))}
              >
                Siguiente →
              </Button>
            </div>

            <CardContent className="p-5 space-y-5">
              {/* Calculated period warning */}
              {calculatedPeriodD && (
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  <div>
                    <p className="text-sm font-semibold">Período ya calculado</p>
                    <p className="text-xs mt-0.5">
                      Este día pertenece al período <strong>{calculatedPeriodD.nombrePeriodo}</strong> ({calculatedPeriodD.estadoPeriodo}).
                      Puedes editar, pero el cambio quedará registrado en auditoría.
                    </p>
                  </div>
                </div>
              )}

              {/* Day type badge */}
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full ${festivo ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                  {festivo ? "🎉 Día festivo / domingo" : "💼 Día laboral"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Semana acumulada antes de hoy: <strong>{weekTotalSoFar.toFixed(1)}h</strong>
                </span>
              </div>

              {/* Current shift */}
              {asignacion ? (
                <div
                  className="rounded-xl border-2 p-4 flex items-center gap-4"
                  style={{ borderColor: color || "#94a3b8", backgroundColor: (color || "#94a3b8") + "12" }}
                >
                  <span className="text-4xl">{displayConcepto?.icono || "📅"}</span>
                  <div className="flex-1">
                    <p className="font-bold text-lg" style={{ color: color || "inherit" }}>
                      {displayConcepto?.codigo} — {displayConcepto?.nombre}
                    </p>
                    {(asignacion.horaInicioPersonalizada || displayConcepto?.horaInicioDefecto) && (
                      <p className="text-sm text-muted-foreground">
                        {asignacion.horaInicioPersonalizada || displayConcepto?.horaInicioDefecto} – {asignacion.horaFinPersonalizada || displayConcepto?.horaFinDefecto}
                      </p>
                    )}
                    {horas !== 0 && (
                      <p className="text-sm font-semibold mt-0.5">{Math.abs(horas).toFixed(1)}h</p>
                    )}
                    {turno && novedad && (
                      <span className="inline-flex items-center gap-1 mt-1 text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ color: novedad.color || "#f59e0b", backgroundColor: (novedad.color || "#f59e0b") + "18" }}>
                        {novedad.icono} {novedad.codigo} — {novedad.nombre}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openPicker(dk)}
                    className="shrink-0"
                  >
                    Cambiar
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full h-14 text-base gap-2 bg-[#1e3a6e] hover:bg-[#1e3a6e]/90"
                  onClick={() => openPicker(dk)}
                >
                  <Plus className="h-5 w-5" />
                  Asignar turno
                </Button>
              )}

              {/* Hour breakdown */}
              {cls && hourRows.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                    Desglose de horas
                  </p>
                  <div className="rounded-xl border overflow-hidden">
                    {hourRows.map((row, i) => (
                      <div key={i} className={`flex justify-between px-3 py-2 text-sm ${i % 2 === 0 ? "bg-muted/20" : ""}`}>
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className={`font-semibold ${row.color}`}>{row.val.toFixed(1)} h</span>
                      </div>
                    ))}
                    <div className="flex justify-between px-3 py-2 text-sm font-bold bg-muted/40 border-t">
                      <span>Total del día</span>
                      <span>{horas.toFixed(1)} h</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })()}

      {/* ── Reference Panel ── */}
      {selectedEmpleadoId && conceptos.length > 0 && (
        <Card className="overflow-hidden">
          <button
            type="button"
            onClick={() => setShowLegend(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b hover:bg-muted/50 transition-colors text-left"
          >
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <span>📋</span> Referencia de conceptos
            </span>
            <span className="text-xs text-muted-foreground">{showLegend ? "▲ Ocultar" : "▼ Ver"}</span>
          </button>
          {showLegend && (
            <CardContent className="p-3 space-y-3">
              {/* Turnos */}
              {turnoConceptos.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                    Turnos de trabajo
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                    {turnoConceptos.map(c => {
                      const hrs = getConceptoHoras(c)
                      const schedule = c.horaInicioDefecto
                        ? `${c.horaInicioDefecto} – ${c.horaFinDefecto}`
                        : c.codigo === "M" ? "Horario personalizado" : "—"
                      const horasLabel = hrs !== 0 ? `${Math.abs(hrs)}h` : ""
                      return (
                        <div
                          key={c.id}
                          className="flex items-center gap-2 p-2 rounded-lg border"
                          style={{
                            borderColor: (c.color || "#3b82f6") + "50",
                            backgroundColor: (c.color || "#3b82f6") + "0d",
                          }}
                        >
                          <span className="text-xl shrink-0">{c.icono || "🔵"}</span>
                          <div className="min-w-0">
                            <div className="flex items-baseline gap-1 flex-wrap">
                              <span className="text-xs font-bold shrink-0" style={{ color: c.color || "#3b82f6" }}>
                                {c.codigo}
                              </span>
                              <span className="text-[11px] text-foreground font-medium truncate">{c.nombre}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground leading-tight">
                              {schedule}{horasLabel ? ` · ${horasLabel}` : ""}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {/* Novedades */}
              {novedadConceptos.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                    Novedades y permisos
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                    {novedadConceptos.map(c => {
                      const hrs = getConceptoHoras(c)
                      const horasLabel = hrs !== 0 ? `${Math.abs(hrs)}h` : "—"
                      const impacto = c.tipoImpacto === "RESTA_HORAS" ? "Descuento" : c.tipoImpacto === "NEUTRO" ? "Sin impacto" : "Pago"
                      return (
                        <div
                          key={c.id}
                          className="flex items-center gap-2 p-2 rounded-lg border"
                          style={{
                            borderColor: (c.color || "#f59e0b") + "50",
                            backgroundColor: (c.color || "#f59e0b") + "0d",
                          }}
                        >
                          <span className="text-xl shrink-0">{c.icono || "📋"}</span>
                          <div className="min-w-0">
                            <div className="flex items-baseline gap-1 flex-wrap">
                              <span className="text-xs font-bold shrink-0" style={{ color: c.color || "#f59e0b" }}>
                                {c.codigo}
                              </span>
                              <span className="text-[11px] text-foreground font-medium truncate">{c.nombre}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground leading-tight">
                              {horasLabel} · {impacto}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Locked-shift confirm modal ── */}
      {lockedConfirmDate && (() => {
        const lkAsig = getAsignacion(lockedConfirmDate)
        if (!lkAsig) return null
        const lkDate  = parseLocalDate(lockedConfirmDate)
        const lkTurno = lkAsig.concepto.categoria === "TURNO_LABORAL" ? lkAsig.concepto : null
        const lkNov   = lkAsig.novedad || (lkAsig.concepto.categoria !== "TURNO_LABORAL" ? lkAsig.concepto : null) || null
        const lkDisp  = lkTurno ?? lkNov ?? null
        const lkColor = lkDisp?.color || null
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setLockedConfirmDate(null)}>
            <div className="bg-background w-full max-w-xs rounded-2xl shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}>
              <div className="px-5 py-4 border-b bg-slate-50 flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-slate-500" />
                    <h3 className="font-bold text-base text-gray-900">Turno guardado</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                    {lkDate.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setLockedConfirmDate(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="px-5 py-4 space-y-4">
                <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
                  style={{ borderColor: lkColor || "#94a3b8", backgroundColor: (lkColor || "#94a3b8") + "12" }}>
                  <span className="text-2xl">{lkDisp?.icono || "📅"}</span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: lkColor || "inherit" }}>
                      {lkDisp?.codigo} — {lkDisp?.nombre}
                    </p>
                    {(lkAsig.horaInicioPersonalizada || lkDisp?.horaInicioDefecto) && (
                      <p className="text-xs text-muted-foreground">
                        {lkAsig.horaInicioPersonalizada || lkDisp?.horaInicioDefecto} – {lkAsig.horaFinPersonalizada || lkDisp?.horaFinDefecto}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground text-center">¿Qué deseas hacer con este turno?</p>
                <div className="flex gap-2">
                  <Button className="flex-1 gap-1.5" variant="outline"
                    onClick={() => { openPicker(lockedConfirmDate); setLockedConfirmDate(null) }}>
                    ✏️ Editar
                  </Button>
                  <Button className="flex-1 gap-1.5" variant="destructive"
                    onClick={() => { removeShift(lockedConfirmDate); setLockedConfirmDate(null) }}>
                    🗑️ Eliminar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Shift Picker Modal ── */}
      {pickerDate && pickerDateObj && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={closePicker}
        >
          <div
            className="bg-background w-full sm:max-w-3xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[80vh] sm:rounded-2xl rounded-t-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* ── Header compacto ── */}
            <div className={[
              "px-5 py-3 flex items-center justify-between gap-4",
              isFestivo(pickerDateObj)
                ? "bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/40 dark:to-orange-950/40 border-b border-red-100"
                : "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b border-blue-100",
            ].join(" ")}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {isFestivo(pickerDateObj) ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 shrink-0">
                    🎉 Festivo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 shrink-0">
                    💼 Laboral
                  </span>
                )}
                <h3 className="font-bold text-base capitalize leading-tight text-foreground truncate">
                  {pickerDateObj.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
                </h3>
                {/* Selección actual */}
                {(pickerTurnoId || pickerNovedadId) && (
                  <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
                    {pickerTurnoId && (() => {
                      const t = conceptos.find(c => c.id === pickerTurnoId)
                      return t ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border"
                          style={{ borderColor: t.color || "#3b82f6", color: t.color || "#3b82f6", backgroundColor: (t.color || "#3b82f6") + "15" }}>
                          {t.icono} {t.codigo}
                        </span>
                      ) : null
                    })()}
                    {pickerNovedadId && (() => {
                      const n = conceptos.find(c => c.id === pickerNovedadId)
                      return n ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border"
                          style={{ borderColor: n.color || "#f59e0b", color: n.color || "#f59e0b", backgroundColor: (n.color || "#f59e0b") + "15" }}>
                          {n.icono} {n.codigo}
                        </span>
                      ) : null
                    })()}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={closePicker}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* ── Calculated period warning in picker ── */}
            {pickerDate && getCalculatedPeriodForDate(pickerDate) && (() => {
              const cp = getCalculatedPeriodForDate(pickerDate)!
              return (
                <div className="flex items-center gap-2.5 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 shrink-0">
                  <Lock className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <p className="text-xs">
                    <strong>Período calculado:</strong> {cp.nombrePeriodo} — el cambio se registrará en auditoría.
                  </p>
                </div>
              )
            })()}

            {/* ── Body: dos columnas ── */}
            <div className="flex flex-col sm:flex-row overflow-hidden flex-1 min-h-0">

              {/* — Columna Turnos — */}
              {turnoConceptos.length > 0 && (
                <div className="flex-1 overflow-y-auto px-4 pt-3 pb-3 border-b sm:border-b-0 sm:border-r border-dashed border-border/60">
                  <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                    Turno de trabajo
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {turnoConceptos.map(c => {
                      const sel = pickerTurnoId === c.id
                      const isManual = manualConcepto?.id === c.id
                      const hrs = getConceptoHoras(c)
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            if (isManual) {
                              setPickerTurnoId(sel ? null : c.id)
                            } else {
                              const brkFinal = pickerBreakMin === -1 ? pickerBreakCustom : pickerBreakMin
                              assignShift(pickerDate!, c.id, pickerNovedadId || null, undefined, undefined,
                                brkFinal !== periodBreakMinutes ? brkFinal : null)
                              closePicker()
                            }
                          }}
                          className={[
                            "flex items-center gap-2 px-2.5 py-2 rounded-lg border-2 text-left transition-all",
                            "hover:shadow-sm active:scale-[0.98]",
                            sel
                              ? "shadow-sm"
                              : "border-border/60 hover:border-gray-300 bg-card",
                          ].join(" ")}
                          style={sel ? {
                            borderColor: c.color || "#3b82f6",
                            backgroundColor: (c.color || "#3b82f6") + "12",
                          } : {}}
                        >
                          <span className="text-xl shrink-0 leading-none">{c.icono || "🔵"}</span>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-xs leading-tight" style={{ color: c.color || "inherit" }}>
                              {c.codigo}
                              {sel && <span className="ml-1">✓</span>}
                            </div>
                            <div className="text-[11px] text-foreground/80 leading-tight truncate">{c.nombre}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {c.horaInicioDefecto
                                ? `${c.horaInicioDefecto}–${c.horaFinDefecto}`
                                : isManual ? "Horario libre" : hrs !== 0 ? `${Math.abs(hrs)}h` : "—"}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Horario manual */}
                  {isManualSelected && (
                    <div className="mt-2 p-2.5 rounded-lg bg-muted/60 border border-dashed space-y-2">
                      <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Horario personalizado
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <Label className="text-[10px] text-muted-foreground">Entrada</Label>
                          <Input type="time" value={manualStart} onChange={e => setManualStart(e.target.value)} className="h-8 text-xs" />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[10px] text-muted-foreground">Salida</Label>
                          <Input type="time" value={manualEnd} onChange={e => setManualEnd(e.target.value)} className="h-8 text-xs" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* — Columna Novedades — */}
              {novedadConceptos.length > 0 && (
                <div className="flex-1 overflow-y-auto px-4 pt-3 pb-3">
                  <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                    Novedad / Permiso
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {novedadConceptos.map(c => {
                      const sel = pickerNovedadId === c.id
                      const hrs = getConceptoHoras(c)
                      const impactoLabel =
                        c.tipoImpacto === "RESTA_HORAS" ? "Descuento" :
                          c.tipoImpacto === "NEUTRO" ? "Sin horas" : "Remunerado"
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            const brkFinal = pickerBreakMin === -1 ? pickerBreakCustom : pickerBreakMin
                            assignShift(pickerDate!, pickerTurnoId || null, c.id, undefined, undefined,
                              brkFinal !== periodBreakMinutes ? brkFinal : null)
                            closePicker()
                          }}
                          className={[
                            "flex items-center gap-2 px-2.5 py-2 rounded-lg border-2 text-left transition-all",
                            "hover:shadow-sm active:scale-[0.98]",
                            sel
                              ? "shadow-sm"
                              : "border-border/60 hover:border-gray-300 bg-card",
                          ].join(" ")}
                          style={sel ? {
                            borderColor: c.color || "#f59e0b",
                            backgroundColor: (c.color || "#f59e0b") + "12",
                          } : {}}
                        >
                          <span className="text-xl shrink-0 leading-none">{c.icono || "📋"}</span>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-xs leading-tight" style={{ color: c.color || "#f59e0b" }}>
                              {c.codigo}
                              {sel && <span className="ml-1">✓</span>}
                            </div>
                            <div className="text-[11px] text-foreground/80 leading-tight truncate">{c.nombre}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {hrs !== 0 ? `${Math.abs(hrs)}h` : "—"} · {impactoLabel}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {conceptos.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-muted-foreground text-sm px-4">
                  <p className="font-medium mb-1">No hay conceptos configurados</p>
                  <Link href="/dashboard/settings/concepts" className="text-primary underline text-xs" onClick={closePicker}>
                    Ir a Configuración → Conceptos
                  </Link>
                </div>
              )}
            </div>

            {/* ── Meal break section ── */}
            <div className="px-4 py-3 border-t border-orange-100 bg-orange-50/40 space-y-2 shrink-0">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                <span className="text-[11px] font-semibold text-orange-700 uppercase tracking-wide">
                  Descuento alimentación
                </span>
                {periodBreakMinutes > 0 && (
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    Período: {periodBreakMinutes}min
                  </span>
                )}
              </div>
              <div className="flex gap-1 flex-wrap items-center">
                {([0, 30, 60] as const).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setPickerBreakMin(v)}
                    className={[
                      "text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all",
                      pickerBreakMin === v
                        ? "border-orange-400 bg-orange-100 text-orange-800"
                        : "border-border text-muted-foreground hover:border-orange-300 hover:text-orange-700 bg-background",
                    ].join(" ")}
                  >
                    {v === 0 ? "Sin desc." : v === 30 ? "30 min" : "1 hora"}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPickerBreakMin(-1)}
                  className={[
                    "text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all",
                    pickerBreakMin === -1
                      ? "border-orange-400 bg-orange-100 text-orange-800"
                      : "border-border text-muted-foreground hover:border-orange-300 hover:text-orange-700 bg-background",
                  ].join(" ")}
                >
                  Personalizado
                </button>
                {pickerBreakMin === -1 && (
                  <div className="flex items-center gap-1 ml-1">
                    <Input
                      type="number"
                      min={0}
                      max={120}
                      value={pickerBreakCustom}
                      onChange={e => setPickerBreakCustom(Math.max(0, parseInt(e.target.value) || 0))}
                      className="h-7 w-16 text-xs"
                    />
                    <span className="text-[11px] text-muted-foreground">min</span>
                  </div>
                )}
              </div>
              {/* Effective hours summary */}
              {pickerTurnoId && (() => {
                const pc = conceptos.find(c => c.id === pickerTurnoId)
                if (!pc || pc.tipoImpacto === "NEUTRO") return null
                const rawHours = getConceptoHoras(pc,
                  isManualSelected ? manualStart : undefined,
                  isManualSelected ? manualEnd : undefined,
                  0
                )
                if (rawHours <= 0) return null
                const brkMin = pickerBreakMin === -1 ? pickerBreakCustom : pickerBreakMin
                const effectiveHours = Math.max(0, rawHours - brkMin / 60)
                return (
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <span className="font-medium text-foreground">{rawHours.toFixed(1)}h programadas</span>
                    {brkMin > 0 && (
                      <>
                        <span className="text-orange-500">− {brkMin}min alimentación</span>
                        <span>=</span>
                        <span className="font-semibold text-foreground">{effectiveHours.toFixed(2)}h efectivas</span>
                      </>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* ── Footer ── */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-t bg-muted/10">
              {pickerExisting && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/40 hover:bg-destructive/5 gap-1.5"
                  onClick={() => { removeShift(pickerDate!); closePicker() }}
                >
                  <X className="h-3.5 w-3.5" />
                  Eliminar
                </Button>
              )}
              <Button variant="ghost" size="sm" className="flex-1 sm:flex-none" onClick={closePicker}>
                Cancelar
              </Button>
              {isManualSelected && (
                <Button size="sm" className="flex-1 sm:flex-none gap-1.5" onClick={confirmPicker}>
                  <Clock className="h-3.5 w-3.5" />
                  Aplicar horario
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SchedulesPage() {
  return (
    <Suspense>
      <SchedulesPageInner />
    </Suspense>
  )
}
