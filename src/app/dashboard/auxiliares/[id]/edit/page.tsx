"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Save, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

export default function EditAuxiliarPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [showPass, setShowPass]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [formData, setFormData] = useState({
    nombres: "", apellidos: "", documento: "", telefono: "",
    correo: "", contrasena: "", confirmarContrasena: "", estaActivo: true,
  })

  useEffect(() => {
    fetch(`/api/auxiliares/${id}`)
      .then(r => r.json())
      .then(data => {
        setFormData({
          nombres:   data.nombres   || "",
          apellidos: data.apellidos || "",
          documento: data.documento || "",
          telefono:  data.telefono  || "",
          correo:    data.correo    || "",
          contrasena: "", confirmarContrasena: "",
          estaActivo: data.estaActivo,
        })
      })
      .catch(() => toast.error("Error al cargar auxiliar"))
      .finally(() => setLoading(false))
  }, [id])

  const handleChange = (name: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const validate = (): string | null => {
    if (!formData.nombres.trim())   return "El nombre es requerido"
    if (!formData.apellidos.trim()) return "Los apellidos son requeridos"
    if (!formData.correo.trim())    return "El correo es requerido"
    if (!/\S+@\S+\.\S+/.test(formData.correo)) return "Correo inválido"
    if (formData.contrasena) {
      if (formData.contrasena.length < 8) return "La contraseña debe tener al menos 8 caracteres"
      if (formData.contrasena !== formData.confirmarContrasena) return "Las contraseñas no coinciden"
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) { toast.error(err); return }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        nombres:   formData.nombres,
        apellidos: formData.apellidos,
        documento: formData.documento || null,
        telefono:  formData.telefono  || null,
        correo:    formData.correo,
        estaActivo: formData.estaActivo,
      }
      if (formData.contrasena) payload.contrasena = formData.contrasena

      const res = await fetch(`/api/auxiliares/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast.success("Auxiliar actualizado exitosamente")
        router.push(`/dashboard/auxiliares/${id}`)
      } else {
        const error = await res.json()
        toast.error(error.error || "Error al actualizar")
      }
    } catch { toast.error("Error de conexión") }
    finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/auxiliares/${id}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Editar Auxiliar</h1>
          <p className="text-sm text-muted-foreground">Modifica la información de {formData.nombres} {formData.apellidos}</p>
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
                <Label>Documento</Label>
                <Input value={formData.documento} onChange={e => handleChange("documento", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input value={formData.telefono} onChange={e => handleChange("telefono", e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Switch
                id="estaActivo"
                checked={formData.estaActivo}
                onCheckedChange={v => handleChange("estaActivo", v)}
              />
              <Label htmlFor="estaActivo" className="cursor-pointer">Auxiliar activo</Label>
            </div>
          </CardContent>
        </Card>

        {/* Acceso */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Acceso al Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Correo Electrónico *</Label>
              <Input type="email" value={formData.correo} onChange={e => handleChange("correo", e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nueva Contraseña</Label>
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    value={formData.contrasena}
                    onChange={e => handleChange("contrasena", e.target.value)}
                    placeholder="Dejar vacío para no cambiar"
                    className="pr-9"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">Mínimo 8 caracteres</p>
              </div>
              <div className="space-y-1.5">
                <Label>Confirmar Contraseña</Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    value={formData.confirmarContrasena}
                    onChange={e => handleChange("confirmarContrasena", e.target.value)}
                    placeholder="Repetir contraseña"
                    className="pr-9"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href={`/dashboard/auxiliares/${id}`}>
            <Button variant="outline">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Guardando…" : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </div>
  )
}
