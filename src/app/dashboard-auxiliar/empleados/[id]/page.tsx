"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, Trash2, Building2, Calendar, DollarSign, Clock, User, FileText, Briefcase } from "lucide-react"
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
}

const BASE = "/dashboard-auxiliar/empleados"

function formatCurrency(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })
}
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-right max-w-[55%] truncate">{value}</span>
    </div>
  )
}

export default function AuxiliarEmpleadoDetailPage() {
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
    } catch { toast.error("Error de conexión") }
    finally { setLoading(false) }
  }

  const handleDelete = async () => {
    if (!confirm("¿Eliminar este empleado? La acción se puede revertir.")) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/employees/${empleadoId}`, { method: "DELETE" })
      if (res.ok) { toast.success("Empleado eliminado"); router.push(BASE) }
      else { const e = await res.json(); toast.error(e.error || "Error al eliminar") }
    } catch { toast.error("Error de conexión") }
    finally { setDeleting(false) }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-muted rounded w-1/3" />
        <div className="h-40 bg-muted rounded" />
        <div className="h-40 bg-muted rounded" />
      </div>
    )
  }

  if (!empleado) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Empleado no encontrado</p>
        <Link href={BASE}>
          <Button className="mt-4" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={BASE}>
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold leading-tight">{empleado.nombres} {empleado.apellidos}</h1>
              <Badge variant={empleado.estaActivo ? "default" : "secondary"} className="text-[10px]">
                {empleado.estaActivo ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {empleado.cargo || "Sin cargo"} · {empleado.tipoDocumento.replace(/_/g, " ")} {empleado.numeroDocumento}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`${BASE}/${empleadoId}/edit`}>
            <Button variant="outline" size="sm"><Edit className="mr-2 h-4 w-4" />Editar</Button>
          </Link>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
            <Trash2 className="mr-2 h-4 w-4" />
            {deleting ? "Eliminando…" : "Eliminar"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Identificación */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />Identificación
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <Row label="Tipo Doc."  value={empleado.tipoDocumento.replace(/_/g, " ")} />
            <Row label="Documento"  value={empleado.numeroDocumento} />
            <Row label="Nombres"    value={empleado.nombres} />
            <Row label="Apellidos"  value={empleado.apellidos} />
          </CardContent>
        </Card>

        {/* Organizacional */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />Organizacional
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <Row label="Cargo"        value={empleado.cargo || "—"} />
            <Row label="Centro Costo" value={empleado.centroCosto || "—"} />
            <Row label="Programa"     value={empleado.programa || "—"} />
            <Row label="Modalidad"    value={empleado.modalidad || "—"} />
            <Row label="Ingreso"      value={formatDate(empleado.fechaIngreso)} />
          </CardContent>
        </Card>

        {/* Financiero */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />Financiero
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="py-3 border-b border-border/40">
              <p className="text-xs text-muted-foreground">Salario Base</p>
              <p className="text-xl font-bold text-green-600 mt-0.5">{formatCurrency(empleado.salarioBase)}</p>
            </div>
            <Row label="Auxilio Transp." value={
              <Badge variant={empleado.tieneAuxilioTransporte ? "default" : "secondary"} className="text-[10px]">
                {empleado.tieneAuxilioTransporte ? "Sí" : "No"}
              </Badge>
            } />
          </CardContent>
        </Card>
      </div>

      {/* Información Laboral */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5" />Información Laboral
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: FileText, label: "Tipo Vinculación", value: empleado.tipoVinculacion.replace(/_/g, " ") },
              { icon: FileText, label: "Tipo Contrato",    value: empleado.tipoContrato.replace(/_/g, " ") },
              { icon: Clock,    label: "Horas Semanales",  value: `${empleado.horasSemanales}h` },
              { icon: Calendar, label: "Registrado",       value: formatDate(empleado.creadoEn) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="p-3 rounded-lg bg-muted/40">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                </div>
                <p className="text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
