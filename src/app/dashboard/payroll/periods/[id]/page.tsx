"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Calculator,
  BarChart2,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileEdit,
  RefreshCw,
  Eye,
  X,
  ShieldCheck,
  UtensilsCrossed,
  Save,
} from "lucide-react"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────

interface Resultado {
  totalHorasOrdinarias: number
  totalHorasNocturnas: number
  totalHorasFestivas: number
  totalHorasNoctFestivas: number
  totalExtraDiurna: number
  totalExtraNocturna: number
  totalExtraDiurnaFest: number
  totalExtraNoctFest: number
  totalHorasTrabajadas: number
  totalHorasExtras: number
  salarioBase: number
  auxilioTransporte: number
  totalDevengado: number
  totalDeducciones: number
  netoAPagar: number
}

interface EmpleadoData {
  id: string
  nombres: string
  apellidos: string
  numeroDocumento: string
  tipoVinculacion: string
  salarioBase: number
  turnosCount: number
  resultado: Resultado | null
}

interface Periodo {
  id: string
  nombrePeriodo: string
  tipoPeriodo: string
  estadoPeriodo: string
  fechaInicio: string
  fechaFin: string
  minutosAlimentacion: number | null
}

// ─── Helpers ──────────────────────────────────────────────────

function fmtDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric", month: "long", year: "numeric",
  })
}

function toInputDate(iso: string) {
  return iso.substring(0, 10)
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  BORRADOR:  { label: "Borrador",   color: "bg-slate-100 text-slate-700 border-slate-200", icon: FileEdit },
  PENDIENTE: { label: "Procesando", color: "bg-amber-100 text-amber-700 border-amber-200",  icon: Clock },
  CALCULADO: { label: "Calculado",  color: "bg-green-100 text-green-700 border-green-200",  icon: CheckCircle2 },
  APROBADO:  { label: "Aprobado",   color: "bg-teal-100 text-teal-700 border-teal-200",     icon: CheckCircle2 },
  CERRADO:   { label: "Cerrado",    color: "bg-blue-100 text-blue-700 border-blue-200",     icon: CheckCircle2 },
}

const TIPO_LABEL: Record<string, string> = {
  SEMANAL: "Semanal", QUINCENAL: "Quincenal", MENSUAL: "Mensual",
  TRIMESTRAL: "Trimestral", PERSONALIZADO: "Personalizado",
}

const VINCULACION_SHORT: Record<string, string> = {
  TIEMPO_COMPLETO: "T. Completo",
  MEDIO_TIEMPO: "Medio T.",
  TEMPORAL: "Temporal",
  APRENDIZ_SENA: "Aprendiz",
  PRACTICANTE: "Practicante",
}

// ─── Component ────────────────────────────────────────────────

