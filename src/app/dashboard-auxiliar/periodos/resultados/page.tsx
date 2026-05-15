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
  Wallet,
  Eye,
  X,
  Download,
  RefreshCw,
  Calendar,
} from "lucide-react"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────

interface Resultado {
  id: string
  empleadoId: string
  empleado: { id: string; nombres: string; apellidos: string; numeroDocumento: string }
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

// ─── Detail Modal ─────────────────────────────────────────────

function DetalleModal({ resultado, onClose }: { resultado: Resultado; onClose: () => void }) {
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
            <p className="text-xs text-muted-foreground">CC {r.empleado.numeroDocumento}</p>
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
              {horasRows.length === 0 && (
                <div className="px-3 py-3 text-sm text-muted-foreground text-center">Sin horas detalladas</div>
              )}
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

// ─── Inner Page ───────────────────────────────────────────────

function ResultadosAuxiliarInner() {
  const searchParams = useSearchParams()
  const periodoId = searchParams.get("periodoId") ?? ""

  const [resultados, setResultados] = useState<Resultado[]>([])
  const [loading, setLoading] = useState(false)
  const [detalleVista, setDetalleVista] = useState<Resultado | null>(null)
  const [exportLoading, setExportLoading] = useState(false)

  useEffect(() => {
    if (periodoId) fetchResultados()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodoId])

  async function fetchResultados() {
    setLoading(true)
    try {
      const res = await fetch(`/api/payroll/results?periodoId=${periodoId}`)
      if (res.ok) {
        setResultados(await res.json())
      } else {
        toast.error("Error al cargar los resultados de nómina")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  async function handleExport() {
    setExportLoading(true)
    try {
      const params = new URLSearchParams({ periodoId })
      const res = await fetch(`/api/payroll/export?${params}`)
      if (!res.ok) {
        toast.error("Error al exportar")
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `nomina-${periodoId}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Excel descargado")
    } catch {
      toast.error("Error de conexión")
    } finally {
      setExportLoading(false)
    }
  }

  const totalDevengado = resultados.reduce((s, r) => s + r.totalDevengado, 0)
  const totalDeducciones = resultados.reduce((s, r) => s + r.totalDeducciones, 0)
  const totalNeto = resultados.reduce((s, r) => s + r.netoAPagar, 0)
  const totalHoras = resultados.reduce((s, r) => s + r.totalHorasTrabajadas, 0)

  if (!periodoId) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <Link href="/dashboard-auxiliar/periodos">
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="h-3.5 w-3.5" />
              Períodos
            </Button>
          </Link>
        </div>
        <div className="rounded-xl border bg-muted/10 flex flex-col items-center py-16 text-muted-foreground gap-2">
          <BarChart2 className="h-10 w-10 opacity-20" />
          <p className="font-medium text-sm">No se especificó un período</p>
          <Link href="/dashboard-auxiliar/periodos">
            <Button variant="outline" size="sm" className="mt-2 gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Ver períodos
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-emerald-600" />
            <h1 className="text-2xl font-bold">Resultados de Nómina</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Detalle de liquidación del período
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {resultados.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50"
              onClick={handleExport}
              disabled={exportLoading}
            >
              {exportLoading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {exportLoading ? "Generando..." : "Exportar Excel"}
            </Button>
          )}
          <Link href={`/dashboard-auxiliar/periodos/${periodoId}`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver al período
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
          </div>
          <div className="h-64 bg-muted rounded-xl animate-pulse" />
        </div>
      )}

      {/* ── Results ── */}
      {!loading && resultados.length > 0 && (
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
            <div className="rounded-xl border px-4 py-3 bg-emerald-50">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <TrendingUp className="h-3.5 w-3.5" />
                Total devengado
              </div>
              <p className="text-lg font-bold text-emerald-700">{fmtCOP(totalDevengado)}</p>
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
            <div className="px-4 py-2.5 bg-muted/20 border-b flex items-center justify-between">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Detalle por empleado
              </p>
              <Badge variant="outline" className="text-[10px]">
                {resultados.length} empleado{resultados.length !== 1 ? "s" : ""}
              </Badge>
            </div>

            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 px-4 py-2 bg-muted/10 border-b text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <span>Empleado</span>
              <span className="text-right">Horas</span>
              <span className="text-right hidden sm:block">Salario base</span>
              <span className="text-right">Devengado</span>
              <span className="text-right">Neto a pagar</span>
              <span />
            </div>

            <div className="divide-y">
              {resultados.map(r => (
                <div
                  key={r.id}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 items-center px-4 py-3 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
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

                  <div className="text-right hidden sm:block">
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
                    className="gap-1 text-xs h-7 border-emerald-200 text-emerald-700 hover:bg-emerald-50 shrink-0"
                    onClick={() => setDetalleVista(r)}
                  >
                    <Eye className="h-3 w-3" />
                    Ver
                  </Button>
                </div>
              ))}
            </div>

            {/* Footer totals */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 items-center px-4 py-3 border-t bg-muted/20 font-bold text-sm">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">Totales</span>
              <span className="text-right text-blue-700">{totalHoras.toFixed(1)} h</span>
              <span className="hidden sm:block" />
              <span className="text-right">{fmtCOP(totalDevengado)}</span>
              <span className="text-right text-green-700">{fmtCOP(totalNeto)}</span>
              <span />
            </div>
          </div>
        </>
      )}

      {/* ── Empty state ── */}
      {!loading && resultados.length === 0 && (
        <div className="rounded-xl border bg-muted/10 flex flex-col items-center py-16 text-muted-foreground gap-2">
          <BarChart2 className="h-10 w-10 opacity-20" />
          <p className="font-medium text-sm">No hay resultados calculados para este período</p>
          <p className="text-xs text-muted-foreground">
            El período puede no estar calculado aún. Contacta al administrador.
          </p>
          <Link href={`/dashboard-auxiliar/periodos/${periodoId}`}>
            <Button variant="outline" size="sm" className="mt-2 gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Ver período
            </Button>
          </Link>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {detalleVista && (
        <DetalleModal
          resultado={detalleVista}
          onClose={() => setDetalleVista(null)}
        />
      )}
    </div>
  )
}

export default function AuxiliarResultadosPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-64 bg-muted rounded-lg" />}>
      <ResultadosAuxiliarInner />
    </Suspense>
  )
}
