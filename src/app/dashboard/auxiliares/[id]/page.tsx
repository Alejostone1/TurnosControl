"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft, Edit, Trash2, Mail, Phone, Hash, Calendar,
  Users, Clock, CheckCircle2, XCircle, Activity,
  Briefcase, FileText, AlertCircle, RefreshCw,
} from "lucide-react"
import { toast } from "sonner"

interface Empleado {
  id: string
  nombres: string
  apellidos: string
  cargo: string | null
  centroCosto: string | null
  estaActivo: boolean
  creadoEn: string
}

interface RegistroAuditoria {
  id: string
  accion: string
  entidad: string
  descripcion: string | null
  creadoEn: string
}

interface Auxiliar {
  id: string
  correo: string
  nombres: string
  apellidos: string
  documento: string | null
  telefono: string | null
  estaActivo: boolean
  creadoEn: string
  actualizadoEn: string
  creadoPor: string | null
  _count: { empleadosCreados: number }
  empleadosCreados: Empleado[]
}

const ACCION_CONFIG: Record<string, { label: string; color: string }> = {
  CREAR:      { label: 'Creó',      color: 'bg-emerald-500' },
  ACTUALIZAR: { label: 'Actualizó', color: 'bg-blue-500' },
  ELIMINAR:   { label: 'Desactivó', color: 'bg-red-500' },
  CALCULAR:   { label: 'Calculó',   color: 'bg-violet-500' },
  APROBAR:    { label: 'Aprobó',    color: 'bg-amber-500' },
  EXPORTAR:   { label: 'Exportó',   color: 'bg-slate-500' },
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
}
function formatDateShort(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
}
function formatDateTime(d: string) {
  return new Date(d).toLocaleString('es-CO', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
function daysInSystem(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24))
}

