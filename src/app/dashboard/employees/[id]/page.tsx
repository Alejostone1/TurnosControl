"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft, Edit, Trash2,
  Building2, Calendar, DollarSign, Clock,
  User, FileText, Briefcase, CreditCard,
  CalendarDays, Coins, CheckCircle2, XCircle,
  MapPin, Layers, UserCheck, Hash,
} from "lucide-react"
import { toast } from "sonner"

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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount)
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
}
function formatDateShort(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({
  icon: Icon,
  label,
  bg,
  iconColor,
}: {
  icon: React.ElementType
  label: string
  bg: string
  iconColor: string
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
      <div className={`text-sm font-medium ${mono ? 'font-mono' : ''}`}>{value ?? <span className="text-muted-foreground font-normal">—</span>}</div>
    </div>
  )
}

function KpiBox({
  icon: Icon,
  label,
  value,
  bg,
  iconColor,
  valueColor,
}: {
  icon: React.ElementType
  label: string
  value: string
  bg: string
  iconColor: string
  valueColor?: string
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmpleadoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const empleadoId = params.id as string

  const [empleado, setEmpleado] = useState<Empleado | null>(null)
  const [loading, setLoading]   = useState(true)
  const [deleting, setDeleting] = useState(false)

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

  if (loading) {
    return (
      <div className="space-y-5 max-w-5xl animate-pulse">
        <div className="h-8 w-40 bg-muted rounded" />
        <div className="h-32 bg-muted rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-muted rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1,2,3].map(i => <div key={i} className="h-64 bg-muted rounded-xl" />)}
        </div>
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
        <div className="flex gap-2">
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
              {/* Name + status */}
              <div className="flex flex-wrap items-center gap-2.5 mb-1">
                <h1 className="text-xl font-bold tracking-tight">
                  {empleado.nombres} {empleado.apellidos}
                </h1>
                <Badge
                  className={`gap-1 text-xs ${empleado.estaActivo
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'}`}
                >
                  {empleado.estaActivo
                    ? <><CheckCircle2 className="h-3 w-3" /> Activo</>
                    : <><XCircle className="h-3 w-3" /> Inactivo</>
                  }
                </Badge>
              </div>

              {/* Role / doc line */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {empleado.cargo && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5" />
                    {empleado.cargo}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5" />
                  {empleado.tipoDocumento.replace(/_/g, ' ')} {empleado.numeroDocumento}
                </span>
                {empleado.centroCosto && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {empleado.centroCosto}
                  </span>
                )}
              </div>

              {/* Tags row */}
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

      {/* ── Detail grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Identificación */}
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

        {/* Organización */}
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
                : null
              }
            />
            <Field label="Fecha de ingreso" value={formatDate(empleado.fechaIngreso)} />
          </CardContent>
        </Card>

        {/* Financiero */}
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

      {/* ── Trazabilidad footer card ──────────────────────────── */}
      <Card className="border border-border/50 bg-muted/20">
        <CardContent className="px-5 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Creado por */}
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

            {/* Fechas */}
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

            {/* ID */}
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
    </div>
  )
}
