"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    nombreEmpresa: "",
    nit: "",
    correo: "",
    telefono: "",
    direccion: "",
    ciudad: "",
    pais: "Colombia",
    adminNombre: "",
    adminApellidos: "",
    adminEmail: "",
    adminPassword: "",
    adminDocumento: ""
  })
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Empresa registrada exitosamente")
        router.push("/login")
      } else {
        toast.error(data.error || "Error al registrar empresa")
      }
    } catch (error) {
      toast.error("Error al conectar con el servidor")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Registrar Empresa</CardTitle>
          <CardDescription className="text-center">
            Crea tu cuenta para comenzar a usar el sistema de nómina
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Datos de la Empresa */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Datos de la Empresa</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombreEmpresa">Nombre de la Empresa*</Label>
                  <Input
                    id="nombreEmpresa"
                    name="nombreEmpresa"
                    type="text"
                    placeholder="Mi Empresa S.A.S."
                    value={formData.nombreEmpresa}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nit">NIT*</Label>
                  <Input
                    id="nit"
                    name="nit"
                    type="text"
                    placeholder="900123456-7"
                    value={formData.nit}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="correo">Correo Empresarial*</Label>
                  <Input
                    id="correo"
                    name="correo"
                    type="email"
                    placeholder="contacto@empresa.com"
                    value={formData.correo}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    name="telefono"
                    type="tel"
                    placeholder="+57 1 2345678"
                    value={formData.telefono}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input
                    id="direccion"
                    name="direccion"
                    type="text"
                    placeholder="Calle 100 # 50-90"
                    value={formData.direccion}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ciudad">Ciudad</Label>
                  <Input
                    id="ciudad"
                    name="ciudad"
                    type="text"
                    placeholder="Bogotá D.C."
                    value={formData.ciudad}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Datos del Administrador */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Datos del Administrador</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adminNombre">Nombres*</Label>
                  <Input
                    id="adminNombre"
                    name="adminNombre"
                    type="text"
                    placeholder="Juan"
                    value={formData.adminNombre}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminApellidos">Apellidos*</Label>
                  <Input
                    id="adminApellidos"
                    name="adminApellidos"
                    type="text"
                    placeholder="Pérez"
                    value={formData.adminApellidos}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Correo Electrónico*</Label>
                  <Input
                    id="adminEmail"
                    name="adminEmail"
                    type="email"
                    placeholder="admin@empresa.com"
                    value={formData.adminEmail}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminPassword">Contraseña*</Label>
                  <Input
                    id="adminPassword"
                    name="adminPassword"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={formData.adminPassword}
                    onChange={handleChange}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminDocumento">Documento de Identidad*</Label>
                  <Input
                    id="adminDocumento"
                    name="adminDocumento"
                    type="text"
                    placeholder="1234567890"
                    value={formData.adminDocumento}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? "Registrando..." : "Registrar Empresa"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
