"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { 
  Save, 
  RefreshCw, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  FileText,
  Globe,
  Users,
  Settings
} from "lucide-react"
import { toast } from "sonner"

interface Empresa {
  id: string
  slug: string
  nombre: string
  nit?: string
  correo?: string
  telefono?: string
  direccion?: {
    ciudad?: string
    direccion?: string
    pais?: string
    codigoPostal?: string
  }
  estado: "ACTIVA" | "INACTIVA" | "SUSPENDIDA" | "ELIMINADA"
  configuracionPredeterminada?: any
  creadoEn: string
  actualizadoEn: string
}

export default function CompanySettingsPage() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    fetchEmpresa()
  }, [])

  const fetchEmpresa = async () => {
    try {
      const response = await fetch("/api/settings/company")
      if (response.ok) {
        const data = await response.json()
        setEmpresa(data)
      } else {
        toast.error("Error al cargar información de la empresa")
      }
    } catch (error) {
      toast.error("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!empresa) return

    setSaving(true)
    try {
      const response = await fetch("/api/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(empresa),
      })

      if (response.ok) {
        toast.success("Información de la empresa actualizada")
        setHasChanges(false)
        fetchEmpresa() // Recargar datos actualizados
      } else {
        const error = await response.json()
        toast.error(error.error || "Error al guardar cambios")
      }
    } catch (error) {
      toast.error("Error de conexión")
    } finally {
      setSaving(false)
    }
  }

  const updateEmpresa = (field: keyof Empresa, value: any) => {
    if (!empresa) return
    
    setEmpresa(prev => {
      if (!prev) return prev
      return { ...prev, [field]: value }
    })
    setHasChanges(true)
  }

  const updateDireccion = (field: string, value: string) => {
    if (!empresa) return
    
    setEmpresa(prev => {
      if (!prev) return prev
      return {
        ...prev,
        direccion: {
          ...(prev.direccion || {}),
          [field]: value
        }
      }
    })
    setHasChanges(true)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl md:text-3xl font-bold">Configuración de la Empresa</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (!empresa) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl md:text-3xl font-bold">Configuración de la Empresa</h1>
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg text-gray-500">No se encontró información de la empresa</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Configuración de la Empresa</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Gestiona la información básica y datos de contacto de tu empresa
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={fetchEmpresa} disabled={saving}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Restaurar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="bg-green-600 hover:bg-green-700"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información Básica */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Información Básica
            </CardTitle>
            <CardDescription>
              Datos principales de identificación de la empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre de la Empresa *</Label>
                <Input
                  id="nombre"
                  value={empresa.nombre}
                  onChange={(e) => updateEmpresa("nombre", e.target.value)}
                  placeholder="Mi Empresa SAS"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nit">NIT</Label>
                <Input
                  id="nit"
                  value={empresa.nit || ""}
                  onChange={(e) => updateEmpresa("nit", e.target.value)}
                  placeholder="123456789-0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="correo">Correo Electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="correo"
                    type="email"
                    value={empresa.correo || ""}
                    onChange={(e) => updateEmpresa("correo", e.target.value)}
                    placeholder="contacto@empresa.com"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="telefono"
                    value={empresa.telefono || ""}
                    onChange={(e) => updateEmpresa("telefono", e.target.value)}
                    placeholder="+57 1 234 5678"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <Label className="text-base font-semibold">Dirección</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="direccion"
                      value={empresa.direccion?.direccion || ""}
                      onChange={(e) => updateDireccion("direccion", e.target.value)}
                      placeholder="Calle 123 #45-67"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ciudad">Ciudad</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="ciudad"
                      value={empresa.direccion?.ciudad || ""}
                      onChange={(e) => updateDireccion("ciudad", e.target.value)}
                      placeholder="Bogotá"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pais">País</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="pais"
                      value={empresa.direccion?.pais || ""}
                      onChange={(e) => updateDireccion("pais", e.target.value)}
                      placeholder="Colombia"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codigoPostal">Código Postal</Label>
                  <Input
                    id="codigoPostal"
                    value={empresa.direccion?.codigoPostal || ""}
                    onChange={(e) => updateDireccion("codigoPostal", e.target.value)}
                    placeholder="110111"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Panel Lateral */}
        <div className="space-y-6">
          {/* Estado */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Estado
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="estado">Estado de la Empresa</Label>
                  <Select
                    value={empresa.estado}
                    onValueChange={(value: any) => updateEmpresa("estado", value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVA">Activa</SelectItem>
                      <SelectItem value="INACTIVA">Inactiva</SelectItem>
                      <SelectItem value="SUSPENDIDA">Suspendida</SelectItem>
                      <SelectItem value="ELIMINADA">Eliminada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                  {empresa.estado === "ACTIVA" && "La empresa está operativa y puede usar el sistema."}
                  {empresa.estado === "INACTIVA" && "La empresa está inactiva temporalmente."}
                  {empresa.estado === "SUSPENDIDA" && "La empresa tiene acceso suspendido."}
                  {empresa.estado === "ELIMINADA" && "La empresa está marcada para eliminación."}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información del Sistema */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Información del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">ID Interno</Label>
                <p className="text-sm text-muted-foreground font-mono">{empresa.id}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Slug</Label>
                <p className="text-sm text-muted-foreground font-mono">{empresa.slug}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Fecha de Creación</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date(empresa.creadoEn).toLocaleDateString("es-CO", {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Última Actualización</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date(empresa.actualizadoEn).toLocaleDateString("es-CO", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
