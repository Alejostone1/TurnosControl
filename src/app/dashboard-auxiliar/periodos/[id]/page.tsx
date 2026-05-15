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
  ChevronRight,
  RefreshCw,
  Eye,
  X,
  ShieldCheck,
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
  BORRADOR:  { label: "Borrador",   color: "bg-slate-100 text-slate-700 border-slate-200",   icon: FileEdit },
  PENDIENTE: { label: "Procesando", color: "bg-amber-100 text-amber-700 border-amber-200",   icon: Clock },
  CALCULADO: { label: "Calculado",  color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  APROBADO:  { label: "Aprobado",   color: "bg-teal-100 text-teal-700 border-teal-200",      icon: CheckCircle2 },
  CERRADO:   { label: "Cerrado",    color: "bg-blue-100 text-blue-700 border-blue-200",       icon: CheckCircle2 },
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

export default function PeriodoAuxiliarDetailPage() {
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

  async function calcular() {
    if (!periodo) return
    setCalculando(true)
    try {
      const res = await fetch(`/api/payroll/periods/${periodoId}/calculate`, { method: "POST" })
      if (res.ok) {
        toast.success("Cálculo iniciado — procesando cada empleado…")
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
        fetchData(true)
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
        <Link href="/dashboard-auxiliar/periodos">
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
      const res = await fetch(`/api/payroll/periods/${periodoId}/employees/${empleadoId}`, {
        method: "DELETE"
      })
      if (res.ok) {
        toast.success("Empleado eliminado del período exitosamente")
        fetchData(true)
      } else {
        const error = await res.json()
        toast.error(error.error || "Error al eliminar empleado del período")
      }
    } catch {
      toast.error("Error de conexión")
    }
  }

  function scheduleLink(empId: string) {
    return `/dashboard-auxiliar/programacion?empleadoId=${empId}&startDate=${startParam}&endDate=${endParam}&periodoId=${periodoId}&periodoNombre=${periodoNombreParam}`
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

    return (
      <div className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30 ${!tieneTurnos ? "opacity-70" : ""}`}>
        {/* Status dot */}
        <div className={`w-2 h-2 rounded-full shrink-0 ${tieneResultado ? "bg-emerald-500" : tieneTurnos ? "bg-emerald-400" : "bg-muted-foreground/30"}`} />

        {/* Avatar */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${tieneTurnos ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
          {emp.nombres.charAt(0)}{emp.apellidos.charAt(0)}
        </div>

        {/* Name */}
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

        {/* Status / Result */}
        <div className="shrink-0 text-right hidden sm:block">
          {tieneResultado ? (
            <div>
              <p className="text-xs font-bold text-emerald-700">
                ✓ {emp.resultado!.totalHorasTrabajadas.toFixed(1)}h
              </p>
              <p className="text-[10px] text-muted-foreground">
                {fmtCOP(emp.resultado!.netoAPagar)} neto
              </p>
            </div>
          ) : tieneTurnos ? (
            <Badge variant="outline" className="text-[11px] gap-1 bg-emerald-50 text-emerald-700 border-emerald-200">
              <Calendar className="h-3 w-3" />
              {emp.turnosCount} turno{emp.turnosCount !== 1 ? "s" : ""}
            </Badge>
          ) : (
            <span className="text-[11px] text-muted-foreground/60 italic">Sin programar</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {tieneTurnos && (
            <Button
              size="sm"
              variant="outline"
              className={`gap-1 text-xs h-8 ${tieneResultado ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"}`}
              onClick={() => tieneResultado ? setResultadoVista({ emp }) : verTurnos(emp)}
              disabled={loadingTurnos}
            >
              <Eye className="h-3.5 w-3.5" />
              Ver
            </Button>
          )}
          <Link href={scheduleLink(emp.id)}>
            <Button
              size="sm"
              variant={tieneTurnos ? "outline" : "default"}
              className={tieneTurnos ? "gap-1 text-xs h-8" : "gap-1 text-xs h-8 bg-emerald-600 hover:bg-emerald-700"}
            >
              <Calendar className="h-3.5 w-3.5" />
              {tieneTurnos ? "Editar" : "Programar"}
              <ChevronRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── Breadcrumb ── */}
      <Link href="/dashboard-auxiliar/periodos">
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
            <Link href={`/dashboard-auxiliar/periodos/resultados?periodoId=${periodoId}`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-purple-700 border-purple-300 hover:bg-purple-50">
                <BarChart2 className="h-3.5 w-3.5" />
                Ver Resultados
              </Button>
            </Link>
          )}

          {canConfirm && (
            <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={confirmarPeriodo} disabled={confirmando}>
              <ShieldCheck className="h-3.5 w-3.5" />
              {confirmando ? "Confirmando…" : "Confirmar Período"}
            </Button>
          )}

          {canCalcular && (
            <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={calcular} disabled={calculando}>
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
        <div className="rounded-xl border px-4 py-3 bg-emerald-50">
          <p className="text-xs text-muted-foreground">Programados</p>
          <p className="text-2xl font-bold mt-0.5 text-emerald-700">{programados.length}</p>
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

      {/* ── Progress ── */}
      <div className="rounded-xl border bg-muted/10 px-4 py-3">
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="font-medium text-sm">Progreso de programación</span>
          <span className={`font-bold text-sm ${pct === 100 ? "text-emerald-600" : "text-emerald-700"}`}>{pct}%</span>
        </div>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-emerald-500" : "bg-emerald-400"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* ── Employee List ── */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 bg-muted/20 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-bold text-muted-foreground">Empleados del período</p>
                <p className="text-2xl font-bold text-foreground">{empleados.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/dashboard-auxiliar/empleados/new?periodoId=${periodoId}&periodoNombre=${periodoNombreParam}`}>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <FileEdit className="h-4 w-4 mr-2" />
                  Agregar Empleado
                </Button>
              </Link>
              {empleados.length > 0 && (
                <Button size="sm" variant="outline" className="text-gray-600 hover:text-gray-800" onClick={() => fetchData(true)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar Lista
                </Button>
              )}
            </div>
          </div>
        </div>
        {empleados.length === 0 ? (
          <CardContent className="flex flex-col items-center py-16 text-muted-foreground">
            <div className="text-center mb-6">
              <Users className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-xl font-semibold mb-2">No hay empleados en este período</p>
              <p className="text-muted-foreground mb-6">
                Agrega empleados para comenzar a programar turnos y calcular la nómina
              </p>
            </div>
            <Link href={`/dashboard-auxiliar/empleados/new?periodoId=${periodoId}&periodoNombre=${periodoNombreParam}`}>
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Users className="h-5 w-5 mr-3" />
                Agregar Primer Empleado
              </Button>
            </Link>
          </CardContent>
        ) : (
          <CardContent className="p-0">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-6 p-6 bg-muted/10">
              <div className="text-center p-4 rounded-lg border border-emerald-200 bg-emerald-50">
                <p className="text-3xl font-bold text-emerald-600">{programados.length}</p>
                <p className="text-sm text-muted-foreground">Con turnos</p>
              </div>
              <div className="text-center p-4 rounded-lg border border-green-200 bg-green-50">
                <p className="text-3xl font-bold text-green-600">{conResultado.length}</p>
                <p className="text-sm text-muted-foreground">Calculados</p>
              </div>
              <div className="text-center p-4 rounded-lg border border-amber-200 bg-amber-50">
                <p className="text-3xl font-bold text-amber-600">{sinProgramar.length}</p>
                <p className="text-sm text-muted-foreground">Pendientes</p>
              </div>
            </div>

            {/* Employees WITH shifts */}
            {programados.length > 0 && (
              <div className="mt-6">
                <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <p className="text-sm font-semibold text-emerald-600">Empleados con turnos programados ({programados.length})</p>
                  </div>
                </div>
                <div className="divide-y">
                  {programados.map(emp => (
                    <div key={emp.id} className="group relative hover:bg-muted/30 transition-colors duration-200">
                      <div className="p-4">
                        <EmpleadoRow emp={emp} />
                        {/* Action buttons */}
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <div className="flex items-center gap-2">
                            <Link href={`/dashboard-auxiliar/empleados/${emp.id}/edit`}>
                              <Button size="sm" variant="outline" className="h-9 w-9 p-0 bg-emerald-50 hover:bg-emerald-100 text-emerald-600">
                                <FileEdit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 w-9 p-0 bg-red-50 hover:bg-red-100 text-red-600"
                              onClick={() => handleRemoveEmployee(emp.id, emp.nombres, emp.apellidos)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Employees WITHOUT shifts */}
            {sinProgramar.length > 0 && (
              <div className="mt-6">
                <div className="px-6 py-3 bg-amber-50 border-b border-amber-200">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <p className="text-sm font-semibold text-amber-600">Empleados sin turnos ({sinProgramar.length})</p>
                  </div>
                </div>
                <div className="divide-y">
                  {sinProgramar.map(emp => (
                    <div key={emp.id} className="group relative hover:bg-muted/30 transition-colors duration-200">
                      <div className="p-4">
                        <EmpleadoRow emp={emp} />
                        {/* Action buttons */}
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <div className="flex items-center gap-2">
                            <Link href={`/dashboard-auxiliar/empleados/${emp.id}/edit`}>
                              <Button size="sm" variant="outline" className="h-9 w-9 p-0 bg-emerald-50 hover:bg-emerald-100 text-emerald-600">
                                <FileEdit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 w-9 p-0 bg-red-50 hover:bg-red-100 text-red-600"
                              onClick={() => handleRemoveEmployee(emp.id, emp.nombres, emp.apellidos)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* ── Confirm CTA (when ready to confirm) ── */}
      {canConfirm && (
        <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-xl border bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200">
          <div>
            <p className="font-semibold text-emerald-900">¡Período listo para confirmar!</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              ✅ {programados.length} empleados con turnos programados ·
              ✅ {conResultado.length} empleados con nómina calculada ·
              Confirma para finalizar el período y hacerlo visible en resultados.
            </p>
          </div>
          <Button className="gap-1.5 shrink-0 bg-emerald-600 hover:bg-emerald-700" onClick={confirmarPeriodo} disabled={confirmando}>
            <ShieldCheck className="h-4 w-4" />
            {confirmando ? "Confirmando…" : "Confirmar Período"}
          </Button>
        </div>
      )}

      {/* ── Calculate CTA ── */}
      {canCalcular && !canConfirm && (
        <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-xl border bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
          <div>
            <p className="font-semibold text-emerald-900">¿Listo para calcular la nómina?</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              {programados.length} empleado{programados.length !== 1 ? "s" : ""} con turnos ·
              {sinProgramar.length > 0 && ` ${sinProgramar.length} sin programar · `}
              El cálculo aplica la configuración legal vigente por cada persona.
            </p>
          </div>
          <Button className="gap-1.5 shrink-0 bg-emerald-600 hover:bg-emerald-700" onClick={calcular} disabled={calculando}>
            <Calculator className="h-4 w-4" />
            {calculando ? "Calculando…" : "Calcular Nómina"}
          </Button>
        </div>
      )}

      {/* ── Already calculated ── */}
      {hasResults && conResultado.length > 0 && (
        <div className="rounded-xl border bg-emerald-50 border-emerald-200 px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-800 font-medium">
              Nómina calculada para {conResultado.length} empleado{conResultado.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link href={`/dashboard-auxiliar/periodos/resultados?periodoId=${periodoId}`}>
            <Button variant="outline" size="sm" className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-100">
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
                        style={{ backgroundColor: t.concepto?.color || "#10b981" }}
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
                        <div key={i} className={`flex justify-between px-3 py-2 text-sm ${i % 2 === 0 ? "bg-muted/20" : ""} ${row.bold ? "font-bold" : ""} ${row.green ? "text-emerald-700 bg-emerald-50" : ""} ${row.red ? "text-red-600" : ""}`}>
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
