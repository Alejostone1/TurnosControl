"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  ArrowLeft, Edit, Trash2,
  Building2, Calendar, DollarSign, Clock,
  User, FileText, Briefcase, CreditCard,
  CalendarDays, Coins, CheckCircle2, XCircle,
  Layers, UserCheck, Hash,
  FileDown, Loader2, Activity, Receipt,
  ClipboardList, AlertCircle,
} from "lucide-react"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Empleado {
  id: string
  tipoDocumento: string
  numeroDocumento: string
  nombres: string
  apellidos: string
  centroCosto: string | null
  programa: string | null
  modalidad: string | null
  cargo: string | null
  fechaIngreso: string
  tipoVinculacion: string
  salarioBase: number
  tieneAuxilioTransporte: boolean
  tipoContrato: string
  horasSemanales: number
  estaActivo: boolean
  creadoEn: string
  actualizadoEn: string
  creadoPorAuxiliarId: string | null
  creadoPorUsuarioId: string | null
  auxiliarCreador?: { id: string; nombres: string; apellidos: string; correo: string }
  usuarioCreador?:  { id: string; nombres: string; apellidos: string; correo: string }
}

interface Asignacion {
  id: string
  fechaTurno: string
  concepto: { nombre: string; codigo: string; tipoImpacto: string }
  horaInicioPersonalizada: string | null
  horaFinPersonalizada: string | null
  minutosAlimentacion: number | null
  observaciones: string | null
}

interface ResultadoNomina {
  id: string
  periodo: { id: string; nombrePeriodo: string; fechaInicio: string; fechaFin: string; estadoPeriodo: string }
  salarioBase: number
  totalDevengado: number
  totalDeducciones: number
  netoAPagar: number
  totalHorasTrabajadas: number
}

interface RegistroAuditoria {
  id: string
  accion: string
  modulo: string
  descripcion: string
  severidad: string
  creadoEn: string
  usuario?: { nombres: string; apellidos: string }
  auxiliar?: { nombres: string; apellidos: string }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount)
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
}
function formatDateShort(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
}
function formatDateTime(d: string) {
  return new Date(d).toLocaleString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, label, bg, iconColor }: {
  icon: React.ElementType; label: string; bg: string; iconColor: string
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className={`p-1.5 rounded-md ${bg}`}>
        <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
      </span>
      <h3 className="text-sm font-semibold">{label}</h3>
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="py-2.5 border-b border-border/40 last:border-0">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">{label}</p>
      <div className={`text-sm font-medium ${mono ? 'font-mono' : ''}`}>
        {value ?? <span className="text-muted-foreground font-normal">—</span>}
      </div>
    </div>
  )
}

