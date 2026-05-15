"use client"

import * as React from "react"
import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as XLSX from "xlsx"
import { toast } from "sonner"
import {
  ArrowLeft,
  UserPlus,
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  X,
  Loader2,
  Users,
  FileCheck,
  AlertTriangle,
  Building2,
  Briefcase,
  CreditCard,
  Zap,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import {
  empleadoSchema,
  TIPO_DOCUMENTO,
  TIPO_VINCULACION,
  TIPO_CONTRATO,
  TIPO_DOCUMENTO_LABELS,
  TIPO_VINCULACION_LABELS,
  TIPO_CONTRATO_LABELS,
  type EmpleadoSchemaType,
} from "@/lib/schemas/empleado"
import type { ParsedExcelRow, BulkImportResult } from "@/types/empleado"

// ─── Constants ─────────────────────────────────────────────────

const STEP_FIELDS: Record<number, (keyof EmpleadoSchemaType)[]> = {
  1: ["tipoDocumento", "numeroDocumento", "nombres", "apellidos"],
  2: ["cargo", "centroCosto", "programa", "modalidad", "fechaIngreso"],
  3: ["tipoVinculacion", "tipoContrato", "salarioBase", "horasSemanales", "tieneAuxilioTransporte"],
}

const STEPS = [
  { id: 1, label: "Identificación", icon: CreditCard },
  { id: 2, label: "Organización", icon: Building2 },
  { id: 3, label: "Laboral", icon: Briefcase },
]

const PAGE_SIZE = 20

// ─── Utilities ─────────────────────────────────────────────────

function formatCOP(v: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(v)
}

function parseExcelDate(value: unknown): string | null {
  if (!value && value !== 0) return null

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, "0")
    const d = String(value.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }

  if (typeof value === "string") {
    const cleaned = value.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned
    const parts = cleaned.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/)
    if (parts) {
      return `${parts[3]}-${parts[2].padStart(2, "0")}-${parts[1].padStart(2, "0")}`
    }
    const d = new Date(cleaned)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }

  // Excel serial date number (days since Dec 30, 1899)
  if (typeof value === "number" && value > 0) {
    const excelEpoch = new Date(1899, 11, 30)
    const date = new Date(excelEpoch.getTime() + value * 86_400_000)
    if (!isNaN(date.getTime())) {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, "0")
      const d = String(date.getDate()).padStart(2, "0")
      return `${y}-${m}-${d}`
    }
  }

  return null
}

function parseNumeric(v: unknown): number {
  if (typeof v === "number") return v
  // Handle Colombian format: 1.423.500 → remove dots, then parse
  const cleaned = String(v ?? "")
    .trim()
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^0-9.]/g, "")
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

function validateExcelRow(raw: Record<string, unknown>, rowIndex: number): ParsedExcelRow {
  const get = (key: string): unknown => raw[key] ?? raw[key.replace("*", "")] ?? ""

  const nombres = String(get("nombres*")).trim()
  const apellidos = String(get("apellidos*")).trim()
  const tipoDocumento = String(get("tipoDocumento*")).trim().toUpperCase()
  const numeroDocumento = String(get("numeroDocumento*")).trim()
  const fechaIngreso = parseExcelDate(get("fechaIngreso*")) ?? ""
  const salarioBase = parseNumeric(get("salarioBase*"))
  const tipoVinculacion = String(get("tipoVinculacion*")).trim().toUpperCase()
  const tipoContrato = String(get("tipoContrato*")).trim().toUpperCase()
  const horasSemanales = parseNumeric(get("horasSemanales*"))
  const auxRaw = String(get("tieneAuxilioTransporte*")).trim().toUpperCase()
  const tieneAuxilioTransporte = auxRaw === "SI" || auxRaw === "SÍ" || auxRaw === "1" || auxRaw === "TRUE"
  const centroCosto = String(get("centroCosto")).trim() || null
  const programa = String(get("programa")).trim() || null
  const modalidad = String(get("modalidad")).trim() || null
  const cargo = String(get("cargo")).trim() || null

  const data = {
    nombres, apellidos, tipoDocumento, numeroDocumento, fechaIngreso,
    salarioBase, tipoVinculacion, tipoContrato, horasSemanales,
    tieneAuxilioTransporte, centroCosto, programa, modalidad, cargo,
  }

  const result = empleadoSchema.safeParse(data)
  const errors: string[] = []

  if (!result.success) {
    result.error.issues.forEach((issue) => {
      const field = String(issue.path[0] ?? "campo")
      errors.push(`${field}: ${issue.message}`)
    })
  }

  if (!parseExcelDate(get("fechaIngreso*")) && !errors.some((e) => e.startsWith("fechaIngreso"))) {
    errors.push("fechaIngreso: Formato inválido (use YYYY-MM-DD)")
  }

  return {
    ...(data as any),
    _rowIndex: rowIndex,
    errors,
    isValid: errors.length === 0,
  }
}