export default function AuxiliarDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [auxiliar, setAuxiliar]   = useState<Auxiliar | null>(null)
  const [auditoria, setAuditoria] = useState<RegistroAuditoria[]>([])
  const [loading, setLoading]     = useState(true)
  const [deleting, setDeleting]   = useState(false)

  useEffect(() => {
    Promise.all([fetchAuxiliar(), fetchAuditoria()]).finally(() => setLoading(false))
  }, [id])

  const fetchAuxiliar = async () => {
    const res = await fetch(`/api/auxiliares/${id}`)
    if (res.ok) setAuxiliar(await res.json())
    else toast.error("Error al cargar auxiliar")
  }

  const fetchAuditoria = async () => {
    const res = await fetch(`/api/auxiliares/${id}/auditoria?limit=20`)
    if (res.ok) {
      const data = await res.json()
      setAuditoria(data.registros ?? [])
    }
  }

  const handleDelete = async () => {
    if (!confirm(`¿Desactivar a ${auxiliar?.nombres} ${auxiliar?.apellidos}?`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/auxiliares/${id}`, { method: "DELETE" })
      if (res.ok) { toast.success("Auxiliar desactivado"); router.push("/dashboard/auxiliares") }
      else { const e = await res.json(); toast.error(e.error || "Error al desactivar") }
    } catch { toast.error("Error de conexión") }
    finally { setDeleting(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!auxiliar) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
        <p className="font-semibold text-muted-foreground">Auxiliar no encontrado</p>
        <Link href="/dashboard/auxiliares">
          <Button className="mt-4" variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver al listado
          </Button>
        </Link>
      </div>
    )
  }

  const dias = daysInSystem(auxiliar.creadoEn)

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Breadcrumb / Nav bar ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/dashboard/auxiliares">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground h-8 px-2">
              <ArrowLeft className="h-4 w-4" /> Auxiliares
            </Button>
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="font-medium truncate max-w-[200px]">
            {auxiliar.nombres} {auxiliar.apellidos}
          </span>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/auxiliares/${id}/edit`}>
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
            {deleting ? "Desactivando…" : "Desactivar"}
          </Button>
        </div>
      </div>

      {/* ── Profile Header Card ──────────────────────────────── */}
      <Card className="border border-border/60 overflow-hidden">
        {/* Gradient accent bar */}
        <div className={`h-1.5 w-full ${auxiliar.estaActivo
          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
          : 'bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700'}`}
        />
        <CardContent className="p-6">
          {/* Name + role + status */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-bold tracking-tight">
                  {auxiliar.nombres} {auxiliar.apellidos}
                </h1>
                <Badge
                  className={`gap-1 text-xs ${auxiliar.estaActivo
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'}`}
                >
                  {auxiliar.estaActivo
                    ? <><CheckCircle2 className="h-3 w-3" /> Activo</>
                    : <><XCircle className="h-3 w-3" /> Inactivo</>
                  }
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Auxiliar Administrativo &middot; Sistema de Gestión de Turnos
              </p>
            </div>
          </div>

          {/* KPI metrics row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-border/50">
            {[
              { label: 'Empleados gestionados', value: auxiliar._count.empleadosCreados, icon: Users },
              { label: 'Días en el sistema',    value: dias,                             icon: Clock },
              { label: 'Última actualización',  value: formatDateShort(auxiliar.actualizadoEn), icon: RefreshCw },
              { label: 'Registros de actividad',value: auditoria.length,                icon: Activity },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <Icon className="h-3 w-3" /> {label}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Main content grid ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left column (2/3) ─────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Información General */}
          <Card className="border border-border/60">
            <CardHeader className="pt-5 px-5 pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span className="p-1.5 bg-blue-50 dark:bg-blue-950/60 rounded-md">
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                </span>
                Información General
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-0 divide-y divide-border/40">
              {[
                { icon: Mail,     label: "Correo electrónico",  value: auxiliar.correo },
                { icon: Phone,    label: "Teléfono de contacto",value: auxiliar.telefono || "No registrado" },
                { icon: Hash,     label: "Número de documento", value: auxiliar.documento || "No registrado" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 py-3.5">
                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
                    <p className="text-sm font-medium mt-0.5 truncate">{value}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Historial de Actividad */}
          <Card className="border border-border/60">
            <CardHeader className="pt-5 px-5 pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span className="p-1.5 bg-violet-50 dark:bg-violet-950/60 rounded-md">
                  <Activity className="h-3.5 w-3.5 text-violet-600" />
                </span>
                Historial de Actividad
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {auditoria.length === 0 ? (
                <div className="text-center py-10">
                  <Activity className="h-9 w-9 mx-auto mb-2 text-muted-foreground/25" />
                  <p className="text-sm text-muted-foreground">Sin registros de actividad</p>
                </div>
              ) : (
                <div className="relative pl-6">
                  {/* Timeline line */}
                  <div className="absolute left-3 top-1 bottom-1 w-px bg-border" />
                  <div className="space-y-5">
                    {auditoria.map(r => {
                      const cfg = ACCION_CONFIG[r.accion] ?? { label: r.accion, color: 'bg-slate-400' }
                      return (
                        <div key={r.id} className="relative">
                          {/* Dot */}
                          <div className={`absolute -left-6 top-1 w-3 h-3 rounded-full ring-2 ring-background ${cfg.color}`} />
                          <div>
                            <p className="text-sm leading-snug">
                              <span className="font-medium">{cfg.label}</span>{' '}
                              <span className="text-muted-foreground">{r.entidad}</span>
                            </p>
                            {r.descripcion && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.descripcion}</p>
                            )}
                            <p className="text-[11px] text-muted-foreground/60 mt-1">{formatDateTime(r.creadoEn)}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right column (1/3) ────────────────────────────── */}
        <div className="space-y-5">

          {/* Datos Contractuales */}
          <Card className="border border-border/60">
            <CardHeader className="pt-5 px-5 pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span className="p-1.5 bg-amber-50 dark:bg-amber-950/60 rounded-md">
                  <Briefcase className="h-3.5 w-3.5 text-amber-600" />
                </span>
                Datos Contractuales
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              <Field label="Cargo" value="Auxiliar Administrativo" />
              <Separator />
              <Field label="Fecha de ingreso" value={formatDate(auxiliar.creadoEn)} />
              <Separator />
              <Field label="Última modificación" value={formatDate(auxiliar.actualizadoEn)} />
              <Separator />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5">Estado</p>
                <Badge
                  className={`gap-1 text-xs ${auxiliar.estaActivo
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800'}`}
                >
                  {auxiliar.estaActivo
                    ? <><CheckCircle2 className="h-3 w-3" /> Activo</>
                    : <><XCircle className="h-3 w-3" /> Inactivo</>
                  }
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Empleados Recientes */}
          <Card className="border border-border/60">
            <CardHeader className="pt-5 px-5 pb-4">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-md">
                    <Users className="h-3.5 w-3.5 text-emerald-600" />
                  </span>
                  Empleados Recientes
                </div>
                <span className="text-xs font-normal text-muted-foreground">
                  {auxiliar._count.empleadosCreados} total
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {auxiliar.empleadosCreados.length === 0 ? (
                <div className="text-center py-7">
                  <Users className="h-7 w-7 mx-auto mb-2 text-muted-foreground/25" />
                  <p className="text-xs text-muted-foreground">Sin empleados registrados</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {auxiliar.empleadosCreados.map(emp => (
                    <Link key={emp.id} href={`/dashboard/employees/${emp.id}`}>
                      <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/60 transition-colors border border-transparent hover:border-border/40 cursor-pointer">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{emp.nombres} {emp.apellidos}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {emp.cargo || emp.centroCosto || 'Sin cargo asignado'}
                          </p>
                        </div>
                        <Badge
                          className={`text-[10px] ml-2 shrink-0 ${emp.estaActivo
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800'}`}
                        >
                          {emp.estaActivo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                  {auxiliar._count.empleadosCreados > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      +{auxiliar._count.empleadosCreados - 5} empleados más
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Acciones Administrativas */}
          <Card className="border border-border/60">
            <CardHeader className="pt-5 px-5 pb-3">
              <CardTitle className="text-sm font-semibold">Acciones Administrativas</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-2">
              <Link href={`/dashboard/auxiliares/${id}/edit`} className="block">
                <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-9">
                  <Edit className="h-4 w-4" /> Editar información
                </Button>
              </Link>
              <Button
                variant="outline" size="sm"
                className="w-full justify-start gap-2 h-9 text-destructive hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? "Procesando…" : "Desactivar auxiliar"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ─── Small helper components ──────────────────────────────────────────────────
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
  )
}