function KpiBox({ icon: Icon, label, value, bg, iconColor, valueColor }: {
  icon: React.ElementType; label: string; value: string; bg: string; iconColor: string; valueColor?: string
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`p-1.5 rounded-lg ${bg}`}>
          <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
        </span>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-sm font-bold leading-tight ${valueColor ?? ''}`}>{value}</p>
    </div>
  )
}

function TabSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-14 bg-muted rounded-lg" />
      ))}
    </div>
  )
}

function EmptyState({ icon: Icon, title, description }: {
  icon: React.ElementType; title: string; description: string
}) {
  return (
    <div className="text-center py-12 border-2 border-dashed rounded-xl">
      <Icon className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
      <p className="font-medium text-muted-foreground text-sm">{title}</p>
      <p className="text-xs text-muted-foreground/60 mt-1">{description}</p>
    </div>
  )
}

const SEVERITY_COLORS: Record<string, string> = {
  INFO: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300',
  BAJO: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800',
  MEDIO: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300',
  ALTO: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300',
  CRITICO: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300',
}

const ESTADO_PERIODO_COLORS: Record<string, string> = {
  BORRADOR: 'bg-slate-100 text-slate-600 border-slate-200',
  EN_PROCESO: 'bg-blue-100 text-blue-700 border-blue-200',
  CALCULADO: 'bg-amber-100 text-amber-700 border-amber-200',
  CONFIRMADO: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

// ─── Tab content components ────────────────────────────────────────────────────

function TabProgramaciones({ empleadoId }: { empleadoId: string }) {
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`/api/schedules?empleadoId=${empleadoId}&limit=200`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setAsignaciones)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [empleadoId])

  if (loading) return <TabSkeleton />
  if (error) return (
    <EmptyState icon={AlertCircle} title="Error al cargar" description="No se pudieron obtener las programaciones" />
  )
  if (asignaciones.length === 0) return (
    <EmptyState icon={Calendar} title="Sin programaciones" description="Este empleado no tiene turnos asignados aún" />
  )

  const grouped: Record<string, Asignacion[]> = {}
  for (const a of asignaciones) {
    const month = a.fechaTurno.slice(0, 7)
    if (!grouped[month]) grouped[month] = []
    grouped[month].push(a)
  }

  const IMPACTO_COLORS: Record<string, string> = {
    POSITIVO: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300',
    NEGATIVO: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300',
    NEUTRO:   'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">{asignaciones.length} asignaciones en total</p>
      {Object.entries(grouped)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([month, items]) => {
          const [year, mon] = month.split('-')
          const label = new Date(+year, +mon - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
          return (
            <div key={month}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 capitalize">
                {label} · {items.length} días
              </p>
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <table className="min-w-full divide-y divide-border/40 text-xs">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Fecha</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Concepto</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Horario</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Desc. Alim.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {items.map(a => (
                      <tr key={a.id} className="hover:bg-muted/10">
                        <td className="px-3 py-2 font-mono whitespace-nowrap">
                          {new Date(a.fechaTurno + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                        </td>
                        <td className="px-3 py-2">
                          <Badge className={`text-[10px] ${IMPACTO_COLORS[a.concepto.tipoImpacto] ?? ''}`}>
                            {a.concepto.codigo}
                          </Badge>
                          <span className="ml-1.5 text-xs">{a.concepto.nombre}</span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap font-mono">
                          {a.horaInicioPersonalizada && a.horaFinPersonalizada
                            ? `${a.horaInicioPersonalizada} – ${a.horaFinPersonalizada}`
                            : '—'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-orange-600">
                          {a.minutosAlimentacion ? `${a.minutosAlimentacion}min` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
    </div>
  )
}

function TabNomina({ empleadoId }: { empleadoId: string }) {
  const [resultados, setResultados] = useState<ResultadoNomina[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`/api/payroll/results?empleadoId=${empleadoId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setResultados)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [empleadoId])

  if (loading) return <TabSkeleton />
  if (error) return (
    <EmptyState icon={AlertCircle} title="Error al cargar" description="No se pudieron obtener los resultados de nómina" />
  )
  if (resultados.length === 0) return (
    <EmptyState icon={Receipt} title="Sin resultados de nómina" description="Este empleado aún no tiene períodos de nómina liquidados" />
  )

  const totalNeto = resultados.reduce((s, r) => s + r.netoAPagar, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{resultados.length} períodos liquidados</p>
        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          Total neto acumulado: {formatCurrency(totalNeto)}
        </p>
      </div>
      <div className="rounded-lg border border-border/60 overflow-hidden">
        <table className="min-w-full divide-y divide-border/40 text-xs">
          <thead>
            <tr className="bg-muted/40">
              {['Período', 'Estado', 'Horas', 'Devengado', 'Deducciones', 'Neto'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {resultados.map(r => (
              <tr key={r.id} className="hover:bg-muted/10">
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <p className="font-medium">{r.periodo.nombrePeriodo}</p>
                  <p className="text-muted-foreground mt-0.5">
                    {formatDateShort(r.periodo.fechaInicio)} – {formatDateShort(r.periodo.fechaFin)}
                  </p>
                </td>
                <td className="px-3 py-2.5">
                  <Badge className={`text-[10px] ${ESTADO_PERIODO_COLORS[r.periodo.estadoPeriodo] ?? ''}`}>
                    {r.periodo.estadoPeriodo.replace(/_/g, ' ')}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 font-mono whitespace-nowrap">{r.totalHorasTrabajadas?.toFixed(1) ?? '—'} h</td>
                <td className="px-3 py-2.5 font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                  {formatCurrency(r.totalDevengado)}
                </td>
                <td className="px-3 py-2.5 font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
                  {formatCurrency(r.totalDeducciones)}
                </td>
                <td className="px-3 py-2.5 font-bold whitespace-nowrap">
                  {formatCurrency(r.netoAPagar)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TabHistorial({ empleadoId }: { empleadoId: string }) {
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`/api/auditoria?entidadId=${empleadoId}&limit=50`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setRegistros(data.registros ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [empleadoId])

  if (loading) return <TabSkeleton />
  if (error) return (
    <EmptyState icon={AlertCircle} title="Error al cargar" description="No se pudo obtener el historial de auditoría" />
  )
  if (registros.length === 0) return (
    <EmptyState icon={Activity} title="Sin historial" description="No hay eventos de auditoría para este empleado" />
  )

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{registros.length} eventos registrados</p>
      {registros.map(r => {
        const actor = r.usuario
          ? `${r.usuario.nombres} ${r.usuario.apellidos}`
          : r.auxiliar
            ? `${r.auxiliar.nombres} ${r.auxiliar.apellidos}`
            : 'Sistema'
        return (
          <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/40 hover:bg-muted/10 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`text-[10px] shrink-0 ${SEVERITY_COLORS[r.severidad] ?? ''}`}>
                  {r.severidad}
                </Badge>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {r.accion}
                </span>
                <span className="text-[10px] text-muted-foreground/60 ml-auto whitespace-nowrap">
                  {formatDateTime(r.creadoEn)}
                </span>
              </div>
              <p className="text-xs mt-1">{r.descripcion}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">por {actor}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmpleadoDetailPage() {
  const params    = useParams()
  const router    = useRouter()
  const empleadoId = params.id as string

  const [empleado, setEmpleado]   = useState<Empleado | null>(null)
  const [loading, setLoading]     = useState(true)
  const [deleting, setDeleting]   = useState(false)
  const [exporting, setExporting] = useState(false)
  const [activeTab, setActiveTab] = useState('info')

  useEffect(() => { fetchEmpleado() }, [empleadoId])

  const fetchEmpleado = async () => {
    try {
      const res = await fetch(`/api/employees/${empleadoId}`)
      if (res.ok) setEmpleado(await res.json())
      else toast.error("Error al cargar empleado")
    } catch {
      toast.error("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("¿Eliminar este empleado? La acción se puede revertir.")) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/employees/${empleadoId}`, { method: "DELETE" })
      if (res.ok) { toast.success("Empleado eliminado"); router.push("/dashboard/employees") }
      else { const e = await res.json(); toast.error(e.error || "Error al eliminar") }
    } catch { toast.error("Error de conexión") }
    finally { setDeleting(false) }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch(`/api/reports/empleados?ids=${empleadoId}&estado=todos`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `Empleado_${empleado?.apellidos ?? empleadoId}_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Error al exportar')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-5 max-w-5xl animate-pulse">
        <div className="h-8 w-40 bg-muted rounded" />
        <div className="h-32 bg-muted rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-muted rounded-xl" />)}
        </div>
        <div className="h-10 bg-muted rounded-xl w-full" />
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    )
  }

  if (!empleado) {
    return (
      <div className="text-center py-16 max-w-5xl">
        <p className="text-muted-foreground">Empleado no encontrado</p>
        <Link href="/dashboard/employees">
          <Button className="mt-4" size="sm" variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
        </Link>
      </div>
    )
  }

  const creadorNombre = empleado.usuarioCreador
    ? `${empleado.usuarioCreador.nombres} ${empleado.usuarioCreador.apellidos}`
    : empleado.auxiliarCreador
      ? `${empleado.auxiliarCreador.nombres} ${empleado.auxiliarCreador.apellidos}`
      : 'Sistema'
  const creadorTipo = empleado.usuarioCreador ? 'Administrador' : empleado.auxiliarCreador ? 'Auxiliar' : ''

  return (
    <div className="max-w-5xl space-y-5">

      {/* ── Breadcrumb + Actions ──────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/dashboard/employees">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground h-8 px-2">
              <ArrowLeft className="h-4 w-4" /> Empleados
            </Button>
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="font-medium truncate max-w-[220px]">
            {empleado.nombres} {empleado.apellidos}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline" size="sm"
            onClick={handleExport} disabled={exporting}
            className="gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800"
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
            Exportar
          </Button>
          <Link href={`/dashboard/employees/${empleadoId}/edit`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Edit className="h-3.5 w-3.5" /> Editar
            </Button>
          </Link>
          <Button
            variant="destructive" size="sm"
            onClick={handleDelete} disabled={deleting}
            className="gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deleting ? "Eliminando…" : "Eliminar"}
          </Button>
        </div>
      </div>

      {/* ── Profile Header Card ───────────────────────────────── */}
      <Card className="border border-border/60 overflow-hidden">
        <div className={`h-1.5 w-full ${empleado.estaActivo
          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
          : 'bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700'}`}
        />
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5 mb-1">
                <h1 className="text-xl font-bold tracking-tight">
                  {empleado.nombres} {empleado.apellidos}
                </h1>
                <Badge className={`gap-1 text-xs ${empleado.estaActivo
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'}`}
                >
                  {empleado.estaActivo
                    ? <><CheckCircle2 className="h-3 w-3" /> Activo</>
                    : <><XCircle className="h-3 w-3" /> Inactivo</>
                  }
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {empleado.cargo && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5" />{empleado.cargo}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5" />
                  {empleado.tipoDocumento.replace(/_/g, ' ')} {empleado.numeroDocumento}
                </span>
                {empleado.centroCosto && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />{empleado.centroCosto}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {empleado.modalidad && (
                  <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[11px] font-medium px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                    <Layers className="h-3 w-3" /> {empleado.modalidad}
                  </span>
                )}
                {empleado.tipoContrato && (
                  <span className="inline-flex items-center gap-1 bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 text-[11px] font-medium px-2.5 py-0.5 rounded-full border border-violet-200 dark:border-violet-800">
                    <FileText className="h-3 w-3" /> {empleado.tipoContrato.replace(/_/g, ' ')}
                  </span>
                )}
                {empleado.tipoVinculacion && (
                  <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[11px] font-medium px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                    <UserCheck className="h-3 w-3" /> {empleado.tipoVinculacion.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── KPI strip ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiBox
          icon={DollarSign} label="Salario base"
          value={formatCurrency(empleado.salarioBase)}
          bg="bg-emerald-50 dark:bg-emerald-950/60" iconColor="text-emerald-600"
          valueColor="text-emerald-600 dark:text-emerald-400"
        />
        <KpiBox
          icon={CalendarDays} label="Fecha de ingreso"
          value={formatDateShort(empleado.fechaIngreso)}
          bg="bg-blue-50 dark:bg-blue-950/60" iconColor="text-blue-600"
        />
        <KpiBox
          icon={Clock} label="Horas semanales"
          value={`${empleado.horasSemanales} horas`}
          bg="bg-orange-50 dark:bg-orange-950/60" iconColor="text-orange-600"
        />
        <KpiBox
          icon={FileText} label="Tipo contrato"
          value={empleado.tipoContrato.replace(/_/g, ' ')}
          bg="bg-violet-50 dark:bg-violet-950/60" iconColor="text-violet-600"
        />
      </div>

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:inline-flex h-9">
          <TabsTrigger value="info" className="text-xs gap-1.5">
            <User className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Información</span>
            <span className="sm:hidden">Info</span>
          </TabsTrigger>
          <TabsTrigger value="programaciones" className="text-xs gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Programaciones</span>
            <span className="sm:hidden">Turnos</span>
          </TabsTrigger>
          <TabsTrigger value="nomina" className="text-xs gap-1.5">
            <Receipt className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Nómina</span>
            <span className="sm:hidden">Nómina</span>
          </TabsTrigger>
          <TabsTrigger value="historial" className="text-xs gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Historial</span>
            <span className="sm:hidden">Log</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Información ── */}
        <TabsContent value="info" className="mt-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="border border-border/60">
              <CardContent className="p-5">
                <SectionTitle icon={User} label="Identificación"
                  bg="bg-slate-100 dark:bg-slate-800" iconColor="text-slate-600 dark:text-slate-300" />
                <Field label="Tipo de documento" value={empleado.tipoDocumento.replace(/_/g, ' ')} />
                <Field label="Número de documento" value={empleado.numeroDocumento} mono />
                <Field label="Nombres" value={empleado.nombres} />
                <Field label="Apellidos" value={empleado.apellidos} />
              </CardContent>
            </Card>

            <Card className="border border-border/60">
              <CardContent className="p-5">
                <SectionTitle icon={Building2} label="Organización"
                  bg="bg-blue-50 dark:bg-blue-950/60" iconColor="text-blue-600" />
                <Field label="Cargo" value={empleado.cargo} />
                <Field label="Centro de costo" value={empleado.centroCosto} />
                <Field label="Programa" value={empleado.programa} />
                <Field label="Modalidad"
                  value={empleado.modalidad
                    ? <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full">{empleado.modalidad}</span>
                    : null}
                />
                <Field label="Fecha de ingreso" value={formatDate(empleado.fechaIngreso)} />
              </CardContent>
            </Card>

            <Card className="border border-border/60">
              <CardContent className="p-5">
                <SectionTitle icon={Coins} label="Financiero y Contrato"
                  bg="bg-emerald-50 dark:bg-emerald-950/60" iconColor="text-emerald-600" />
                <Field label="Salario base"
                  value={<span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(empleado.salarioBase)}</span>}
                />
                <Field label="Auxilio de transporte"
                  value={
                    <Badge className={`text-[10px] mt-0.5 ${empleado.tieneAuxilioTransporte
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800'}`}
                    >
                      {empleado.tieneAuxilioTransporte ? 'Incluido' : 'No aplica'}
                    </Badge>
                  }
                />
                <Field label="Tipo de vinculación" value={empleado.tipoVinculacion.replace(/_/g, ' ')} />
                <Field label="Tipo de contrato" value={empleado.tipoContrato.replace(/_/g, ' ')} />
                <Field label="Horas semanales" value={`${empleado.horasSemanales} h`} />
              </CardContent>
            </Card>
          </div>

          {/* Trazabilidad */}
          <Card className="border border-border/50 bg-muted/20 mt-5">
            <CardContent className="px-5 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-md mt-0.5">
                    <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
                  </span>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Creado por</p>
                    <p className="text-sm font-semibold mt-0.5">{creadorNombre}</p>
                    {creadorTipo && <p className="text-[11px] text-muted-foreground">{creadorTipo}</p>}
                  </div>
                </div>
                <Separator orientation="vertical" className="hidden sm:block h-auto" />
                <div className="flex items-start gap-3">
                  <span className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md mt-0.5">
                    <CalendarDays className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                  </span>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Registrado</p>
                    <p className="text-sm font-medium mt-0.5">{formatDate(empleado.creadoEn)}</p>
                  </div>
                </div>
                <Separator orientation="vertical" className="hidden sm:block h-auto" />
                <div className="flex items-start gap-3">
                  <span className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md mt-0.5">
                    <Hash className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                  </span>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">ID del registro</p>
                    <p className="text-xs font-mono mt-0.5 text-muted-foreground">{empleado.id}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Programaciones ── */}
        <TabsContent value="programaciones" className="mt-5">
          {activeTab === 'programaciones' && <TabProgramaciones empleadoId={empleadoId} />}
        </TabsContent>

        {/* ── Tab: Nómina ── */}
        <TabsContent value="nomina" className="mt-5">
          {activeTab === 'nomina' && <TabNomina empleadoId={empleadoId} />}
        </TabsContent>

        {/* ── Tab: Historial ── */}
        <TabsContent value="historial" className="mt-5">
          {activeTab === 'historial' && <TabHistorial empleadoId={empleadoId} />}
        </TabsContent>
      </Tabs>
    </div>
  )
}