// ─── Step Indicator ─────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center mb-8 px-2">
      {STEPS.map((step, i) => {
        const Icon = step.icon
        const isDone = current > step.id
        const isActive = current === step.id
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={[
                  "flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all duration-200",
                  isDone ? "bg-primary border-primary text-primary-foreground" : "",
                  isActive ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/20" : "",
                  !isActive && !isDone ? "border-border text-muted-foreground/40" : "",
                ].join(" ")}
              >
                {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span
                className={[
                  "text-[11px] font-medium hidden sm:block transition-colors",
                  isActive ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground/50",
                ].join(" ")}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={[
                  "flex-1 h-px mx-3 mb-4 transition-colors duration-300",
                  current > step.id ? "bg-primary" : "bg-border",
                ].join(" ")}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ─── Field Error ───────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="text-[11px] text-destructive flex items-center gap-1 mt-1">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  )
}

// ─── Manual Form ───────────────────────────────────────────────

function ManualForm() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmpleadoSchemaType>({
    resolver: zodResolver(empleadoSchema),
    defaultValues: {
      tipoDocumento: "CEDULA_CIUDADANIA",
      tipoVinculacion: "TIEMPO_COMPLETO",
      tipoContrato: "TERMINO_INDEFINIDO",
      horasSemanales: 44,
      tieneAuxilioTransporte: true,
    },
  })

  const salario = watch("salarioBase")
  const tieneAux = watch("tieneAuxilioTransporte")
  const tipoDocumentoVal = watch("tipoDocumento")
  const tipoVinculacionVal = watch("tipoVinculacion")
  const tipoContratoVal = watch("tipoContrato")

  const nextStep = async () => {
    const valid = await trigger(STEP_FIELDS[step] as any)
    if (valid) setStep((s) => Math.min(s + 1, 3))
  }

  const prevStep = () => setStep((s) => Math.max(s - 1, 1))

  const onSubmit = async (data: EmpleadoSchemaType) => {
    setSubmitting(true)
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        toast.success("Empleado creado exitosamente")
        router.push("/dashboard/employees")
      } else {
        const err = await res.json()
        toast.error(err.error || "Error al crear el empleado")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <StepIndicator current={step} />

      {/* ── Step 1: Identificación ── */}
      <div className={step !== 1 ? "hidden" : ""}>
      <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3 pt-5 px-6 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <CreditCard className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-[15px]">Datos de Identificación</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Información personal y documento de identidad</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6 pt-5 pb-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="nombres" className="text-xs font-medium">
                  Nombres <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nombres"
                  placeholder="Ej: Juan Carlos"
                  autoComplete="given-name"
                  {...register("nombres")}
                  className={errors.nombres ? "border-destructive focus-visible:ring-destructive/30" : ""}
                />
                <FieldError message={errors.nombres?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="apellidos" className="text-xs font-medium">
                  Apellidos <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="apellidos"
                  placeholder="Ej: Rodríguez Pérez"
                  autoComplete="family-name"
                  {...register("apellidos")}
                  className={errors.apellidos ? "border-destructive focus-visible:ring-destructive/30" : ""}
                />
                <FieldError message={errors.apellidos?.message} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Tipo de Documento <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={tipoDocumentoVal}
                  onValueChange={(v) => setValue("tipoDocumento", v as any, { shouldValidate: true })}
                >
                  <SelectTrigger className={errors.tipoDocumento ? "border-destructive" : ""}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_DOCUMENTO.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TIPO_DOCUMENTO_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.tipoDocumento?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="numeroDocumento" className="text-xs font-medium">
                  Número de Documento <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="numeroDocumento"
                  placeholder="Ej: 10245678"
                  {...register("numeroDocumento")}
                  className={errors.numeroDocumento ? "border-destructive focus-visible:ring-destructive/30" : ""}
                />
                <FieldError message={errors.numeroDocumento?.message} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Step 2: Organización ── */}
      <div className={step !== 2 ? "hidden" : ""}>
      <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3 pt-5 px-6 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 shrink-0">
                <Building2 className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-[15px]">Datos Organizacionales</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Área, programa y posición dentro de la empresa</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6 pt-5 pb-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="cargo" className="text-xs font-medium">Cargo</Label>
                <Input
                  id="cargo"
                  placeholder="Ej: Educador, Psicólogo"
                  {...register("cargo")}
                />
                <FieldError message={errors.cargo?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="centroCosto" className="text-xs font-medium">Centro de Costo</Label>
                <Input
                  id="centroCosto"
                  placeholder="Ej: 400013"
                  {...register("centroCosto")}
                />
                <FieldError message={errors.centroCosto?.message} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="programa" className="text-xs font-medium">Programa</Label>
                <Input
                  id="programa"
                  placeholder="Ej: Creeme, Genesis"
                  {...register("programa")}
                />
                <FieldError message={errors.programa?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="modalidad" className="text-xs font-medium">Modalidad</Label>
                <Input
                  id="modalidad"
                  placeholder="Ej: Internado, CAE"
                  {...register("modalidad")}
                />
                <FieldError message={errors.modalidad?.message} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="fechaIngreso" className="text-xs font-medium">
                  Fecha de Ingreso <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fechaIngreso"
                  type="date"
                  {...register("fechaIngreso")}
                  className={errors.fechaIngreso ? "border-destructive focus-visible:ring-destructive/30" : ""}
                />
                <FieldError message={errors.fechaIngreso?.message} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Step 3: Financiero y Laboral ── */}
      <div className={step !== 3 ? "hidden" : ""}>
      <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3 pt-5 px-6 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10 shrink-0">
                <Briefcase className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-[15px]">Información Laboral y Financiera</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Contrato, salario y beneficios del empleado</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6 pt-5 pb-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Tipo de Vinculación <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={tipoVinculacionVal}
                  onValueChange={(v) => setValue("tipoVinculacion", v as any, { shouldValidate: true })}
                >
                  <SelectTrigger className={errors.tipoVinculacion ? "border-destructive" : ""}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_VINCULACION.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TIPO_VINCULACION_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.tipoVinculacion?.message} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Tipo de Contrato <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={tipoContratoVal}
                  onValueChange={(v) => setValue("tipoContrato", v as any, { shouldValidate: true })}
                >
                  <SelectTrigger className={errors.tipoContrato ? "border-destructive" : ""}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_CONTRATO.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TIPO_CONTRATO_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.tipoContrato?.message} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="salarioBase" className="text-xs font-medium">
                  Salario Base (COP) <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">$</span>
                  <Input
                    id="salarioBase"
                    type="number"
                    placeholder="1423500"
                    className={`pl-7 ${errors.salarioBase ? "border-destructive focus-visible:ring-destructive/30" : ""}`}
                    {...register("salarioBase", { valueAsNumber: true })}
                  />
                </div>
                {salario > 0 && !isNaN(salario) && (
                  <p className="text-[11px] text-muted-foreground">{formatCOP(salario)}</p>
                )}
                <FieldError message={errors.salarioBase?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="horasSemanales" className="text-xs font-medium">
                  Horas Semanales <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="horasSemanales"
                    type="number"
                    placeholder="44"
                    className={`pr-14 ${errors.horasSemanales ? "border-destructive focus-visible:ring-destructive/30" : ""}`}
                    {...register("horasSemanales", { valueAsNumber: true })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs select-none">
                    h/sem
                  </span>
                </div>
                <FieldError message={errors.horasSemanales?.message} />
              </div>
            </div>
            <Separator className="opacity-40" />
            <div
              className={[
                "flex items-center justify-between p-4 rounded-xl border transition-colors",
                tieneAux
                  ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                  : "bg-muted/20 border-border/30",
              ].join(" ")}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${tieneAux ? "bg-amber-500/15" : "bg-muted/50"}`}>
                  <Zap className={`h-4 w-4 ${tieneAux ? "text-amber-600" : "text-muted-foreground/50"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium">Auxilio de Transporte</p>
                  <p className="text-xs text-muted-foreground">Aplica si salario ≤ 2 SMLV (Art. 98, Ley 50/90)</p>
                </div>
              </div>
              <Switch
                checked={tieneAux}
                onCheckedChange={(v) => setValue("tieneAuxilioTransporte", v, { shouldValidate: true })}
                className="data-[state=checked]:bg-amber-500"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Navigation ── */}
      <div className="flex items-center justify-between mt-5">
        {step > 1 ? (
          <Button type="button" variant="outline" onClick={prevStep} className="gap-2">
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
        ) : (
          <Link href="/dashboard/employees">
            <Button type="button" variant="ghost" className="gap-2 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" /> Cancelar
            </Button>
          </Link>
        )}

        {step < 3 ? (
          <Button type="button" onClick={nextStep} className="gap-2">
            Siguiente <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="submit" disabled={submitting} className="gap-2 min-w-[160px]">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" /> Guardar Empleado
              </>
            )}
          </Button>
        )}
      </div>
    </form>
  )
}

