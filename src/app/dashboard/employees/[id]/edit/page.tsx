"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Save, X } from "lucide-react"
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
}

export default function EditEmpleadoPage() {
  const params = useParams()
  const router = useRouter()
  const empleadoId = params.id as string

  const [empleado, setEmpleado] = useState<Empleado | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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
    estaActivo: true
  })

  useEffect(() => {
    fetchEmpleado()
  }, [empleadoId])

  const fetchEmpleado = async () => {
    try {
      const response = await fetch(`/api/employees/${empleadoId}`)
      if (response.ok) {
        const data = await response.json()
        setEmpleado(data)
        setFormData({
          tipoDocumento: data.tipoDocumento,
          numeroDocumento: data.numeroDocumento,
          nombres: data.nombres,
          apellidos: data.apellidos,
          centroCosto: data.centroCosto || "",
          programa: data.programa || "",
          modalidad: data.modalidad || "",
          cargo: data.cargo || "",
          fechaIngreso: data.fechaIngreso.split('T')[0],
          tipoVinculacion: data.tipoVinculacion,
          salarioBase: data.salarioBase.toString(),
          tieneAuxilioTransporte: data.tieneAuxilioTransporte,
          tipoContrato: data.tipoContrato,
          horasSemanales: data.horasSemanales.toString(),
          estaActivo: data.estaActivo
        })
      } else {
        toast.error("Error al cargar empleado")
      }
    } catch (error) {
      toast.error("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`/api/employees/${empleadoId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...formData,
          salarioBase: parseFloat(formData.salarioBase),
          horasSemanales: parseFloat(formData.horasSemanales)
        })
      })

      if (response.ok) {
        toast.success("Empleado actualizado exitosamente")
        router.push(`/dashboard/employees/${empleadoId}`)
      } else {
        const error = await response.json()
        toast.error(error.error || "Error al actualizar empleado")
      }
    } catch (error) {
      toast.error("Error de conexión")
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!empleado) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Empleado no encontrado</p>
        <Link href="/dashboard/employees">
          <Button className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Empleados
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/employees/${empleadoId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Editar Empleado</h1>
            <p className="text-muted-foreground">Modifica la información de {empleado.nombres} {empleado.apellidos}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Información Personal */}
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
              <CardDescription>Datos básicos del empleado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipoDocumento">Tipo Documento</Label>
                  <Select
                    value={formData.tipoDocumento}
                    onValueChange={(value) => handleInputChange("tipoDocumento", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CEDULA_CIUDADANIA">Cédula Ciudadanía</SelectItem>
                      <SelectItem value="TARJETA_IDENTIDAD">Tarjeta Identidad</SelectItem>
                      <SelectItem value="CEDULA_EXTRANJERIA">Cédula Extranjería</SelectItem>
                      <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                      <SelectItem value="NIT">NIT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numeroDocumento">Número Documento</Label>
                  <Input
                    id="numeroDocumento"
                    value={formData.numeroDocumento}
                    onChange={(e) => handleInputChange("numeroDocumento", e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombres">Nombres</Label>
                  <Input
                    id="nombres"
                    value={formData.nombres}
                    onChange={(e) => handleInputChange("nombres", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellidos">Apellidos</Label>
                  <Input
                    id="apellidos"
                    value={formData.apellidos}
                    onChange={(e) => handleInputChange("apellidos", e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="centroCosto">Centro de Costo</Label>
                  <Select
                    value={formData.centroCosto}
                    onValueChange={(value) => handleInputChange("centroCosto", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar centro de costo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="40001">40001</SelectItem>
                      <SelectItem value="40002">40002</SelectItem>
                      <SelectItem value="40003">40003</SelectItem>
                      <SelectItem value="40004">40004</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="programa">Programa</Label>
                  <Input
                    id="programa"
                    value={formData.programa}
                    onChange={(e) => handleInputChange("programa", e.target.value)}
                    placeholder="Ej: Ingeniería, Administración"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="modalidad">Modalidad</Label>
                  <Input
                    id="modalidad"
                    value={formData.modalidad}
                    onChange={(e) => handleInputChange("modalidad", e.target.value)}
                    placeholder="Ej: Presencial, Virtual"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cargo">Cargo</Label>
                  <Input
                    id="cargo"
                    value={formData.cargo}
                    onChange={(e) => handleInputChange("cargo", e.target.value)}
                    placeholder="Ej: Educador, Psicólogo, Coordinador"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fechaIngreso">Fecha de Ingreso</Label>
                  <Input
                    id="fechaIngreso"
                    type="date"
                    value={formData.fechaIngreso}
                    onChange={(e) => handleInputChange("fechaIngreso", e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información Laboral */}
          <Card>
            <CardHeader>
              <CardTitle>Información Laboral</CardTitle>
              <CardDescription>Detalles contractuales y salariales</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipoVinculacion">Tipo Vinculación</Label>
                  <Select
                    value={formData.tipoVinculacion}
                    onValueChange={(value) => handleInputChange("tipoVinculacion", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TIEMPO_COMPLETO">Tiempo Completo</SelectItem>
                      <SelectItem value="MEDIO_TIEMPO">Medio Tiempo</SelectItem>
                      <SelectItem value="TEMPORAL">Temporal</SelectItem>
                      <SelectItem value="APRENDIZ_SENA">Aprendiz SENA</SelectItem>
                      <SelectItem value="PRACTICANTE">Practicante</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipoContrato">Tipo Contrato</Label>
                  <Select
                    value={formData.tipoContrato}
                    onValueChange={(value) => handleInputChange("tipoContrato", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                <div className="space-y-2">
                  <Label htmlFor="salarioBase">Salario Base (COP)</Label>
                  <Input
                    id="salarioBase"
                    type="number"
                    value={formData.salarioBase}
                    onChange={(e) => handleInputChange("salarioBase", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horasSemanales">Horas Semanales</Label>
                  <Input
                    id="horasSemanales"
                    type="number"
                    value={formData.horasSemanales}
                    onChange={(e) => handleInputChange("horasSemanales", e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="tieneAuxilioTransporte"
                  checked={formData.tieneAuxilioTransporte}
                  onCheckedChange={(checked) => handleInputChange("tieneAuxilioTransporte", checked)}
                />
                <Label htmlFor="tieneAuxilioTransporte">Tiene Auxilio de Transporte</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="estaActivo"
                  checked={formData.estaActivo}
                  onCheckedChange={(checked) => handleInputChange("estaActivo", checked)}
                />
                <Label htmlFor="estaActivo">Empleado Activo</Label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href={`/dashboard/employees/${empleadoId}`}>
            <Button variant="outline" type="button">
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </form>
    </div>
  )
}
