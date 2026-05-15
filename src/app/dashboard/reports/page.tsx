"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  FileSpreadsheet, Download, Clock, DollarSign, Calendar, Users,
  RefreshCw, Filter, ChevronDown, ChevronUp, AlertCircle,
} from "lucide-react"
import { toast } from "sonner"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Periodo {
  id: string; nombrePeriodo: string; estadoPeriodo: string
  fechaInicio: string; fechaFin: string
}
interface Empleado {
  id: string; nombres: string; apellidos: string; numeroDocumento: string
  centroCosto: string | null; programa: string | null; modalidad: string | null
}
interface FilterState {
  periodoId: string
  empleadoId: string
  centroCosto: string
  programa: string
  modalidad: string
  estado: string
}

const EMPTY_FILTERS: FilterState = {
  periodoId: "", empleadoId: "", centroCosto: "", programa: "", modalidad: "", estado: "activo",
}

// ─────────────────────────────────────────────────────────────────────────────
// Report definitions
// ─────────────────────────────────────────────────────────────────────────────

interface ReportDef {
  key: string
  title: string
  description: string
  detail: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
  accentBorder: string
  endpoint: string
  requiredFilters: string[]
  optionalFilters: string[]
  sheets: string[]
}

const REPORTS: ReportDef[] = [
  {
    key: "nomina",
    title: "Liquidación de Nómina",
    description: "Resultado completo por empleado: horas, recargos, extras, devengado, deducciones, neto.",
    detail: "Incluye 2 hojas: detalle por empleado y resumen ejecutivo del período.",
    icon: DollarSign,
    iconBg: "bg-violet-100",
    iconColor: "text-violet-700",
    accentBorder: "border-l-violet-500",
    endpoint: "/api/reports/nomina",
    requiredFilters: ["periodoId"],
    optionalFilters: ["centroCosto", "programa", "modalidad"],
    sheets: ["Nómina", "Resumen Ejecutivo"],
  },
  {
    key: "horas",
    title: "Horas Trabajadas por Día",
    description: "Detalle diario: ordinarias, nocturnas, festivas y horas extra con acumulado semanal.",
    detail: "Requiere período calculado. Muestra cada día trabajado con su desglose completo.",
    icon: Clock,
    iconBg: "bg-teal-100",
    iconColor: "text-teal-700",
    accentBorder: "border-l-teal-500",
    endpoint: "/api/reports/horas",
    requiredFilters: ["periodoId"],
    optionalFilters: ["empleadoId", "centroCosto"],
    sheets: ["Horas por Día"],
  },
  {
    key: "turnos",
    title: "Turnos Programados",
    description: "Toda la programación de turnos: fecha, tipo (D/N/24T/M), novedad, horarios.",
    detail: "Permite filtrar por empleado, centro de costo, programa o modalidad.",
    icon: Calendar,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-700",
    accentBorder: "border-l-blue-500",
    endpoint: "/api/reports/turnos",
    requiredFilters: ["periodoId"],
    optionalFilters: ["empleadoId", "centroCosto", "programa", "modalidad"],
    sheets: ["Turnos"],
  },
  {
    key: "empleados",
    title: "Listado de Empleados",
    description: "Maestro de empleados: datos personales, laborales, salario y vinculación.",
    detail: "No requiere período. Filtra por estado, centro, programa o modalidad.",
    icon: Users,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-700",
    accentBorder: "border-l-slate-500",
    endpoint: "/api/reports/empleados",
    requiredFilters: [],
    optionalFilters: ["estado", "centroCosto", "programa", "modalidad"],
    sheets: ["Empleados"],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [periodos, setPeriodos]   = useState<Periodo[]>([])
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading]     = useState(true)

  const [filters, setFilters] = useState<Record<string, FilterState>>(
    Object.fromEntries(REPORTS.map(r => [r.key, { ...EMPTY_FILTERS }]))
  )
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(REPORTS.map(r => [r.key, false]))
  )
  const [downloading, setDownloading] = useState<Record<string, boolean>>({})

  useEffect(() => {
    Promise.all([
      fetch("/api/payroll/periods").then(r => r.json()),
      fetch("/api/employees").then(r => r.json()),
    ]).then(([pers, emps]) => {
      setPeriodos(Array.isArray(pers) ? pers : [])
      const arr = Array.isArray(emps) ? emps : (emps?.empleados ?? [])
      setEmpleados(arr)
    }).catch(() => toast.error("Error al cargar datos"))
    .finally(() => setLoading(false))
  }, [])

  const centros     = Array.from(new Set(empleados.map(e => e.centroCosto).filter(Boolean))) as string[]
  const programas   = Array.from(new Set(empleados.map(e => e.programa).filter(Boolean)))    as string[]
  const modalidades = Array.from(new Set(empleados.map(e => e.modalidad).filter(Boolean)))   as string[]
  const periodosCalc = periodos.filter(p => ["CALCULADO","APROBADO","CERRADO"].includes(p.estadoPeriodo))

  function setF(key: string, field: keyof FilterState, value: string) {
    setFilters(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
  }
  function toggleExpand(key: string) {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleDownload(report: ReportDef) {
    const f = filters[report.key]
    for (const req of report.requiredFilters) {
      if (!f[req as keyof FilterState]) {
        toast.error("Selecciona un período para continuar")
        setExpanded(prev => ({ ...prev, [report.key]: true }))
        return
      }
    }

    const params = new URLSearchParams()
    if (f.periodoId)   params.set("periodoId",   f.periodoId)
    if (f.empleadoId)  params.set("empleadoId",  f.empleadoId)
    if (f.centroCosto) params.set("centroCosto", f.centroCosto)
    if (f.programa)    params.set("programa",    f.programa)
    if (f.modalidad)   params.set("modalidad",   f.modalidad)
    if (report.key === "empleados") params.set("estado", f.estado || "activo")

    setDownloading(prev => ({ ...prev, [report.key]: true }))
    try {
      const res = await fetch(`${report.endpoint}?${params}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? "Error al generar el reporte")
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = Object.assign(document.createElement("a"), {
        href: url, download: `${report.title.replace(/\s+/g,"_")}.xlsx`,
      })
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`"${report.title}" descargado`)
    } catch (e: any) {
      toast.error(e.message ?? "Error al descargar")
    } finally {
      setDownloading(prev => ({ ...prev, [report.key]: false }))
    }
  }

  function renderFilters(report: ReportDef) {
    const f   = filters[report.key]
    const has = (field: string) =>
      report.optionalFilters.includes(field) || report.requiredFilters.includes(field)

    const periodSource = report.key === "horas" ? periodosCalc : periodos

    return (
      <div className="space-y-3">
        {has("periodoId") && (
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1">
              Período <span className="text-rose-500">*</span>
              {report.key === "horas" && (
                <span className="normal-case font-normal text-[9px] text-amber-600 ml-1">(solo calculados)</span>
              )}
            </label>
            <Select value={f.periodoId || "__all__"} onValueChange={v => setF(report.key, "periodoId", v === "__all__" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecciona un período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">— Selecciona —</SelectItem>
                {periodSource.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombrePeriodo}
                    <span className="ml-1 text-muted-foreground text-[10px]">({p.estadoPeriodo})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {has("empleadoId") && (
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Empleado</label>
            <Select value={f.empleadoId || "__all__"} onValueChange={v => setF(report.key, "empleadoId", v === "__all__" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos los empleados" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos los empleados</SelectItem>
                {empleados.map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.apellidos} {e.nombres} · {e.numeroDocumento}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {has("estado") && report.key === "empleados" && (
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Estado</label>
            <Select value={f.estado || "activo"} onValueChange={v => setF(report.key, "estado", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="activo">Solo activos</SelectItem>
                <SelectItem value="inactivo">Solo inactivos</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {(has("centroCosto") || has("programa")) && (
          <div className="grid grid-cols-2 gap-2">
            {has("centroCosto") && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Centro Costo</label>
                <Select value={f.centroCosto || "__all__"} onValueChange={v => setF(report.key, "centroCosto", v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    {centros.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {has("programa") && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Programa</label>
                <Select value={f.programa || "__all__"} onValueChange={v => setF(report.key, "programa", v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    {programas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {has("modalidad") && (
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Modalidad</label>
            <Select value={f.modalidad || "__all__"} onValueChange={v => setF(report.key, "modalidad", v === "__all__" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {modalidades.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {(f.centroCosto || f.programa || f.modalidad || f.empleadoId) && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {f.centroCosto && <Badge variant="secondary" className="text-[10px]">Centro: {f.centroCosto}</Badge>}
            {f.programa    && <Badge variant="secondary" className="text-[10px]">Prog: {f.programa}</Badge>}
            {f.modalidad   && <Badge variant="secondary" className="text-[10px]">Mod: {f.modalidad}</Badge>}
            {f.empleadoId  && <Badge variant="secondary" className="text-[10px]">1 empleado</Badge>}
            <button
              onClick={() => setFilters(prev => ({ ...prev, [report.key]: { ...EMPTY_FILTERS } }))}
              className="text-[10px] text-muted-foreground hover:text-foreground underline"
            >
              limpiar filtros
            </button>
          </div>
        )}
      </div>
    )
  }

  if (loading) return (
    <div className="space-y-5">
      <div className="h-14 bg-muted rounded-xl animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-52 bg-muted rounded-xl animate-pulse" />)}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="h-6 w-6 text-slate-700" />
            <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Exporta a Excel con filtros por período, empleado, centro de costo, programa y modalidad
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 shrink-0 h-7 px-2.5 text-xs border-slate-300 text-slate-600">
          <FileSpreadsheet className="h-3.5 w-3.5" />
          {REPORTS.length} reportes
        </Badge>
      </div>

      {periodosCalc.length === 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700">
            El reporte de <strong>Horas Trabajadas</strong> requiere al menos un período calculado o cerrado.
          </p>
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {REPORTS.map(report => {
          const Icon        = report.icon
          const isExpanded  = expanded[report.key]
          const isDl        = downloading[report.key]
          const f           = filters[report.key]
          const hasRequired = report.requiredFilters.every(r => !!f[r as keyof FilterState])
          const hasFilter   = !!(f.centroCosto || f.programa || f.modalidad || f.empleadoId || (report.key === "empleados" && f.estado !== "activo"))

          return (
            <Card key={report.key} className={`border border-gray-200 border-l-4 ${report.accentBorder} overflow-hidden bg-white`}>
              {/* Card header */}
              <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${report.iconBg}`}>
                  <Icon className={`h-[18px] w-[18px] ${report.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-gray-900 text-[14px] leading-tight">{report.title}</h2>
                    <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                      {report.sheets.map(s => (
                        <Badge key={s} variant="secondary" className="text-[9px] px-1.5 h-4 font-normal text-gray-500">{s}</Badge>
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{report.description}</p>
                </div>
              </div>

              <CardContent className="pt-4 pb-4 space-y-3">
                <p className="text-[11px] text-gray-500 leading-relaxed">{report.detail}</p>

                {/* Filter section */}
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => toggleExpand(report.key)}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                      <Filter className="h-3.5 w-3.5 text-gray-400" />
                      Configurar filtros
                      {hasFilter && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-gray-400 text-gray-600 font-normal">
                          activos
                        </Badge>
                      )}
                    </span>
                    {isExpanded
                      ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
                      : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                    }
                  </button>
                  {isExpanded && (
                    <div className="p-3 border-t border-gray-100 bg-white">
                      {renderFilters(report)}
                    </div>
                  )}
                </div>

                <Button
                  className="w-full h-9 gap-2 font-semibold bg-gray-900 hover:bg-gray-700 text-white"
                  onClick={() => handleDownload(report)}
                  disabled={isDl}
                >
                  {isDl
                    ? <><RefreshCw className="h-4 w-4 animate-spin" /> Generando Excel...</>
                    : <><Download className="h-4 w-4" /> Descargar Excel</>
                  }
                </Button>

                {!hasRequired && !isExpanded && report.requiredFilters.length > 0 && (
                  <p className="text-[10px] text-amber-600 text-center -mt-1">
                    Abre los filtros y selecciona un período
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Info footer */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
        <p className="text-xs font-semibold mb-3 text-gray-500 uppercase tracking-wide">Descripción de reportes</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-[11px] text-gray-500">
          <div>
            <p className="font-semibold text-gray-700 mb-1">Liquidación de Nómina</p>
            <p>29 columnas. Todos los tipos de horas, recargos colombianos y valores monetarios. 2 hojas: detalle + resumen.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-1">Horas por Día</p>
            <p>21 columnas. Registro diario calculado con acumulado semanal. Solo funciona con períodos calculados.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-1">Turnos Programados</p>
            <p>14 columnas. Toda la programación: fecha, turno, novedad, festivos, horarios exactos.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-1">Listado de Empleados</p>
            <p>15 columnas. Maestro completo con datos laborales, salario y tipo de vinculación.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
