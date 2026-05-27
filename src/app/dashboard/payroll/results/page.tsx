"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  BarChart2,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  Wallet,
  ChevronDown,
  Eye,
  X,
  FileEdit,
  CheckCircle2,
  Calendar,
  RefreshCw,
  Download,
  Filter,
  SlidersHorizontal,
} from "lucide-react"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────

interface Periodo {
  id: string
  nombrePeriodo: string
  tipoPeriodo: string
  estadoPeriodo: string
  fechaInicio: string
  fechaFin: string
}

interface Resultado {
  id: string
  empleadoId: string
  empleado: {
    id: string
    nombres: string
    apellidos: string
    numeroDocumento: string
    centroCosto: string | null
    programa: string | null
    modalidad: string | null
  }
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
  valorHorasOrdinarias: number
  valorRecargoNocturno: number
  valorRecargoFestivo: number
  valorRecargoNoctFestivo: number
  valorExtraDiurna: number
  valorExtraNocturna: number
  valorExtraDiurnaFest: number
  valorExtraNoctFest: number
  totalDevengado: number
  totalDeducciones: number
  netoAPagar: number
}

// ─── Helpers ─────────────────────────────────────────────────

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  BORRADOR:  { label: "Borrador",   color: "bg-slate-100 text-slate-600 border-slate-200", icon: FileEdit },
  PENDIENTE: { label: "Procesando", color: "bg-amber-100 text-amber-700 border-amber-200",  icon: Clock },
  CALCULADO: { label: "Calculado",  color: "bg-green-100 text-green-700 border-green-200",  icon: CheckCircle2 },
  APROBADO:  { label: "Aprobado",   color: "bg-teal-100 text-teal-700 border-teal-200",     icon: CheckCircle2 },
  CERRADO:   { label: "Cerrado",    color: "bg-blue-100 text-blue-700 border-blue-200",     icon: CheckCircle2 },
}

const TIPO_SHORT: Record<string, string> = {
  SEMANAL: "Semanal", QUINCENAL: "Quincenal", MENSUAL: "Mensual",
  TRIMESTRAL: "Trimest.", PERSONALIZADO: "Personal.",
}

// ─── Detail Modal ─────────────────────────────────────────────

