"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Save, X } from "lucide-react"
import { toast } from "sonner"

const BASE = "/dashboard-auxiliar/empleados"

export default function AuxiliarEditEmpleadoPage() {
  const params = useParams()
  const router = useRouter()
  const empleadoId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [nombre, setNombre]   = useState("")

  const [formData, setFormData] = useState({
    tipoDocumento: "",
    numeroDocumento: "",
    nombres: "",
    apellidos: "",
    centroCosto: "",
    programa: "",
    modalidad: "",
    cargo: "",
    fechaIngreso: "",
    tipoVinculacion: "",
    salarioBase: "",
    tieneAuxilioTransporte: true,
    tipoContrato: "",
    horasSemanales: "",
    estaActivo: true,
  })

  useEffect(() => { fetchEmpleado() }, [empleadoId])

  const fetchEmpleado = async () => {
    try {
      const res = await fetch(`/api/employees/${empleadoId}`)
      if (res.ok) {
        const data = await res.json()
        setNombre(`${data.nombres} ${data.apellidos}`)
        setFormData({
          tipoDocumento:         data.tipoDocumento,
          numeroDocumento:       data.numeroDocumento,
          nombres:               data.nombres,
          apellidos:             data.apellidos,
          centroCosto:           data.centroCosto || "",
          programa:              data.programa || "",
          modalidad:             data.modalidad || "",
          cargo:                 data.cargo || "",
          fechaIngreso:          data.fechaIngreso.split("T")[0],
          tipoVinculacion:       data.tipoVinculacion,
          salarioBase:           data.salarioBase.toString(),
          tieneAuxilioTransporte: data.tieneAuxilioTransporte,
          tipoContrato:          data.tipoContrato,
          horasSemanales:        data.horasSemanales.toString(),
          estaActivo:            data.estaActivo,
        })
      } else {
        toast.error("Error al cargar empleado")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const set = (field: string, value: string | boolean) =>
    setFormData(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/employees/${empleadoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          salarioBase:    parseFloat(formData.salarioBase),
          horasSemanales: parseFloat(formData.horasSemanales),
        }),
      })
      if (res.ok) {
        toast.success("Empleado actualizado")
        router.push(`${BASE}/${empleadoId}`)
      } else {
        const e = await res.json()
        toast.error(e.error || "Error al actualizar")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/4" />
        <div className="h-64 bg-muted rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href={`${BASE}/${empleadoId}`}>
          <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Editar Empleado</h1>
          <p className="text-sm text-muted-foreground">Modifica la información de {nombre}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Información Personal */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Información Personal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Tipo Documento</Label>
                  <Select value={formData.tipoDocumento} onValueChange={v => set("tipoDocumento", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CEDULA_CIUDADANIA">Cédula Ciudadanía</SelectItem>
                      <SelectItem value="TARJETA_IDENTIDAD">Tarjeta Identidad</SelectItem>
                      <SelectItem value="CEDULA_EXTRANJERIA">Cédula Extranjería</SelectItem>
                      <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Número Documento</Label>
                  <Input value={formData.numeroDocumento} onChange={e => set("numeroDocumento", e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nombres</Label>
                  <Input value={formData.nombres} onChange={e => set("nombres", e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Apellidos</Label>
                  <Input value={formData.apellidos} onChange={e => set("apellidos", e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Centro de Costo</Label>
                  <Input value={formData.centroCosto} onChange={e => set("centroCosto", e.target.value)} placeholder="Ej: 400013" />
                </div>
                <div className="space-y-1.5">
                  <Label>Programa</Label>
                  <Input value={formData.programa} onChange={e => set("programa", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Modalidad</Label>
                  <Input value={formData.modalidad} onChange={e => set("modalidad", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Cargo</Label>
                  <Input value={formData.cargo} onChange={e => set("cargo", e.target.value)} placeholder="Ej: Educador" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Fecha de Ingreso</Label>
                <Input type="date" value={formData.fechaIngreso} onChange={e => set("fechaIngreso", e.target.value)} required />
              </div>
            </CardContent>
          </Card>

          {/* Información Laboral */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Información Laboral</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Tipo Vinculación</Label>
                  <Select value={formData.tipoVinculacion} onValueChange={v => set("tipoVinculacion", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TIEMPO_COMPLETO">Tiempo Completo</SelectItem>
                      <SelectItem value="MEDIO_TIEMPO">Medio Tiempo</SelectItem>
                      <SelectItem value="TEMPORAL">Temporal</SelectItem>
                      <SelectItem value="APRENDIZ_SENA">Aprendiz SENA</SelectItem>
                      <SelectItem value="PRACTICANTE">Practicante</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo Contrato</Label>
                  <Select value={formData.tipoContrato} onValueChange={v => set("tipoContrato", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TERMINO_INDEFINIDO">Término Indefinido</SelectItem>
                      <SelectItem value="TERMINO_FIJO">Término Fijo</SelectItem>
                      <SelectItem value="OBRA_LABOR">Obra Labor</SelectItem>
                      <SelectItem value="PRESTACION_SERVICIOS">Prestación Servicios</SelectItem>
                      <SelectItem value="APRENDIZAJE">Aprendizaje</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Salario Base (COP)</Label>
                  <Input type="number" value={formData.salarioBase} onChange={e => set("salarioBase", e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Horas Semanales</Label>
                  <Input type="number" value={formData.horasSemanales} onChange={e => set("horasSemanales", e.target.value)} required />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="auxTransporte"
                  checked={formData.tieneAuxilioTransporte}
                  onCheckedChange={v => set("tieneAuxilioTransporte", v)}
                />
                <Label htmlFor="auxTransporte" className="cursor-pointer">Tiene Auxilio de Transporte</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="estaActivo"
                  checked={formData.estaActivo}
                  onCheckedChange={v => set("estaActivo", v)}
                />
                <Label htmlFor="estaActivo" className="cursor-pointer">Empleado Activo</Label>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3">
          <Link href={`${BASE}/${empleadoId}`}>
            <Button variant="outline" type="button"><X className="mr-2 h-4 w-4" />Cancelar</Button>
          </Link>
          <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Guardando…" : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </div>
  )
}