// ─── Excel Import ───────────────────────────────────────────────

function ExcelImport() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [rows, setRows] = useState<ParsedExcelRow[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<BulkImportResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [page, setPage] = useState(1)

  const validRows = rows.filter((r) => r.isValid)
  const invalidRows = rows.filter((r) => !r.isValid)
  const selectedValid = validRows.filter((r) => selected.has(r._rowIndex))
  const allSelected = validRows.length > 0 && selected.size === validRows.length

  const parseFile = useCallback(async (f: File) => {
    setParsing(true)
    setRows([])
    setSelected(new Set())
    setResult(null)
    setPage(1)

    try {
      const buffer = await f.arrayBuffer()
      const wb = XLSX.read(buffer, { type: "array", cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]

      if (!ws) {
        toast.error("El archivo no contiene hojas de datos")
        return
      }

      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
        raw: true,
        defval: "",
      })

      if (json.length === 0) {
        toast.error("El archivo no contiene filas de datos")
        return
      }

      if (json.length > 1000) {
        toast.error("El archivo supera el límite de 1000 empleados")
        return
      }

      const parsed = json.map((row, i) => validateExcelRow(row, i + 2))
      setRows(parsed)

      const validCount = parsed.filter((r) => r.isValid).length
      setSelected(new Set(parsed.filter((r) => r.isValid).map((r) => r._rowIndex)))

      if (validCount === 0) {
        toast.warning(`${parsed.length} filas detectadas — ninguna válida para importar`)
      } else {
        toast.success(
          `${parsed.length} filas detectadas: ${validCount} válidas${parsed.length - validCount > 0 ? `, ${parsed.length - validCount} con errores` : ""}`
        )
      }
    } catch (err) {
      console.error("[EXCEL_PARSE]", err)
      toast.error("No se pudo leer el archivo. Verifica que sea un Excel válido.")
    } finally {
      setParsing(false)
    }
  }, [])

  const handleFile = (f: File | null) => {
    if (!f) return
    if (!f.name.match(/\.(xlsx|xls)$/i)) {
      toast.error("Solo se aceptan archivos .xlsx o .xls")
      return
    }
    setFile(f)
    parseFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0] ?? null)
  }

  const toggleRow = (rowIndex: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(rowIndex)) next.delete(rowIndex)
      else next.add(rowIndex)
      return next
    })
  }

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(validRows.map((r) => r._rowIndex)))
  }

  const handleImport = async () => {
    if (selectedValid.length === 0) {
      toast.error("Selecciona al menos un empleado para importar")
      return
    }

    setImporting(true)
    try {
      const payload = {
        empleados: selectedValid.map((r) => ({
          nombres: r.nombres,
          apellidos: r.apellidos,
          tipoDocumento: r.tipoDocumento,
          numeroDocumento: r.numeroDocumento,
          fechaIngreso: r.fechaIngreso,
          salarioBase: r.salarioBase,
          tipoVinculacion: r.tipoVinculacion,
          tipoContrato: r.tipoContrato,
          horasSemanales: r.horasSemanales,
          tieneAuxilioTransporte: r.tieneAuxilioTransporte,
          centroCosto: r.centroCosto,
          programa: r.programa,
          modalidad: r.modalidad,
          cargo: r.cargo,
        })),
      }

      const res = await fetch("/api/employees/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data: BulkImportResult = await res.json()

      if (!res.ok) {
        toast.error((data as any).error ?? "Error en la importación")
        return
      }

      setResult(data)
      if (data.created > 0) toast.success(`${data.created} empleados importados correctamente`)
      if (data.failed > 0) toast.warning(`${data.failed} empleados no pudieron importarse`)
    } catch {
      toast.error("Error de conexión al importar")
    } finally {
      setImporting(false)
    }
  }

  const resetImport = () => {
    setFile(null)
    setRows([])
    setSelected(new Set())
    setResult(null)
    setPage(1)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // ── Estado: importación completada ──
  if (result && result.created > 0 && result.failed === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-5 text-center">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/20">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>
        <div>
          <h3 className="text-xl font-bold">Importación completada</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {result.created} empleado{result.created !== 1 ? "s" : ""} importado{result.created !== 1 ? "s" : ""} correctamente
          </p>
        </div>
        <div className="flex gap-3 mt-2">
          <Button onClick={resetImport} variant="outline">
            <Upload className="mr-2 h-4 w-4" /> Importar otro archivo
          </Button>
          <Button onClick={() => router.push("/dashboard/employees")}>
            <Users className="mr-2 h-4 w-4" /> Ver empleados
          </Button>
        </div>
      </div>
    )
  }

  // ── Estado: importación parcial ──
  if (result) {
    return (
      <div className="space-y-4">
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="px-5 py-4">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
                Importación parcial — {result.created} creados, {result.failed} fallidos
              </p>
            </div>
            {result.errors.length > 0 && (
              <div className="max-h-44 overflow-y-auto space-y-1">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                    Fila {e.index + 1} ({e.numeroDocumento}): {e.error}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Button onClick={resetImport} variant="outline">
            <Upload className="mr-2 h-4 w-4" /> Importar otro archivo
          </Button>
          <Button onClick={() => router.push("/dashboard/employees")}>
            <Users className="mr-2 h-4 w-4" /> Ver empleados
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Instrucciones */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/50">
        <CardContent className="px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-blue-500/10 shrink-0 mt-0.5">
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                Importa múltiples empleados desde Excel
              </p>
              <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-0.5 leading-relaxed">
                Descarga la plantilla, complétala con los datos de tus empleados y súbela.
                El sistema validará cada fila antes de importar.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-blue-200 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/30"
              onClick={() => window.open("/api/employees/template", "_blank")}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Plantilla
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Drop zone (visible solo si no hay archivo cargado) */}
      {!file && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={[
            "relative flex flex-col items-center justify-center gap-4",
            "h-52 rounded-xl border-2 border-dashed cursor-pointer",
            "transition-all duration-200",
            dragOver
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border/50 bg-muted/20 hover:bg-muted/30 hover:border-muted-foreground/30",
          ].join(" ")}
        >
          <div
            className={[
              "p-4 rounded-full transition-colors",
              dragOver ? "bg-primary/10" : "bg-muted/40",
            ].join(" ")}
          >
            <Upload
              className={["h-8 w-8 transition-colors", dragOver ? "text-primary" : "text-muted-foreground/40"].join(" ")}
            />
          </div>
          <div className="text-center px-6">
            <p className="text-sm font-medium text-muted-foreground">
              {dragOver ? "Suelta el archivo aquí" : "Arrastra tu archivo o haz clic para seleccionar"}
            </p>
            <p className="text-xs text-muted-foreground/50 mt-1">
              Acepta .xlsx y .xls · Máximo 1000 empleados por archivo
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="sr-only"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </div>
      )}

      {/* Parsing */}
      {parsing && (
        <Card className="border-border/30">
          <CardContent className="px-5 py-5 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
            <p className="text-sm text-muted-foreground">Analizando archivo y validando datos…</p>
          </CardContent>
        </Card>
      )}

      {/* Preview (visible si hay archivo cargado y no está parseando) */}
      {file && !parsing && rows.length > 0 && (
        <div className="space-y-4">
          {/* Resumen del archivo */}
          <Card className="border-border/40">
            <CardContent className="px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-green-500/10 shrink-0">
                    <FileCheck className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <div className="flex items-center flex-wrap gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{rows.length} filas</span>
                      <Badge className="text-[10px] py-0 px-1.5 bg-green-600 hover:bg-green-600">
                        {validRows.length} válidas
                      </Badge>
                      {invalidRows.length > 0 && (
                        <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                          {invalidRows.length} con errores
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground shrink-0"
                  onClick={resetImport}
                  title="Quitar archivo"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de filas válidas */}
          {validRows.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Filas válidas
                  <Badge variant="outline" className="text-[10px] font-normal">{validRows.length}</Badge>
                </h4>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="selectAll"
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Seleccionar todas las filas válidas"
                  />
                  <label htmlFor="selectAll" className="text-xs text-muted-foreground cursor-pointer select-none">
                    {allSelected ? "Deseleccionar todo" : "Seleccionar todo"}
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-border/40 overflow-hidden">
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 sticky top-0 z-10">
                      <tr>
                        <th className="w-8 px-3 py-2.5 text-left" />
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Fila</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Documento</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Nombre completo</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Cargo</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Salario</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Ingreso</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {validRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((row) => (
                        <tr
                          key={row._rowIndex}
                          onClick={() => toggleRow(row._rowIndex)}
                          className={[
                            "cursor-pointer transition-colors",
                            selected.has(row._rowIndex)
                              ? "bg-primary/5 hover:bg-primary/10"
                              : "hover:bg-muted/30",
                          ].join(" ")}
                        >
                          <td className="px-3 py-2">
                            <Checkbox
                              checked={selected.has(row._rowIndex)}
                              onCheckedChange={() => toggleRow(row._rowIndex)}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Seleccionar fila ${row._rowIndex}`}
                            />
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{row._rowIndex}</td>
                          <td className="px-3 py-2 font-mono tracking-tight">{row.numeroDocumento}</td>
                          <td className="px-3 py-2 font-medium whitespace-nowrap">
                            {row.nombres} {row.apellidos}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{row.cargo ?? "—"}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{formatCOP(row.salarioBase)}</td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{row.fechaIngreso}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {validRows.length > PAGE_SIZE && (
                  <div className="flex items-center justify-between px-3 py-2 border-t border-border/30 bg-muted/20">
                    <span className="text-xs text-muted-foreground">
                      {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, validRows.length)} de {validRows.length}
                    </span>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs"
                        onClick={() => setPage((p) => p - 1)}
                        disabled={page === 1}
                      >
                        ‹
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={page * PAGE_SIZE >= validRows.length}
                      >
                        ›
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tabla de filas con errores */}
          {invalidRows.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-2 mb-2.5">
                <AlertCircle className="h-4 w-4 text-destructive" />
                Filas con errores
                <Badge variant="destructive" className="text-[10px] font-normal py-0">{invalidRows.length}</Badge>
              </h4>
              <div className="rounded-xl border border-destructive/20 overflow-hidden">
                <div className="overflow-x-auto max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-destructive/5 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Fila</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Documento</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Nombre</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Errores detectados</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {invalidRows.map((row) => (
                        <tr key={row._rowIndex} className="bg-destructive/5">
                          <td className="px-3 py-2 text-muted-foreground">{row._rowIndex}</td>
                          <td className="px-3 py-2 font-mono tracking-tight">{row.numeroDocumento || "—"}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {row.nombres || "—"} {row.apellidos || ""}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              {row.errors.map((err, i) => (
                                <span
                                  key={i}
                                  className="inline-block bg-destructive/10 text-destructive px-1.5 py-0.5 rounded text-[10px] leading-tight"
                                >
                                  {err}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Acción de importar */}
          <div className="flex items-center justify-between pt-1 gap-3">
            <p className="text-sm text-muted-foreground">
              {selectedValid.length > 0 ? (
                <>
                  <span className="font-medium text-foreground">{selectedValid.length}</span>{" "}
                  empleado{selectedValid.length !== 1 ? "s" : ""} listo{selectedValid.length !== 1 ? "s" : ""} para importar
                </>
              ) : (
                "Selecciona empleados para importar"
              )}
            </p>
            <Button
              onClick={handleImport}
              disabled={importing || selectedValid.length === 0}
              className="gap-2 min-w-[180px]"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Importando…
                </>
              ) : (
                <>
                  <Users className="h-4 w-4" />
                  Importar {selectedValid.length > 0 ? selectedValid.length : ""}{" "}
                  empleado{selectedValid.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────

export default function NewEmployeePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/employees">
          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agregar Empleado</h1>
          <p className="text-sm text-muted-foreground">Crea un empleado manualmente o importa múltiples desde Excel</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="manual" className="space-y-5">
        <TabsList className="h-10 w-full max-w-xs grid grid-cols-2">
          <TabsTrigger value="manual" className="gap-1.5 text-xs font-medium">
            <UserPlus className="h-3.5 w-3.5" />
            Crear Manualmente
          </TabsTrigger>
          <TabsTrigger value="excel" className="gap-1.5 text-xs font-medium">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Importar Excel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="mt-0">
          <ManualForm />
        </TabsContent>

        <TabsContent value="excel" className="mt-0">
          <ExcelImport />
        </TabsContent>
      </Tabs>
    </div>
  )
}