function DetalleModal({ resultado, periodoNombre, onClose }: {
  resultado: Resultado
  periodoNombre: string
  onClose: () => void
}) {
  const r = resultado
  const horasRows = [
    { label: "Horas ordinarias",    val: r.totalHorasOrdinarias,   money: r.valorHorasOrdinarias },
    { label: "Recargo nocturno",    val: r.totalHorasNocturnas,    money: r.valorRecargoNocturno },
    { label: "Recargo festivo",     val: r.totalHorasFestivas,     money: r.valorRecargoFestivo },
    { label: "Recargo noct.fest.",  val: r.totalHorasNoctFestivas, money: r.valorRecargoNoctFestivo },
    { label: "Extra diurna",        val: r.totalExtraDiurna,       money: r.valorExtraDiurna },
    { label: "Extra nocturna",      val: r.totalExtraNocturna,     money: r.valorExtraNocturna },
    { label: "Extra diurna fest.",  val: r.totalExtraDiurnaFest,   money: r.valorExtraDiurnaFest },
    { label: "Extra noct. fest.",   val: r.totalExtraNoctFest,     money: r.valorExtraNoctFest },
  ].filter(row => row.val > 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/20">
          <div>
            <p className="font-bold text-base">
              {r.empleado.nombres} {r.empleado.apellidos}
            </p>
            <p className="text-xs text-muted-foreground">CC {r.empleado.numeroDocumento} · {periodoNombre}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Horas */}
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
              Horas trabajadas · {r.totalHorasTrabajadas.toFixed(1)} h total
            </p>
            <div className="rounded-xl border overflow-hidden">
              {horasRows.map((row, i) => (
                <div key={i} className={`grid grid-cols-3 px-3 py-2 text-sm ${i % 2 === 0 ? "bg-muted/20" : ""}`}>
                  <span className="text-muted-foreground col-span-1">{row.label}</span>
                  <span className="text-center">{row.val.toFixed(1)} h</span>
                  <span className="text-right">{fmtCOP(row.money)}</span>
                </div>
              ))}
              <div className="grid grid-cols-3 px-3 py-2 text-sm font-bold bg-muted/40 border-t">
                <span>Total horas</span>
                <span className="text-center">{r.totalHorasTrabajadas.toFixed(1)} h</span>
                <span className="text-right text-muted-foreground">—</span>
              </div>
            </div>
          </div>

          {/* Devengado */}
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Devengos</p>
            <div className="rounded-xl border overflow-hidden">
              {[
                { label: "Salario base",          val: r.salarioBase },
                { label: "Auxilio de transporte", val: r.auxilioTransporte },
              ].filter(x => x.val > 0).map((row, i) => (
                <div key={i} className={`flex justify-between px-3 py-2 text-sm ${i % 2 === 0 ? "bg-muted/20" : ""}`}>
                  <span className="text-muted-foreground">{row.label}</span>
                  <span>{fmtCOP(row.val)}</span>
                </div>
              ))}
              <div className="flex justify-between px-3 py-2 text-sm font-bold bg-muted/40 border-t">
                <span>Total devengado</span>
                <span>{fmtCOP(r.totalDevengado)}</span>
              </div>
            </div>
          </div>

          {/* Resumen final */}
          <div className="rounded-xl border overflow-hidden">
            <div className="flex justify-between px-3 py-2.5 text-sm bg-muted/20">
              <span className="text-muted-foreground">Total devengado</span>
              <span className="font-medium">{fmtCOP(r.totalDevengado)}</span>
            </div>
            <div className="flex justify-between px-3 py-2.5 text-sm bg-red-50">
              <span className="text-red-600">Deducciones (salud + pensión)</span>
              <span className="text-red-600 font-medium">- {fmtCOP(r.totalDeducciones)}</span>
            </div>
            <div className="flex justify-between px-3 py-3 text-base font-bold bg-green-50 border-t border-green-200">
              <span className="text-green-800">Neto a pagar</span>
              <span className="text-green-700">{fmtCOP(r.netoAPagar)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────

function ResultsPageInner() {
  const searchParams = useSearchParams()
  const periodoIdParam = searchParams.get("periodoId")

  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [selectedPeriodoId, setSelectedPeriodoId] = useState(periodoIdParam ?? "")
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [loadingPeriodos, setLoadingPeriodos] = useState(true)
  const [loadingResultados, setLoadingResultados] = useState(false)
  const [detalleVista, setDetalleVista] = useState<Resultado | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showExportPanel, setShowExportPanel] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [exportFiltros, setExportFiltros] = useState({
    empleadoId: "",
    centroCosto: "",
    programa: "",
    modalidad: "",
  })

  useEffect(() => { fetchPeriodos() }, [])

  useEffect(() => {
    if (selectedPeriodoId) fetchResultados(selectedPeriodoId)
    else setResultados([])
  }, [selectedPeriodoId])

  async function fetchPeriodos() {
    setLoadingPeriodos(true)
    try {
      const res = await fetch("/api/payroll/periods")
      if (res.ok) {
        const data: Periodo[] = await res.json()
        setPeriodos(data)
        if (!selectedPeriodoId && data.length > 0) {
          const calculated = data.find(p =>
            p.estadoPeriodo === "CALCULADO" || p.estadoPeriodo === "APROBADO" || p.estadoPeriodo === "CERRADO"
          )
          if (calculated) setSelectedPeriodoId(calculated.id)
        }
      }
    } catch {
      toast.error("Error al cargar períodos")
    } finally {
      setLoadingPeriodos(false)
    }
  }

  async function fetchResultados(periodoId: string) {
    setLoadingResultados(true)
    try {
      const res = await fetch(`/api/payroll/results?periodoId=${periodoId}`)
      if (res.ok) {
        setResultados(await res.json())
      } else {
        toast.error("Error al cargar resultados")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setLoadingResultados(false)
    }
  }

  async function handleExport() {
    if (!selectedPeriodoId) return
    setExportLoading(true)
    try {
      const params = new URLSearchParams({ periodoId: selectedPeriodoId })
      if (exportFiltros.empleadoId) params.set("empleadoId", exportFiltros.empleadoId)
      if (exportFiltros.centroCosto) params.set("centroCosto", exportFiltros.centroCosto)
      if (exportFiltros.programa) params.set("programa", exportFiltros.programa)
      if (exportFiltros.modalidad) params.set("modalidad", exportFiltros.modalidad)

      const res = await fetch(`/api/payroll/export?${params}`)
      if (!res.ok) {
        toast.error("Error al generar el reporte")
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Nomina_${selectedPeriodo?.nombrePeriodo ?? "reporte"}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Reporte Excel descargado")
    } catch {
      toast.error("Error al descargar el reporte")
    } finally {
      setExportLoading(false)
    }
  }

  const selectedPeriodo = periodos.find(p => p.id === selectedPeriodoId)
  const hasResults = selectedPeriodo &&
    (selectedPeriodo.estadoPeriodo === "CALCULADO" ||
     selectedPeriodo.estadoPeriodo === "APROBADO" ||
     selectedPeriodo.estadoPeriodo === "CERRADO")

  const uniqueCentros     = Array.from(new Set(resultados.map(r => r.empleado.centroCosto).filter(Boolean))) as string[]
  const uniqueProgramas   = Array.from(new Set(resultados.map(r => r.empleado.programa).filter(Boolean)))    as string[]
  const uniqueModalidades = Array.from(new Set(resultados.map(r => r.empleado.modalidad).filter(Boolean)))   as string[]

  const totalDevengado = resultados.reduce((s, r) => s + r.totalDevengado, 0)
  const totalDeducciones = resultados.reduce((s, r) => s + r.totalDeducciones, 0)
  const totalNeto = resultados.reduce((s, r) => s + r.netoAPagar, 0)
  const totalHoras = resultados.reduce((s, r) => s + r.totalHorasTrabajadas, 0)

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-purple-600" />
            <h1 className="text-2xl font-bold">Resultados de Nómina</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Consulta y detalle de liquidaciones por período
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasResults && resultados.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50"
              onClick={() => setShowExportPanel(v => !v)}
            >
              <Download className="h-3.5 w-3.5" />
              Exportar Excel
            </Button>
          )}
          <Link href="/dashboard/payroll/periods">
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="h-3.5 w-3.5" />
              Períodos
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Export Panel ── */}
      {showExportPanel && hasResults && resultados.length > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-green-700" />
              <p className="font-semibold text-green-800 text-sm">Opciones de Exportación Excel</p>
            </div>
            <button
              onClick={() => setShowExportPanel(false)}
              className="text-xs text-green-700 hover:text-green-900 underline"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Empleado dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-green-800 uppercase tracking-wide">Empleado</label>
              <select
                className="w-full rounded-lg border border-green-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
                value={exportFiltros.empleadoId}
                onChange={e => setExportFiltros(f => ({ ...f, empleadoId: e.target.value }))}
              >
                <option value="">Todos los empleados</option>
                {resultados.map(r => (
                  <option key={r.empleadoId} value={r.empleadoId}>
                    {r.empleado.nombres} {r.empleado.apellidos}
                  </option>
                ))}
              </select>
            </div>

            {/* Centro de Costo */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-green-800 uppercase tracking-wide">Centro de Costo</label>
              <select
                className="w-full rounded-lg border border-green-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
                value={exportFiltros.centroCosto}
                onChange={e => setExportFiltros(f => ({ ...f, centroCosto: e.target.value }))}
              >
                <option value="">Todos</option>
                {uniqueCentros.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Programa */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-green-800 uppercase tracking-wide">Programa</label>
              <select
                className="w-full rounded-lg border border-green-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
                value={exportFiltros.programa}
                onChange={e => setExportFiltros(f => ({ ...f, programa: e.target.value }))}
              >
                <option value="">Todos</option>
                {uniqueProgramas.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* Modalidad */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-green-800 uppercase tracking-wide">Modalidad</label>
              <select
                className="w-full rounded-lg border border-green-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
                value={exportFiltros.modalidad}
                onChange={e => setExportFiltros(f => ({ ...f, modalidad: e.target.value }))}
              >
                <option value="">Todas</option>
                {uniqueModalidades.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-[11px] text-green-700">
              El archivo incluye:{" "}
              <strong>Informe Horas Extras</strong> •{" "}
              <strong>Liquidación de Pago</strong> •{" "}
              <strong>Resumen Total Horas</strong> •{" "}
              <strong>Hojas por semana</strong>
            </p>
            <Button
              size="sm"
              className="gap-1.5 bg-green-700 hover:bg-green-800 text-white"
              onClick={handleExport}
              disabled={exportLoading}
            >
              {exportLoading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {exportLoading ? "Generando..." : "Descargar Excel"}
            </Button>
          </div>
        </div>
      )}

      {/* ── Period Selector ── */}
      <div className="rounded-xl border bg-muted/10 p-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Seleccionar período</p>

        {loadingPeriodos ? (
          <div className="h-10 bg-muted rounded-lg animate-pulse" />
        ) : periodos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay períodos creados aún.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {periodos.map(p => {
              const cfg = STATUS_CONFIG[p.estadoPeriodo] ?? STATUS_CONFIG.BORRADOR
              const Icon = cfg.icon
              const isSelected = p.id === selectedPeriodoId
              const isCalculated = p.estadoPeriodo === "CALCULADO" || p.estadoPeriodo === "APROBADO" || p.estadoPeriodo === "CERRADO"
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPeriodoId(p.id)}
                  className={`text-left px-3 py-2.5 rounded-xl border transition-all ${
                    isSelected
                      ? "border-purple-400 bg-purple-50 ring-1 ring-purple-300"
                      : "hover:bg-muted/40 border-border"
                  } ${!isCalculated ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-sm font-semibold truncate">{p.nombrePeriodo}</span>
                    <Badge variant="outline" className={`text-[10px] gap-0.5 shrink-0 ${cfg.color}`}>
                      <Icon className="h-2.5 w-2.5" />
                      {cfg.label}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {fmtDate(p.fechaInicio)} → {fmtDate(p.fechaFin)}
                    <span className="ml-1.5 opacity-60">· {TIPO_SHORT[p.tipoPeriodo] ?? p.tipoPeriodo}</span>
                  </p>
                  {!isCalculated && (
                    <p className="text-[10px] text-amber-600 mt-0.5">Sin resultados calculados</p>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── No period or not calculated ── */}
      {selectedPeriodo && !hasResults && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Período sin resultados calculados</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Este período está en estado <strong>{STATUS_CONFIG[selectedPeriodo.estadoPeriodo]?.label}</strong>.
              Para ver resultados, primero programa los turnos y calcula la nómina.
            </p>
          </div>
          <Link href={`/dashboard/payroll/periods/${selectedPeriodo.id}`} className="ml-auto shrink-0">
            <Button size="sm" variant="outline" className="gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-100">
              <Calendar className="h-3.5 w-3.5" />
              Ir al período
            </Button>
          </Link>
        </div>
      )}

      {/* ── Loading results ── */}
      {loadingResultados && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
          </div>
          <div className="h-64 bg-muted rounded-xl animate-pulse" />
        </div>
      )}

      {/* ── Results ── */}
      {!loadingResultados && hasResults && resultados.length > 0 && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border px-4 py-3 bg-muted/30">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Users className="h-3.5 w-3.5" />
                Empleados liquidados
              </div>
              <p className="text-2xl font-bold">{resultados.length}</p>
            </div>
            <div className="rounded-xl border px-4 py-3 bg-blue-50">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Clock className="h-3.5 w-3.5" />
                Total horas
              </div>
              <p className="text-2xl font-bold text-blue-700">{totalHoras.toFixed(1)} h</p>
            </div>
            <div className="rounded-xl border px-4 py-3 bg-purple-50">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <TrendingUp className="h-3.5 w-3.5" />
                Total devengado
              </div>
              <p className="text-lg font-bold text-purple-700">{fmtCOP(totalDevengado)}</p>
            </div>
            <div className="rounded-xl border px-4 py-3 bg-green-50">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Wallet className="h-3.5 w-3.5" />
                Neto a pagar
              </div>
              <p className="text-lg font-bold text-green-700">{fmtCOP(totalNeto)}</p>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border overflow-hidden">
            {/* Table header */}
            <div className="px-4 py-2.5 bg-muted/20 border-b flex items-center justify-between">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Detalle por empleado
              </p>
              <Badge variant="outline" className="text-[10px]">
                {resultados.length} empleado{resultados.length !== 1 ? "s" : ""}
              </Badge>
            </div>

            {/* Column headers — desktop only */}
            <div className="hidden sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 px-4 py-2 bg-muted/10 border-b text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <span>Empleado</span>
              <span className="text-right">Horas</span>
              <span className="text-right hidden lg:block">Salario base</span>
              <span className="text-right">Devengado</span>
              <span className="text-right">Neto a pagar</span>
              <span />
            </div>

            {/* Rows */}
            <div className="divide-y">
              {resultados.map(r => (
                <div key={r.id} className="hover:bg-muted/20 transition-colors">

                  {/* Mobile card layout */}
                  <div className="flex items-center gap-2.5 px-4 py-3 sm:hidden">
                    <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {r.empleado.nombres.charAt(0)}{r.empleado.apellidos.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {r.empleado.nombres} {r.empleado.apellidos}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        CC {r.empleado.numeroDocumento} · {r.totalHorasTrabajadas.toFixed(1)} h
                        {r.totalHorasExtras > 0 && ` (+${r.totalHorasExtras.toFixed(1)} ext.)`}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Dev: {fmtCOP(r.totalDevengado)}
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      <p className="text-sm font-bold text-green-700">{fmtCOP(r.netoAPagar)}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs h-7 border-purple-200 text-purple-700 hover:bg-purple-50"
                        onClick={() => setDetalleVista(r)}
                      >
                        <Eye className="h-3 w-3" />
                        Ver
                      </Button>
                    </div>
                  </div>

                  {/* Desktop grid layout */}
                  <div className="hidden sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 items-center px-4 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {r.empleado.nombres.charAt(0)}{r.empleado.apellidos.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {r.empleado.nombres} {r.empleado.apellidos}
                        </p>
                        <p className="text-[11px] text-muted-foreground">CC {r.empleado.numeroDocumento}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-blue-700">{r.totalHorasTrabajadas.toFixed(1)} h</p>
                      {r.totalHorasExtras > 0 && (
                        <p className="text-[10px] text-amber-600">+{r.totalHorasExtras.toFixed(1)} extra</p>
                      )}
                    </div>
                    <div className="text-right hidden lg:block">
                      <p className="text-sm text-muted-foreground">{fmtCOP(r.salarioBase)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{fmtCOP(r.totalDevengado)}</p>
                      {r.totalDeducciones > 0 && (
                        <p className="text-[10px] text-red-500">- {fmtCOP(r.totalDeducciones)}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-700">{fmtCOP(r.netoAPagar)}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs h-7 border-purple-200 text-purple-700 hover:bg-purple-50 shrink-0"
                      onClick={() => setDetalleVista(r)}
                    >
                      <Eye className="h-3 w-3" />
                      Ver
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer totals — desktop only */}
            <div className="hidden sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 items-center px-4 py-3 border-t bg-muted/20 font-bold text-sm">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">Totales</span>
              <span className="text-right text-blue-700">{totalHoras.toFixed(1)} h</span>
              <span className="hidden lg:block" />
              <span className="text-right">{fmtCOP(totalDevengado)}</span>
              <span className="text-right text-green-700">{fmtCOP(totalNeto)}</span>
              <span />
            </div>

            {/* Footer totals — mobile summary */}
            <div className="sm:hidden px-4 py-3 border-t bg-muted/20 flex items-center justify-between gap-4 text-sm font-bold">
              <span className="text-muted-foreground text-xs">{resultados.length} empleados · {totalHoras.toFixed(1)} h</span>
              <span className="text-green-700">{fmtCOP(totalNeto)}</span>
            </div>
          </div>
        </>
      )}

      {/* ── Empty results ── */}
      {!loadingResultados && hasResults && resultados.length === 0 && (
        <div className="rounded-xl border bg-muted/10 flex flex-col items-center py-16 text-muted-foreground gap-2">
          <BarChart2 className="h-10 w-10 opacity-20" />
          <p className="font-medium text-sm">No hay resultados para este período</p>
          <Link href={`/dashboard/payroll/periods/${selectedPeriodoId}`}>
            <Button variant="outline" size="sm" className="mt-2 gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Ver período
            </Button>
          </Link>
        </div>
      )}

      {/* ── No period selected ── */}
      {!selectedPeriodoId && !loadingPeriodos && (
        <div className="rounded-xl border bg-muted/10 flex flex-col items-center py-16 text-muted-foreground gap-2">
          <BarChart2 className="h-10 w-10 opacity-20" />
          <p className="font-medium text-sm">Selecciona un período para ver sus resultados</p>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {detalleVista && (
        <DetalleModal
          resultado={detalleVista}
          periodoNombre={selectedPeriodo?.nombrePeriodo ?? ""}
          onClose={() => setDetalleVista(null)}
        />
      )}
    </div>
  )
}

export default function PayrollResultsPage() {
  return (
    <Suspense>
      <ResultsPageInner />
    </Suspense>
  )
}
