"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Plus, Pencil, Trash2, X, Lock, Search, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

// ─── Types ─────────────────────────────────────────────────────────────────

interface Concepto {
  id: string
  codigo: string
  nombre: string
  descripcion: string | null
  categoria: string
  tipoCalculo: string
  tipoImpacto: string
  horasFijas: number | null
  horaInicioDefecto: string | null
  horaFinDefecto: string | null
  cruzaMedianoche: boolean
  afectaLiquidacion: boolean
  cuentaParaTope: boolean
  color: string | null
  icono: string | null
  orden: number
  estaActivo: boolean
  esDelSistema: boolean
}

type FormData = {
  codigo: string
  nombre: string
  descripcion: string
  categoria: string
  tipoCalculo: string
  tipoImpacto: string
  horasFijas: string
  horaInicioDefecto: string
  horaFinDefecto: string
  cruzaMedianoche: boolean
  afectaLiquidacion: boolean
  cuentaParaTope: boolean
  color: string
  icono: string
}

const EMPTY_FORM: FormData = {
  codigo: "",
  nombre: "",
  descripcion: "",
  categoria: "TURNO_LABORAL",
  tipoCalculo: "HORAS_TURNO",
  tipoImpacto: "SUMA_HORAS",
  horasFijas: "",
  horaInicioDefecto: "",
  horaFinDefecto: "",
  cruzaMedianoche: false,
  afectaLiquidacion: true,
  cuentaParaTope: false,
  color: "#6366f1",
  icono: "📅",
}

// ─── Label maps ────────────────────────────────────────────────────────────

const CATEGORIA_LABEL: Record<string, string> = {
  TURNO_LABORAL: "Turno Laboral",
  AUSENCIA_PAGA: "Ausencia Remunerada",
  AUSENCIA_NO_PAGA: "Ausencia No Remunerada",
  DESCANSO: "Descanso / Libre",
  ESPECIAL: "Especial",
}

const CATEGORIA_COLOR: Record<string, string> = {
  TURNO_LABORAL: "bg-blue-100 text-blue-800 border-blue-200",
  AUSENCIA_PAGA: "bg-amber-100 text-amber-800 border-amber-200",
  AUSENCIA_NO_PAGA: "bg-red-100 text-red-800 border-red-200",
  DESCANSO: "bg-green-100 text-green-800 border-green-200",
  ESPECIAL: "bg-purple-100 text-purple-800 border-purple-200",
}

