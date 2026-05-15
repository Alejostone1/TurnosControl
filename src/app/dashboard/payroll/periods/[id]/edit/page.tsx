"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  CalendarRange,
  Save,
  X,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface Empleado {
  id: string
  nombres: string
  apellidos: string
  numeroDocumento: string
  centroCosto: string | null
  programa: string | null
  modalidad: string | null
  cargo?: string
}

interface Periodo {
  id: string
  nombrePeriodo: string
  tipoPeriodo: string
  estadoPeriodo: string
  fechaInicio: string
  fechaFin: string
}

export default function EditPeriodoPage() {
  const router = useRouter()
  const [periodo, setPeriodo] = useState<Periodo | null>(null)
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    nombrePeriodo: "",
    tipoPeriodo: "MENSUAL",
    fechaInicio: "",
    fechaFin: "",
  })

  useEffect(() => {
    const periodoId = window.location.pathname.split('/')[4]
    if (periodoId) {
      fetchPeriodo(periodoId)
      fetchEmpleados()
    }
  }, [])

  async function fetchPeriodo(periodoId: string) {
    try {
      const res = await fetch(`/api/payroll/periods/${periodoId}`)
      if (res.ok) {
        const data = await res.json()
        setPeriodo(data)
        setFormData({
          nombrePeriodo: data.nombrePeriodo,
          tipoPeriodo: data.tipoPeriodo,
          fechaInicio: new Date(data.fechaInicio).toISOString().split('T')[0],
          fechaFin: new Date(data.fechaFin).toISOString().split('T')[0],
        })
      } else {
        toast.error("Error al cargar período")
        router.push("/dashboard/payroll/periods")
      }
    } catch {
      toast.error("Error de conexión")
      router.push("/dashboard/payroll/periods")
    } finally {
      setLoading(false)
    }
  }

  async function fetchEmpleados() {
    try {
      const res = await fetch("/api/employees")
      if (res.ok) setEmpleados(await res.json())
    } catch {
      // non-blocking
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!periodo) return

    setSaving(true)
    try {
      const res = await fetch(`/api/payroll/periods/${periodo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      
      if (res.ok) {
        toast.success("Período actualizado")
        router.push("/dashboard/payroll/periods")
      } else {
        const err = await res.json()
        toast.error(err.error || "Error al actualizar período")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="animate-pulse space-y-3">
          <div className="h-20 bg-muted rounded-xl" />
          <div className="h-48 bg-muted rounded-xl" />
        </div>
      </div>
    )
  }

  if (!periodo) {
    return (
      <div className="space-y-5">
        <p>Período no encontrado</p>
      </div>
    )
  }

  const isBorrador = periodo?.estadoPeriodo === "BORRADOR"

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/payroll/periods">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Editar Período</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Modifica la información del período de nómina
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <Card className="border-primary/30 shadow-sm">
        <CardContent className="pt-5 pb-4">
          <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-primary" />
            Editar Período: {periodo.nombrePeriodo}
          </h2>
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nombre del Período *</Label>
                <Input
                  value={formData.nombrePeriodo}
                  onChange={e => setFormData({ ...formData, nombrePeriodo: e.target.value })}
                  placeholder="Ej: Mayo 2026"
                  required
                  className="h-9"
                />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de Período *</Label>
                <Select
                  value={formData.tipoPeriodo}
                  onValueChange={v => setFormData({ ...formData, tipoPeriodo: v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEMANAL">Semanal</SelectItem>
                    <SelectItem value="QUINCENAL">Quincenal</SelectItem>
                    <SelectItem value="MENSUAL">Mensual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha Inicio {isBorrador ? "*" : "(bloqueado)"}</Label>
                <Input
                  type="date"
                  value={formData.fechaInicio}
                  onChange={e => setFormData({ ...formData, fechaInicio: e.target.value })}
                  required
                  disabled={!isBorrador}
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Fecha Fin {isBorrador ? "*" : "(bloqueado)"}</Label>
                <Input
                  type="date"
                  value={formData.fechaFin}
                  onChange={e => setFormData({ ...formData, fechaFin: e.target.value })}
                  required
                  disabled={!isBorrador}
                  className="h-9"
                />
              </div>
            </div>

            {/* Estado actual */}
            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-medium">Estado Actual:</Label>
                <Badge variant="outline" className="text-[11px]">
                  {periodo.estadoPeriodo === "BORRADOR" ? "Borrador" : periodo.estadoPeriodo}
                </Badge>
              </div>
              {!isBorrador && (
                <p className="text-[11px] text-amber-700 mt-1">
                  El período ya fue procesado. Puedes cambiar nombre y tipo, pero no las fechas.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Link href="/dashboard/payroll/periods">
                <Button type="button" variant="outline" size="sm">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" size="sm" disabled={saving}>
                <Save className="h-3.5 w-3.5 mr-1" />
                {saving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
