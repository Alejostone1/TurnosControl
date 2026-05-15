"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

const BASE = "/dashboard-auxiliar/empleados"

export default function AuxiliarNewEmpleadoPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    nombres: "",
    apellidos: "",
    tipoDocumento: "CEDULA_CIUDADANIA",
    numeroDocumento: "",
    centroCosto: "",
    programa: "",
    modalidad: "",
    cargo: "",
    fechaIngreso: "",
    tipoVinculacion: "TIEMPO_COMPLETO",
    tipoContrato: "TERMINO_INDEFINIDO",
    salarioBase: "",
    horasSemanales: "44",
    tieneAuxilioTransporte: true,
  })

  const handleChange = (name: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        toast.success("Empleado creado exitosamente")
        router.push(BASE)
      } else {
        const error = await res.json()
        toast.error(error.error || "Error al crear empleado")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href={BASE}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nuevo Empleado</h1>
          <p className="text-sm text-muted-foreground">Completa los datos del empleado a vincular</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Datos Personales */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Datos Personales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nombres *</Label>
                <Input value={formData.nombres} onChange={e => handleChange("nombres", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Apellidos *</Label>
                <Input value={formData.apellidos} onChange={e => handleChange("apellidos", e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo Documento</Label>
                <Select value={formData.tipoDocumento} onValueChange={v => handleChange("tipoDocumento", v)}>
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
                <Label>Número Documento *</Label>
                <Input value={formData.numeroDocumento} onChange={e => handleChange("numeroDocumento", e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Fecha de Ingreso *</Label>
                <Input type="date" value={formData.fechaIngreso} onChange={e => handleChange("fechaIngreso", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Salario Base (COP) *</Label>
                <Input type="number" value={formData.salarioBase} onChange={e => handleChange("salarioBase", e.target.value)} required />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Datos Organizacionales */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Datos Organizacionales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Centro de Costo</Label>
                <Input value={formData.centroCosto} onChange={e => handleChange("centroCosto", e.target.value)} placeholder="Ej: 400013" />
              </div>
              <div className="space-y-1.5">
                <Label>Programa</Label>
                <Input value={formData.programa} onChange={e => handleChange("programa", e.target.value)} placeholder="Ej: Creeme, Genesis" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Modalidad</Label>
                <Input value={formData.modalidad} onChange={e => handleChange("modalidad", e.target.value)} placeholder="Ej: Internado, CAE" />
              </div>
              <div className="space-y-1.5">
                <Label>Cargo</Label>
                <Input value={formData.cargo} onChange={e => handleChange("cargo", e.target.value)} placeholder="Ej: Educador, Psicólogo" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Datos Laborales */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Datos Laborales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo Vinculación</Label>
                <Select value={formData.tipoVinculacion} onValueChange={v => handleChange("tipoVinculacion", v)}>
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
                <Select value={formData.tipoContrato} onValueChange={v => handleChange("tipoContrato", v)}>
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
                <Label>Horas Semanales</Label>
                <Input type="number" value={formData.horasSemanales} onChange={e => handleChange("horasSemanales", e.target.value)} />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="auxTransporte"
                  checked={formData.tieneAuxilioTransporte}
                  onChange={e => handleChange("tieneAuxilioTransporte", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="auxTransporte" className="cursor-pointer">Auxilio de Transporte</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href={BASE}><Button variant="outline">Cancelar</Button></Link>
          <Button type="submit" disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700">
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? "Guardando…" : "Guardar Empleado"}
          </Button>
        </div>
      </form>
    </div>
  )
}