const CALCULO_LABEL: Record<string, string> = {
  HORAS_TURNO: "Por horario (entrada/salida)",
  HORAS_FIJAS: "Horas fijas",
  FORMULA: "Fórmula personalizada",
  SIN_PAGO: "Sin cómputo de horas",
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ConceptsSettingsPage() {
  const [conceptos, setConceptos] = useState<Concepto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showInactive, setShowInactive] = useState(false)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  // Delete confirmation state
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchConceptos()
  }, [showInactive])

  async function fetchConceptos() {
    setLoading(true)
    try {
      const res = await fetch(`/api/concepts?includeInactive=${showInactive}`)
      if (res.ok) setConceptos(await res.json())
    } catch {
      toast.error("Error al cargar conceptos")
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(c: Concepto) {
    setEditingId(c.id)
    setForm({
      codigo: c.codigo,
      nombre: c.nombre,
      descripcion: c.descripcion || "",
      categoria: c.categoria,
      tipoCalculo: c.tipoCalculo,
      tipoImpacto: c.tipoImpacto || "SUMA_HORAS",
      horasFijas: c.horasFijas?.toString() || "",
      horaInicioDefecto: c.horaInicioDefecto || "",
      horaFinDefecto: c.horaFinDefecto || "",
      cruzaMedianoche: c.cruzaMedianoche,
      afectaLiquidacion: c.afectaLiquidacion,
      cuentaParaTope: c.cuentaParaTope,
      color: c.color || "#6366f1",
      icono: c.icono || "📅",
    })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.codigo.trim() || !form.nombre.trim()) {
      toast.error("Código y nombre son obligatorios")
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        ...form,
        horasFijas:
          form.tipoCalculo === "HORAS_FIJAS" && form.horasFijas
            ? parseFloat(form.horasFijas)
            : null,
        horaInicioDefecto:
          form.tipoCalculo === "HORAS_TURNO" ? form.horaInicioDefecto || null : null,
        horaFinDefecto:
          form.tipoCalculo === "HORAS_TURNO" ? form.horaFinDefecto || null : null,
      }

      const url = editingId ? `/api/concepts/${editingId}` : "/api/concepts"
      const method = editingId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        toast.success(editingId ? "Concepto actualizado" : "Concepto creado")
        closeModal()
        fetchConceptos()
      } else {
        const err = await res.json()
        toast.error(err.error || "Error al guardar")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/concepts/${id}`, { method: "DELETE" })
      if (res.ok) {
        const data = await res.json()
        toast.success(data.message)
        setDeleteId(null)
        fetchConceptos()
      } else {
        const err = await res.json()
        toast.error(err.error || "Error al eliminar")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setDeleting(false)
    }
  }

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  // ─── Filtered list ─────────────────────────────────────────────────────

  const filtered = conceptos.filter(c => {
    const q = search.toLowerCase()
    return (
      c.nombre.toLowerCase().includes(q) ||
      c.codigo.toLowerCase().includes(q) ||
      (c.descripcion || "").toLowerCase().includes(q)
    )
  })

  const deleteTarget = conceptos.find(c => c.id === deleteId)

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon" className="mt-0.5 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Conceptos de Nómina</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Define los tipos de turno, ausencias y permisos que se asignan a los empleados
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Nuevo concepto
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código o nombre…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Switch
            id="show-inactive"
            checked={showInactive}
            onCheckedChange={setShowInactive}
          />
          <Label htmlFor="show-inactive" className="cursor-pointer text-muted-foreground">
            Mostrar inactivos
          </Label>
        </div>
      </div>

      {/* Concepts list */}
      {loading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-muted rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-2xl text-muted-foreground">
          <BookOpenIcon className="h-10 w-10 mb-3 opacity-20" />
          <p className="font-medium">No hay conceptos</p>
          <p className="text-sm mt-1">Crea el primer concepto con el botón de arriba</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filtered.map((c, i) => (
                <div
                  key={c.id}
                  className={[
                    "flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors",
                    !c.estaActivo ? "opacity-50" : "",
                    i === 0 ? "rounded-t-lg" : "",
                    i === filtered.length - 1 ? "rounded-b-lg" : "",
                  ].join(" ")}
                >
                  {/* Color + icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ backgroundColor: (c.color || "#94a3b8") + "22", border: `2px solid ${c.color || "#94a3b8"}` }}
                  >
                    {c.icono || "📅"}
                  </div>

                  {/* Code + name */}
                  <div className="min-w-[80px]">
                    <span
                      className="font-bold text-sm"
                      style={{ color: c.color || "inherit" }}
                    >
                      {c.codigo}
                    </span>
                    {!c.estaActivo && (
                      <span className="ml-1.5 text-[10px] text-muted-foreground">(inactivo)</span>
                    )}
                  </div>

                  {/* Name + description */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{c.nombre}</p>
                    {c.descripcion && (
                      <p className="text-xs text-muted-foreground truncate">{c.descripcion}</p>
                    )}
                  </div>

                  {/* Category badge */}
                  <div className="hidden md:block shrink-0">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CATEGORIA_COLOR[c.categoria] || ""}`}
                    >
                      {CATEGORIA_LABEL[c.categoria] || c.categoria}
                    </span>
                  </div>

                  {/* Hours info */}
                  <div className="hidden lg:block text-xs text-muted-foreground text-right shrink-0 w-28">
                    {c.tipoCalculo === "HORAS_TURNO" && c.horaInicioDefecto
                      ? `${c.horaInicioDefecto} – ${c.horaFinDefecto}`
                      : c.tipoCalculo === "HORAS_FIJAS"
                      ? `${c.horasFijas}h fijas`
                      : c.tipoCalculo === "SIN_PAGO"
                      ? "Sin horas"
                      : CALCULO_LABEL[c.tipoCalculo]}
                  </div>

                  {/* tipoImpacto indicator */}
                  <div className="hidden lg:block shrink-0 text-base" title={c.tipoImpacto}>
                    {c.tipoImpacto === "SUMA_HORAS" ? "➕" : c.tipoImpacto === "RESTA_HORAS" ? "➖" : "○"}
                  </div>

                  {/* Remuneration badge */}
                  <div className="hidden lg:block shrink-0">
                    <Badge variant={c.afectaLiquidacion ? "default" : "secondary"} className="text-xs">
                      {c.afectaLiquidacion ? "Remunerado" : "No remunerado"}
                    </Badge>
                  </div>

{/* System lock icon */}
                  {c.esDelSistema && (
                    <span title="Concepto del sistema">
                      <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </span>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(c)}
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {!c.esDelSistema && c.estaActivo && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteId(c.id)}
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5 mt-0.5" />
        <span>Los conceptos del sistema no pueden eliminarse, pero sí editarse.</span>
      </div>

      {/* ── Create / Edit Modal ── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={closeModal}
        >
          <div
            className="bg-background rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingId ? "Editar concepto" : "Nuevo concepto"}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {editingId
                    ? "Modifica los parámetros del concepto"
                    : "Define un nuevo tipo de turno, ausencia o permiso"}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={closeModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="overflow-y-auto">
              <div className="px-6 py-5 space-y-5">

                {/* Codigo + Nombre */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>
                      Código <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={form.codigo}
                      onChange={e => setField("codigo", e.target.value.toUpperCase().slice(0, 6))}
                      placeholder="D, N, 24T…"
                      maxLength={6}
                      className="font-mono uppercase"
                    />
                    <p className="text-[11px] text-muted-foreground">Máx. 6 caracteres</p>
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>
                      Nombre <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={form.nombre}
                      onChange={e => setField("nombre", e.target.value)}
                      placeholder="Ej: Turno Día, Incapacidad…"
                    />
                  </div>
                </div>

                {/* Icon + Color */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Ícono (emoji)</Label>
                    <Input
                      value={form.icono}
                      onChange={e => setField("icono", e.target.value)}
                      placeholder="☀️"
                      className="text-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Color</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={form.color}
                        onChange={e => setField("color", e.target.value)}
                        className="h-9 w-12 rounded-md border border-input cursor-pointer p-0.5"
                      />
                      <Input
                        value={form.color}
                        onChange={e => setField("color", e.target.value)}
                        placeholder="#6366f1"
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ backgroundColor: form.color + "22", border: `2px solid ${form.color}` }}
                  >
                    {form.icono || "📅"}
                  </div>
                  <div>
                    <span className="font-bold text-sm" style={{ color: form.color }}>
                      {form.codigo || "CÓD"}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {form.nombre || "Nombre del concepto"}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Categoría */}
                <div className="space-y-1.5">
                  <Label>Categoría</Label>
                  <Select
                    value={form.categoria}
                    onValueChange={v => setField("categoria", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TURNO_LABORAL">Turno Laboral</SelectItem>
                      <SelectItem value="AUSENCIA_PAGA">Ausencia Remunerada</SelectItem>
                      <SelectItem value="AUSENCIA_NO_PAGA">Ausencia No Remunerada</SelectItem>
                      <SelectItem value="DESCANSO">Descanso / Libre</SelectItem>
                      <SelectItem value="ESPECIAL">Especial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tipo de impacto */}
                <div className="space-y-1.5">
                  <Label>Impacto en horas trabajadas</Label>
                  <Select
                    value={form.tipoImpacto}
                    onValueChange={v => setField("tipoImpacto", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUMA_HORAS">➕ Suma horas (turno, incapacidad, permiso)</SelectItem>
                      <SelectItem value="RESTA_HORAS">➖ Resta horas (ausencia no remunerada)</SelectItem>
                      <SelectItem value="NEUTRO">○ Sin efecto en horas (compensatorio, libre)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tipo de cálculo */}
                <div className="space-y-1.5">
                  <Label>Tipo de cálculo de horas</Label>
                  <Select
                    value={form.tipoCalculo}
                    onValueChange={v => setField("tipoCalculo", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HORAS_TURNO">
                        Calcula por horario (entrada / salida)
                      </SelectItem>
                      <SelectItem value="HORAS_FIJAS">
                        Horas fijas por día (ej: 7.33h para incapacidad)
                      </SelectItem>
                      <SelectItem value="SIN_PAGO">
                        Sin cómputo de horas (ausencia no remunerada)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Conditional: fixed hours */}
                {form.tipoCalculo === "HORAS_FIJAS" && (
                  <div className="space-y-1.5">
                    <Label>Horas por día</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="24"
                      value={form.horasFijas}
                      onChange={e => setField("horasFijas", e.target.value)}
                      placeholder="Ej: 7.33"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Una incapacidad o permiso remunerado suele equivaler a 7.33 horas (44h ÷ 6 días).
                    </p>
                  </div>
                )}

                {/* Conditional: start/end times */}
                {form.tipoCalculo === "HORAS_TURNO" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Hora entrada</Label>
                        <Input
                          type="time"
                          value={form.horaInicioDefecto}
                          onChange={e => setField("horaInicioDefecto", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Hora salida</Label>
                        <Input
                          type="time"
                          value={form.horaFinDefecto}
                          onChange={e => setField("horaFinDefecto", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="cruza-medianoche"
                        checked={form.cruzaMedianoche}
                        onCheckedChange={v => setField("cruzaMedianoche", v)}
                      />
                      <Label htmlFor="cruza-medianoche" className="cursor-pointer">
                        El turno cruza medianoche (termina al día siguiente)
                      </Label>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Liquidación toggles */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="cursor-pointer" htmlFor="afecta-liq">
                        Remunerado
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        El empleado recibe pago por este concepto
                      </p>
                    </div>
                    <Switch
                      id="afecta-liq"
                      checked={form.afectaLiquidacion}
                      onCheckedChange={v => setField("afectaLiquidacion", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="cursor-pointer" htmlFor="cuenta-tope">
                        Cuenta para tope semanal (44h)
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Suma al acumulado semanal para calcular horas extras
                      </p>
                    </div>
                    <Switch
                      id="cuenta-tope"
                      checked={form.cuentaParaTope}
                      onCheckedChange={v => setField("cuentaParaTope", v)}
                    />
                  </div>
                </div>

                {/* Optional description */}
                <div className="space-y-1.5">
                  <Label>Descripción (opcional)</Label>
                  <Input
                    value={form.descripcion}
                    onChange={e => setField("descripcion", e.target.value)}
                    placeholder="Nota o aclaración…"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-6 py-4 border-t bg-muted/30">
                <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting
                    ? "Guardando…"
                    : editingId
                    ? "Guardar cambios"
                    : "Crear concepto"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteId && deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setDeleteId(null)}
        >
          <div
            className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{
                  backgroundColor: (deleteTarget.color || "#94a3b8") + "22",
                  border: `2px solid ${deleteTarget.color || "#94a3b8"}`,
                }}
              >
                {deleteTarget.icono || "📅"}
              </div>
              <div>
                <p className="font-semibold">{deleteTarget.nombre}</p>
                <p className="text-xs text-muted-foreground">{deleteTarget.codigo}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              ¿Eliminar este concepto? Si está en uso en asignaciones existentes, se
              desactivará en lugar de eliminarse para preservar el historial.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeleteId(null)}
                disabled={deleting}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
              >
                {deleting ? "Eliminando…" : "Eliminar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Inline icon to avoid importing BookOpen (already imported in settings/page)
function BookOpenIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}