export default function PeriodoDetailPage() {
  const params = useParams()
  const periodoId = params.id as string

  const [periodo, setPeriodo] = useState<Periodo | null>(null)
  const [empleados, setEmpleados] = useState<EmpleadoData[]>([])
  const [loading, setLoading] = useState(true)
  const [calculando, setCalculando] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [resultadoVista, setResultadoVista] = useState<{ emp: EmpleadoData } | null>(null)
  const [turnosVista, setTurnosVista] = useState<{ emp: EmpleadoData; turnos: any[] } | null>(null)
  const [loadingTurnos, setLoadingTurnos] = useState(false)

  // ── Meal break state ──
  const [breakMin, setBreakMin] = useState<number>(0)
  const [breakCustom, setBreakCustom] = useState<number>(45)
  const [breakSaving, setBreakSaving] = useState(false)

  useEffect(() => { fetchData() }, [periodoId])

  async function fetchData(silent = false) {
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await fetch(`/api/payroll/periods/${periodoId}/employees`)
      if (res.ok) {
        const data = await res.json()
        setPeriodo(data.periodo)
        setEmpleados(data.empleados)
        const m = data.periodo?.minutosAlimentacion ?? 0
        if (m === 0 || m === 30 || m === 60) {
          setBreakMin(m)
        } else {
          setBreakMin(-1)
          setBreakCustom(m)
        }
      } else {
        toast.error("Error al cargar período")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function saveBreakMinutes() {
    if (!periodo) return
    const minutos = breakMin === -1 ? breakCustom : breakMin
    if (breakMin === -1 && (breakCustom <= 0 || breakCustom > 480)) {
      toast.error("Ingresa un valor entre 1 y 480 minutos")
      return
    }
    setBreakSaving(true)
    try {
      const res = await fetch(`/api/payroll/periods/${periodoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombrePeriodo: periodo.nombrePeriodo,
          tipoPeriodo: periodo.tipoPeriodo,
          fechaInicio: periodo.fechaInicio.substring(0, 10),
          fechaFin: periodo.fechaFin.substring(0, 10),
          minutosAlimentacion: minutos,
        }),
      })
      if (res.ok) {
        setPeriodo(prev => prev ? { ...prev, minutosAlimentacion: minutos } : prev)
        toast.success(minutos === 0 ? "Sin descuento de alimentación" : `Descuento de ${minutos} minutos guardado`)
      } else {
        const err = await res.json()
        toast.error(err.error || "Error al guardar")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setBreakSaving(false)
    }
  }

  async function calcular() {
    if (!periodo) return
    setCalculando(true)
    try {
      const res = await fetch(`/api/payroll/periods/${periodoId}/calculate`, { method: "POST" })
      if (res.ok) {
        toast.success("Cálculo iniciado — procesando cada empleado…")
        // Poll for completion
        setTimeout(() => fetchData(true), 4000)
      } else {
        const err = await res.json()
        toast.error(err.error || "Error al iniciar cálculo")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setCalculando(false)
    }
  }

  async function confirmarPeriodo() {
    if (!periodo) return
    setConfirmando(true)
    try {
      const res = await fetch(`/api/payroll/periods/${periodoId}/confirm`, { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        toast.success(data.message || "Período confirmado exitosamente")
        fetchData(true) // Refresh para mostrar nuevo estado
      } else {
        const err = await res.json()
        toast.error(err.error || "Error al confirmar período")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setConfirmando(false)
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-5 w-24 bg-muted rounded animate-pulse" />
        <div className="h-20 bg-muted rounded-xl animate-pulse" />
        <div className="h-12 bg-muted rounded-xl animate-pulse" />
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!periodo) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <AlertCircle className="h-10 w-10 mb-3 opacity-20" />
        <p className="font-medium">Período no encontrado</p>
        <Link href="/dashboard/payroll/periods">
          <Button variant="outline" className="mt-4 gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Volver a Períodos
          </Button>
        </Link>
      </div>
    )
  }

  // ── Derived values ──
  const cfg = STATUS_CONFIG[periodo.estadoPeriodo] ?? STATUS_CONFIG.BORRADOR
  const StatusIcon = cfg.icon
  const startParam = toInputDate(periodo.fechaInicio)
  const endParam = toInputDate(periodo.fechaFin)
  const periodoNombreParam = encodeURIComponent(periodo.nombrePeriodo)

  const programados = empleados.filter(e => e.turnosCount > 0)
  const sinProgramar = empleados.filter(e => e.turnosCount === 0)
  const conResultado = empleados.filter(e => e.resultado !== null)
  const pct = empleados.length > 0 ? Math.round((programados.length / empleados.length) * 100) : 0
  const canCalcular = periodo.estadoPeriodo === "BORRADOR" && programados.length > 0
  const hasResults = periodo.estadoPeriodo === "CALCULADO" || periodo.estadoPeriodo === "CERRADO" || periodo.estadoPeriodo === "APROBADO"
  const allProgrammed = pct === 100 && programados.length > 0
  const allCalculated = conResultado.length > 0 && conResultado.length === programados.length
  const canConfirm = allProgrammed && allCalculated && periodo.estadoPeriodo === "PENDIENTE"

  const fmtCOP = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)

  const handleRemoveEmployee = async (empleadoId: string, nombres: string, apellidos: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar a ${nombres} ${apellidos} del período?\n\nEsta acción eliminará al empleado del período actual pero NO lo eliminará del sistema.`)) {
      return
    }

    try {
      // Aquí deberías llamar a tu API para eliminar la relación empleado-período
      const res = await fetch(`/api/payroll/periods/${periodoId}/employees/${empleadoId}`, {
        method: "DELETE"
      })

      if (res.ok) {
        toast.success("Empleado eliminado del período exitosamente")
        fetchData(true) // Recargar la lista
      } else {
        const error = await res.json()
        toast.error(error.error || "Error al eliminar empleado del período")
      }
    } catch (error) {
      toast.error("Error de conexión")
    }
  }

  function scheduleLink(empId: string) {
    return `/dashboard/schedules/individual?empleadoId=${empId}&startDate=${startParam}&endDate=${endParam}&periodoId=${periodoId}&periodoNombre=${periodoNombreParam}`
  }

  async function verTurnos(emp: EmpleadoData) {
    if (!periodo) return
    setLoadingTurnos(true)
    try {
      const res = await fetch(
        `/api/schedules?startDate=${startParam}&endDate=${endParam}&empleadoId=${emp.id}`
      )
      if (res.ok) {
        const data = await res.json()
        setTurnosVista({ emp, turnos: data })
      } else {
        toast.error("Error al cargar turnos")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setLoadingTurnos(false)
    }
  }

  // ── Employee row ──
  function EmpleadoRow({ emp }: { emp: EmpleadoData }) {
    const tieneTurnos = emp.turnosCount > 0
    const tieneResultado = emp.resultado !== null
    const isBorrador = periodo?.estadoPeriodo === "BORRADOR"

    return (
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
        {/* Status dot */}
        <div className={`w-2 h-2 rounded-full shrink-0 ${tieneResultado ? "bg-green-500" : tieneTurnos ? "bg-blue-500" : "bg-muted-foreground/30"}`} />

        {/* Name + info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm leading-tight truncate">
            {emp.nombres} {emp.apellidos}
          </p>
          <p className="text-xs text-muted-foreground">
            CC {emp.numeroDocumento}
            {emp.tipoVinculacion && (
              <span className="ml-1.5 text-[10px]">· {VINCULACION_SHORT[emp.tipoVinculacion] ?? emp.tipoVinculacion}</span>
            )}
          </p>
        </div>

        {/* Status / Result summary */}
        <div className="shrink-0 text-right hidden sm:block min-w-[90px]">
          {tieneResultado ? (
            <div>
              <p className="text-xs font-bold text-green-700">
                ✓ {emp.resultado!.totalHorasTrabajadas.toFixed(1)}h
              </p>
              <p className="text-[10px] text-muted-foreground">
                {fmtCOP(emp.resultado!.netoAPagar)} neto
              </p>
            </div>
          ) : tieneTurnos ? (
            <Badge variant="outline" className="text-[11px] gap-1 bg-blue-50 text-blue-700 border-blue-200">
              <Calendar className="h-3 w-3" />
              {emp.turnosCount} turno{emp.turnosCount !== 1 ? "s" : ""}
            </Badge>
          ) : (
            <span className="text-[11px] text-muted-foreground/60 italic">Sin programar</span>
          )}
        </div>

        {/* Actions — always visible, clear purpose */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Ver: shows turnos list or resultado modal */}
          {tieneTurnos && (
            <Button
              size="sm"
              variant="outline"
              className={`gap-1 text-xs h-7 px-2 ${tieneResultado ? "border-green-300 text-green-700 hover:bg-green-50" : "border-blue-300 text-blue-700 hover:bg-blue-50"}`}
              onClick={() => tieneResultado ? setResultadoVista({ emp }) : verTurnos(emp)}
              disabled={loadingTurnos}
            >
              <Eye className="h-3.5 w-3.5" />
              Ver
            </Button>
          )}

          {/* Programar / Editar turnos — goes to Individual programming */}
          <Link href={scheduleLink(emp.id)}>
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-xs h-7 px-2"
            >
              <Calendar className="h-3.5 w-3.5" />
              {tieneTurnos ? "Turnos" : "Programar"}
            </Button>
          </Link>

          {/* Quitar del período — only in BORRADOR */}
          {isBorrador && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={() => handleRemoveEmployee(emp.id, emp.nombres, emp.apellidos)}
              title="Quitar del período"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── Breadcrumb ── */}
      <Link href="/dashboard/payroll/periods">
        <button type="button" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Períodos de Nómina
        </button>
      </Link>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{periodo.nombrePeriodo}</h1>
            <Badge variant="outline" className={`text-[11px] font-semibold gap-1 ${cfg.color}`}>
              <StatusIcon className="h-3 w-3" />
              {cfg.label}
            </Badge>
            <Badge variant="secondary" className="text-[11px]">
              {TIPO_LABEL[periodo.tipoPeriodo] ?? periodo.tipoPeriodo}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span className="capitalize">{fmtDateLong(periodo.fechaInicio)}</span>
            <span>→</span>
            <span className="capitalize">{fmtDateLong(periodo.fechaFin)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Actualizar
          </Button>

          {hasResults && (
            <Link href={`/dashboard/payroll/results?periodoId=${periodoId}`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-purple-700 border-purple-300 hover:bg-purple-50">
                <BarChart2 className="h-3.5 w-3.5" />
                Ver Resultados
              </Button>
            </Link>
          )}

          {canConfirm && (
            <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700" onClick={confirmarPeriodo} disabled={confirmando}>
              <ShieldCheck className="h-3.5 w-3.5" />
              {confirmando ? "Confirmando…" : "Confirmar Período"}
            </Button>
          )}

          {canCalcular && (
            <Button size="sm" className="gap-1.5" onClick={calcular} disabled={calculando}>
              <Calculator className="h-3.5 w-3.5" />
              {calculando ? "Calculando…" : "Calcular Nómina"}
            </Button>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border px-4 py-3 bg-muted/30">
          <p className="text-xs text-muted-foreground">Total empleados</p>
          <p className="text-2xl font-bold mt-0.5">{empleados.length}</p>
        </div>
        <div className="rounded-xl border px-4 py-3 bg-blue-50">
          <p className="text-xs text-muted-foreground">Programados</p>
          <p className="text-2xl font-bold mt-0.5 text-blue-700">{programados.length}</p>
        </div>
        <div className="rounded-xl border px-4 py-3 bg-amber-50">
          <p className="text-xs text-muted-foreground">Sin programar</p>
          <p className="text-2xl font-bold mt-0.5 text-amber-700">{sinProgramar.length}</p>
        </div>
        <div className="rounded-xl border px-4 py-3 bg-green-50">
          <p className="text-xs text-muted-foreground">Calculados</p>
          <p className="text-2xl font-bold mt-0.5 text-green-700">{conResultado.length}</p>
        </div>
      </div>

      {/* ── Descuento de Alimentación ── */}
      <div className="rounded-xl border border-orange-200 bg-orange-50/30 px-4 py-3 space-y-3">
        <div className="flex items-center gap-2.5">
          <UtensilsCrossed className="h-4 w-4 text-orange-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">Descuento de Alimentación del Período</p>
            <p className="text-[11px] text-gray-500">
              Se descuenta automáticamente de cada turno laboral. Puede sobrescribirse por turno individual.
            </p>
          </div>
          {/* Current value badge */}
          <Badge variant="outline" className={`shrink-0 text-[11px] font-semibold ${
            (periodo.minutosAlimentacion ?? 0) === 0
              ? "border-gray-300 text-gray-500"
              : "border-orange-400 text-orange-700 bg-orange-50"
          }`}>
            {(periodo.minutosAlimentacion ?? 0) === 0
              ? "Sin descuento"
              : (periodo.minutosAlimentacion ?? 0) >= 60
                ? `${((periodo.minutosAlimentacion ?? 0) / 60).toFixed(1)}h`
                : `${periodo.minutosAlimentacion} min`
            }
          </Badge>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {([
            { label: "Sin descuento", value: 0 },
            { label: "30 min", value: 30 },
            { label: "1 hora", value: 60 },
          ] as { label: string; value: number }[]).map(opt => (
            <button key={opt.value} type="button"
              onClick={() => setBreakMin(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                breakMin === opt.value
                  ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                  : "bg-white text-gray-700 border-gray-200 hover:border-orange-300 hover:text-orange-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button type="button"
            onClick={() => setBreakMin(-1)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              breakMin === -1
                ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                : "bg-white text-gray-700 border-gray-200 hover:border-orange-300 hover:text-orange-700"
            }`}
          >
            Personalizado
          </button>
          {breakMin === -1 && (
            <div className="flex items-center gap-1.5">
              <input
                type="number" min={1} max={480}
                value={breakCustom}
                onChange={e => setBreakCustom(Math.max(1, Math.min(480, parseInt(e.target.value) || 1)))}
                className="w-16 h-8 border border-gray-300 rounded-lg px-2 text-xs text-center focus:ring-1 focus:ring-orange-400 focus:border-orange-400 outline-none"
              />
              <span className="text-xs text-gray-500">min</span>
            </div>
          )}
          <Button size="sm" onClick={saveBreakMinutes} disabled={breakSaving}
            className="h-8 gap-1.5 bg-orange-500 hover:bg-orange-600 text-white ml-auto">
            {breakSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {breakSaving ? "Guardando…" : "Guardar"}
          </Button>
        </div>

        {/* Effective hours example */}
        {(breakMin !== 0 && breakMin !== -1) || (breakMin === -1 && breakCustom > 0) ? (
          <div className="flex items-center gap-2 text-[11px] text-orange-700 bg-orange-100/60 rounded-lg px-3 py-1.5">
            <span className="font-semibold">Ejemplo:</span>
            <span>Turno 12h</span>
            <span className="text-orange-400">−</span>
            <span>{breakMin === -1 ? breakCustom : breakMin} min alimentación</span>
            <span className="text-orange-400">=</span>
            <span className="font-bold">{(12 - (breakMin === -1 ? breakCustom : breakMin) / 60).toFixed(2)}h efectivas</span>
          </div>
        ) : null}
      </div>

      {/* ── Progress ── */}
      <div className="rounded-xl border bg-muted/10 px-4 py-3">
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="font-medium text-sm">Progreso de programación</span>
          <span className={`font-bold text-sm ${pct === 100 ? "text-green-600" : "text-blue-700"}`}>{pct}%</span>
        </div>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-green-500" : "bg-blue-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* ── Employee List ── */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 bg-muted/20 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
              Empleados del período
            </p>
            <Badge variant="outline" className="text-[11px]">{empleados.length}</Badge>
          </div>
        </div>
        {empleados.length === 0 ? (
          <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
            <Users className="h-10 w-10 mb-3 opacity-20" />
            <p className="font-medium text-sm">No hay empleados en este período</p>
            <p className="text-xs mt-1 mb-4">Asígnalos desde <strong>Nómina → Períodos</strong> usando el panel de empleados.</p>
            <Link href="/dashboard/payroll/periods">
              <Button size="sm" variant="outline" className="gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" />
                Ir a Períodos
              </Button>
            </Link>
          </CardContent>
        ) : (
          <CardContent className="p-0">
            {/* Employees WITH shifts */}
            {programados.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-blue-50/60 border-b border-blue-100 flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                  <p className="text-xs font-semibold text-blue-700">Con turnos programados ({programados.length})</p>
                </div>
                <div className="divide-y">
                  {programados.map(emp => <EmpleadoRow key={emp.id} emp={emp} />)}
                </div>
              </div>
            )}

            {/* Employees WITHOUT shifts */}
            {sinProgramar.length > 0 && (
              <div className={programados.length > 0 ? "border-t" : ""}>
                <div className="px-4 py-2 bg-amber-50/60 border-b border-amber-100 flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  <p className="text-xs font-semibold text-amber-700">Sin turnos programados ({sinProgramar.length})</p>
                </div>
                <div className="divide-y">
                  {sinProgramar.map(emp => <EmpleadoRow key={emp.id} emp={emp} />)}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* ── Confirm CTA (when ready to confirm) ── */}
      {canConfirm && (
        <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-xl border bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <div>
            <p className="font-semibold text-green-900">¡Período listo para confirmar!</p>
            <p className="text-xs text-green-700 mt-0.5">
              ✅ {programados.length} empleados con turnos programados ·
              ✅ {conResultado.length} empleados con nómina calculada ·
              Confirma para finalizar el período y hacerlo visible en resultados.
            </p>
          </div>
          <Button className="gap-1.5 shrink-0 bg-green-600 hover:bg-green-700" onClick={confirmarPeriodo} disabled={confirmando}>
            <ShieldCheck className="h-4 w-4" />
            {confirmando ? "Confirmando…" : "Confirmar Período"}
          </Button>
        </div>
      )}

      {/* ── Calculate CTA ── */}
      {canCalcular && !canConfirm && (
        <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-xl border bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div>
            <p className="font-semibold text-blue-900">¿Listo para calcular la nómina?</p>
            <p className="text-xs text-blue-700 mt-0.5">
              {programados.length} empleado{programados.length !== 1 ? "s" : ""} con turnos ·
              {sinProgramar.length > 0 && ` ${sinProgramar.length} sin programar · `}
              El cálculo aplica la configuración legal vigente por cada persona.
            </p>
          </div>
          <Button className="gap-1.5 shrink-0" onClick={calcular} disabled={calculando}>
            <Calculator className="h-4 w-4" />
            {calculando ? "Calculando…" : "Calcular Nómina"}
          </Button>
        </div>
      )}

      {/* ── Already calculated ── */}
      {hasResults && conResultado.length > 0 && (
        <div className="rounded-xl border bg-green-50 border-green-200 px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            <p className="text-sm text-green-800 font-medium">
              Nómina calculada para {conResultado.length} empleado{conResultado.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link href={`/dashboard/payroll/results?periodoId=${periodoId}`}>
            <Button variant="outline" size="sm" className="gap-1.5 border-green-300 text-green-700 hover:bg-green-100">
              <BarChart2 className="h-3.5 w-3.5" />
              Ver Resultados
            </Button>
          </Link>
        </div>
      )}

      {/* ── Modal turnos programados ── */}
      {turnosVista && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setTurnosVista(null)}
        >
          <div
            className="bg-background rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/20">
              <div>
                <p className="font-bold text-base">
                  {turnosVista.emp.nombres} {turnosVista.emp.apellidos}
                </p>
                <p className="text-xs text-muted-foreground">
                  {turnosVista.turnos.length} turno{turnosVista.turnos.length !== 1 ? "s" : ""} · {periodo?.nombrePeriodo}
                </p>
              </div>
              <button
                onClick={() => setTurnosVista(null)}
                className="rounded-full p-1.5 hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="divide-y max-h-[60vh] overflow-y-auto">
              {turnosVista.turnos.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">Sin turnos en este rango</p>
              ) : (
                turnosVista.turnos.map((t: any) => {
                  const fecha = new Date(t.fechaTurno)
                  const dia = fecha.toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })
                  return (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: t.concepto?.color || "#6366f1" }}
                      >
                        {t.concepto?.codigo ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize">{dia}</p>
                        <p className="text-[11px] text-muted-foreground">{t.concepto?.nombre ?? "—"}</p>
                      </div>
                      {(t.horaInicioPersonalizada || t.concepto?.horaInicioDefecto) && (
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {t.horaInicioPersonalizada ?? t.concepto?.horaInicioDefecto}
                          {" → "}
                          {t.horaFinPersonalizada ?? t.concepto?.horaFinDefecto}
                        </span>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            <div className="px-5 py-3 border-t">
              <Link href={scheduleLink(turnosVista.emp.id)} onClick={() => setTurnosVista(null)}>
                <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs">
                  <Calendar className="h-3.5 w-3.5" />
                  Editar turnos
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal resultado individual ── */}
      {resultadoVista && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setResultadoVista(null)}
        >
          <div
            className="bg-background rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/20">
              <div>
                <p className="font-bold text-base">
                  {resultadoVista.emp.nombres} {resultadoVista.emp.apellidos}
                </p>
                <p className="text-xs text-muted-foreground">CC {resultadoVista.emp.numeroDocumento} · {periodo?.nombrePeriodo}</p>
              </div>
              <button
                onClick={() => setResultadoVista(null)}
                className="rounded-full p-1.5 hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {(() => {
              const r = resultadoVista.emp.resultado!
              const rows = [
                { label: "Horas ordinarias",     val: `${r.totalHorasOrdinarias.toFixed(1)} h`,    dim: true },
                { label: "Horas nocturnas",       val: `${r.totalHorasNocturnas.toFixed(1)} h`,     dim: true },
                { label: "Horas festivas",        val: `${r.totalHorasFestivas.toFixed(1)} h`,      dim: true },
                { label: "Horas noct. festivas",  val: `${r.totalHorasNoctFestivas.toFixed(1)} h`,  dim: true },
                { label: "Horas extra diurna",    val: `${r.totalExtraDiurna.toFixed(1)} h`,        dim: true },
                { label: "Horas extra nocturna",  val: `${r.totalExtraNocturna.toFixed(1)} h`,      dim: true },
                { label: "Total horas trabajadas",val: `${r.totalHorasTrabajadas.toFixed(1)} h`,    dim: false },
                { label: "Total horas extras",    val: `${r.totalHorasExtras.toFixed(1)} h`,        dim: false },
              ]
              const money = [
                { label: "Salario base",          val: fmtCOP(r.salarioBase) },
                { label: "Auxilio de transporte", val: fmtCOP(r.auxilioTransporte) },
                { label: "Total devengado",       val: fmtCOP(r.totalDevengado), bold: true },
                { label: "Deducciones",           val: fmtCOP(r.totalDeducciones), red: true },
                { label: "Neto a pagar",          val: fmtCOP(r.netoAPagar), bold: true, green: true },
              ]
              return (
                <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                  {/* Horas */}
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Horas del período</p>
                    <div className="rounded-xl border overflow-hidden">
                      {rows.filter(r => parseFloat(r.val) !== 0).map((row, i) => (
                        <div key={i} className={`flex justify-between px-3 py-2 text-sm ${i % 2 === 0 ? "bg-muted/20" : ""} ${!row.dim ? "font-semibold" : ""}`}>
                          <span className={row.dim ? "text-muted-foreground" : ""}>{row.label}</span>
                          <span>{row.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Valores */}
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Valores (COP)</p>
                    <div className="rounded-xl border overflow-hidden">
                      {money.map((row, i) => (
                        <div key={i} className={`flex justify-between px-3 py-2 text-sm ${i % 2 === 0 ? "bg-muted/20" : ""} ${row.bold ? "font-bold" : ""} ${row.green ? "text-green-700 bg-green-50" : ""} ${row.red ? "text-red-600" : ""}`}>
                          <span>{row.label}</span>
                          <span>{row.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
