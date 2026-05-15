"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Save,
  RefreshCw,
  Clock,
  Moon,
  Sun,
  Calendar,
  Calculator,
  Briefcase,
  Plus,
  Trash2,
  Moon as MoonIcon,
  Sun as SunIcon,
  CircleDot,
  CalendarDays,
  CheckCircle2,
  AlertTriangle
} from "lucide-react"
import { toast } from "sonner"

interface ConceptoTurno {
  id?: string
  codigo: string
  nombre: string
  descripcion: string
  horaInicioDefecto: string
  horaFinDefecto: string
  cruzaMedianoche: boolean
  color: string
  horasFijas: number
  estaActivo: boolean
  categoria: string
  tipoTurno: "DIURNO" | "NOCTURNO" | "24H" | "PERSONALIZADO"
}

export default function LegalSettingsPage() {
  const [activeTab, setActiveTab] = useState("jornada")
  const [configuracion, setConfiguracion] = useState({
    horasSemanalesMaximas: 44,
    horasDiariasEstandar: 7.33,
    horasMensualesEstandar: 176, // 44 * 4 semanas
    porcentajeRecargoNocturno: 35,
    porcentajeRecargoDomFestivo: 75,
    porcentajeRecargoNocturnoFestivo: 110,
    porcentajeExtraDiurna: 25,
    porcentajeExtraNocturna: 75,
    porcentajeExtraDiurnaFestiva: 100,
    porcentajeExtraNocturnaFestiva: 150,
    horaInicioNocturno: "19:00",
    horaFinNocturno: "06:00",
    formulaValorHora: "SALARIO_MENSUAL / 220",
    tipoCalculoHorasExtras: 'SEMANAL' as 'SEMANAL' | 'DIARIO'
  })
  const [conceptosTurno, setConceptosTurno] = useState<ConceptoTurno[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConfiguracion()
  }, [])

  const fetchConfiguracion = async () => {
    try {
      const response = await fetch("/api/settings/legal")
      if (response.ok) {
        const data = await response.json()
        if (data.configuracion) {
          setConfiguracion({
            ...data.configuracion,
            horasMensualesEstandar: data.configuracion.horasMensualesEstandar ?? Math.round(data.configuracion.horasSemanalesMaximas * 4)
          })
        }
        if (data.conceptosTurno) {
          setConceptosTurno(data.conceptosTurno.map((concepto: any) => ({
            ...concepto,
            tipoTurno: determinarTipoTurno(
              concepto.horaInicioDefecto,
              concepto.horaFinDefecto,
              concepto.cruzaMedianoche
            )
          })))
        }
      } else {
        const err = await response.json()
        toast.error(err.error || "No se pudo cargar la configuración legal")
      }
    } catch (error) {
      toast.error("Error al cargar configuración")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      const response = await fetch("/api/settings/legal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configuracion,
          conceptosTurno
        }),
      })

      if (response.ok) {
        toast.success("Configuración guardada exitosamente")
      } else {
        const err = await response.json()
        toast.error(err.error || "Error al guardar la configuración")
      }
    } catch (error) {
      toast.error("Error de conexión")
    }
  }

  const handleHorasSemanalesChange = (value: number) => {
    const horasDiarias = value / 6
    const horasMensuales = value * 4
    setConfiguracion(prev => ({
      ...prev,
      horasSemanalesMaximas: value,
      horasDiariasEstandar: Math.round(horasDiarias * 100) / 100,
      horasMensualesEstandar: Math.round(horasMensuales)
    }))
  }

  const calcularHorasNocturnas = (inicio: string, fin: string) => {
    const [hi, mi] = inicio.split(":").map(Number)
    const [hf, mf] = fin.split(":").map(Number)
    let minutosInicio = hi * 60 + mi
    let minutosFin = hf * 60 + mf
    if (minutosFin <= minutosInicio) {
      minutosFin += 24 * 60
    }
    return Math.round(((minutosFin - minutosInicio) / 60) * 100) / 100
  }

  const determinarTipoTurno = (horaInicio: string, horaFin: string, cruzaMedianoche: boolean) => {
    if (!cruzaMedianoche && horaInicio === "07:00" && horaFin === "19:00") return "DIURNO"
    if (cruzaMedianoche && horaInicio === "19:00" && horaFin === "07:00") return "NOCTURNO"
    if (cruzaMedianoche && horaInicio === horaFin) return "24H"
    return "PERSONALIZADO"
  }

  const construirConceptoTurnoPredeterminado = (tipo: ConceptoTurno["tipoTurno"]) => {
    switch (tipo) {
      case "DIURNO":
        return {
          codigo: "T" + (conceptosTurno.length + 1),
          nombre: "Turno Día",
          descripcion: "Horario diurno típico",
          horaInicioDefecto: "07:00",
          horaFinDefecto: "19:00",
          cruzaMedianoche: false,
          color: "#0EA5E9",
          horasFijas: 12,
          estaActivo: true,
          categoria: "TURNO_LABORAL",
          tipoTurno: "DIURNO"
        }
      case "NOCTURNO":
        return {
          codigo: "T" + (conceptosTurno.length + 1),
          nombre: "Turno Noche",
          descripcion: "Horario nocturno típico",
          horaInicioDefecto: "19:00",
          horaFinDefecto: "07:00",
          cruzaMedianoche: true,
          color: "#A855F7",
          horasFijas: 12,
          estaActivo: true,
          categoria: "TURNO_LABORAL",
          tipoTurno: "NOCTURNO"
        }
      case "24H":
        return {
          codigo: "T" + (conceptosTurno.length + 1),
          nombre: "Turno 24h",
          descripcion: "Turno continuo de 24 horas",
          horaInicioDefecto: "07:00",
          horaFinDefecto: "07:00",
          cruzaMedianoche: true,
          color: "#10B981",
          horasFijas: 24,
          estaActivo: true,
          categoria: "TURNO_LABORAL",
          tipoTurno: "24H"
        }
      default:
        return {
          codigo: "T" + (conceptosTurno.length + 1),
          nombre: "Nuevo Turno",
          descripcion: "",
          horaInicioDefecto: "08:00",
          horaFinDefecto: "17:00",
          cruzaMedianoche: false,
          color: "#3B82F6",
          horasFijas: 8,
          estaActivo: true,
          categoria: "TURNO_LABORAL",
          tipoTurno: "PERSONALIZADO"
        }
    }
  }

  const agregarConceptoTurno = () => {
    const nuevoConcepto = construirConceptoTurnoPredeterminado("PERSONALIZADO") as ConceptoTurno
    setConceptosTurno([...conceptosTurno, nuevoConcepto])
  }

  const aplicarTipoTurno = (concepto: ConceptoTurno, tipo: ConceptoTurno["tipoTurno"]) => {
    const base = { ...concepto, tipoTurno: tipo }
    switch (tipo) {
      case "DIURNO":
        return {
          ...base,
          nombre: "Turno Día",
          horaInicioDefecto: "07:00",
          horaFinDefecto: "19:00",
          cruzaMedianoche: false,
          horasFijas: 12
        }
      case "NOCTURNO":
        return {
          ...base,
          nombre: "Turno Noche",
          horaInicioDefecto: "19:00",
          horaFinDefecto: "07:00",
          cruzaMedianoche: true,
          horasFijas: 12
        }
      case "24H":
        return {
          ...base,
          nombre: "Turno 24h",
          horaInicioDefecto: "07:00",
          horaFinDefecto: "07:00",
          cruzaMedianoche: true,
          horasFijas: 24
        }
      default:
        return base
    }
  }

  const actualizarConcepto = (index: number, campo: keyof ConceptoTurno, valor: any) => {
    const nuevosConceptos = [...conceptosTurno]
    let conceptoActualizado = {
      ...nuevosConceptos[index],
      [campo]: valor
    }

    if (campo === "tipoTurno") {
      conceptoActualizado = aplicarTipoTurno(conceptoActualizado as ConceptoTurno, valor)
    }

    if (campo === "horaInicioDefecto" || campo === "horaFinDefecto" || campo === "cruzaMedianoche") {
      conceptoActualizado.tipoTurno = determinarTipoTurno(
        conceptoActualizado.horaInicioDefecto,
        conceptoActualizado.horaFinDefecto,
        conceptoActualizado.cruzaMedianoche
      )
      conceptoActualizado.horasFijas = calcularHorasNocturnas(
        conceptoActualizado.horaInicioDefecto,
        conceptoActualizado.horaFinDefecto
      )
    }

    nuevosConceptos[index] = conceptoActualizado
    setConceptosTurno(nuevosConceptos)
  }

  const coloresPredefinidos = [
    { color: "#3B82F6", nombre: "Azul", icono: Briefcase },
    { color: "#10B981", nombre: "Verde", icono: Sun },
    { color: "#8B5CF6", nombre: "Púrpura", icono: Moon },
    { color: "#F59E0B", nombre: "Naranja", icono: Clock },
    { color: "#EF4444", nombre: "Rojo", icono: Calendar },
    { color: "#06B6D4", nombre: "Cyan", icono: Calculator }
  ]

  const eliminarConcepto = (index: number) => {
    const nuevosConceptos = [...conceptosTurno]
    nuevosConceptos.splice(index, 1)
    setConceptosTurno(nuevosConceptos)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Configuración Legal</h1>
        <div className="animate-pulse h-96 bg-gray-200 rounded"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Configuración Legal</h1>
          <p className="text-muted-foreground">
            Parámetros del Código Sustantivo del Trabajo Colombia - Resolución 2466 de 2025
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => fetchConfiguracion()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Restaurar
          </Button>
          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
            <Save className="mr-2 h-4 w-4" />
            Guardar Cambios
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="jornada" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Jornada</span>
          </TabsTrigger>
          <TabsTrigger value="recargos" className="flex items-center gap-2">
            <Moon className="h-4 w-4" />
            <span className="hidden sm:inline">Recargos</span>
          </TabsTrigger>
          <TabsTrigger value="extras" className="flex items-center gap-2">
            <Sun className="h-4 w-4" />
            <span className="hidden sm:inline">Extras</span>
          </TabsTrigger>
          <TabsTrigger value="turnos" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Turnos</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Jornada Laboral */}
        <TabsContent value="jornada" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Horas Laborales */}
            <Card className="lg:col-span-2">
              <CardHeader className="bg-blue-50 dark:bg-blue-950">
                <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <Clock className="h-5 w-5" />
                  Jornada Laboral - Art. 161 CST
                </CardTitle>
                <CardDescription>
                  Configuración de horas máximas según la ley colombiana
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="font-semibold text-blue-700">Horas Semanales Máximas</Label>
                    <Input
                      type="number"
                      value={configuracion.horasSemanalesMaximas}
                      onChange={(e) => handleHorasSemanalesChange(parseFloat(e.target.value))}
                      className="text-lg font-medium"
                    />
                    <p className="text-xs text-muted-foreground">
                      Máximo legal: 48h (Art. 161)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold">Horas Diarias Estándar</Label>
                    <Input
                      type="number"
                      value={configuracion.horasDiariasEstandar}
                      readOnly
                      className="bg-gray-100"
                    />
                    <p className="text-xs text-muted-foreground">
                      Calculado: {configuracion.horasSemanalesMaximas} ÷ 6 días
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold">Horas Mensuales Estándar</Label>
                    <Input
                      type="number"
                      value={configuracion.horasMensualesEstandar}
                      readOnly
                      className="bg-gray-100"
                    />
                    <p className="text-xs text-muted-foreground">
                      {configuracion.horasSemanalesMaximas} × 4 semanas = {configuracion.horasMensualesEstandar}h
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Para mes de 30 días se usa divisor 220.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label className="font-semibold">Fórmula de Cálculo del Valor Hora</Label>
                  <Input
                    value={configuracion.formulaValorHora}
                    onChange={(e) => setConfiguracion({ ...configuracion, formulaValorHora: e.target.value })}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Variable disponible: SALARIO_MENSUAL. Divisor recomendado: 220 (para mes de 30 días) o 240 (para factor fijo)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Ayuda */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Información Legal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="font-medium text-blue-800 mb-1">Art. 161 CST</p>
                  <p className="text-blue-700">
                    Jornada máxima: 7.33 horas diarias / 44 horas semanales.
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="font-medium text-green-800 mb-1">Res. 2466/2025</p>
                  <p className="text-green-700">
                    Jornada nocturna: 7pm - 6am ({calcularHorasNocturnas(configuracion.horaInicioNocturno, configuracion.horaFinNocturno)} horas)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Recargos */}
        <TabsContent value="recargos" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recargos por Condición */}
            <Card>
              <CardHeader className="bg-purple-50 dark:bg-purple-950">
                <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                  <Moon className="h-5 w-5" />
                  Recargos por Condición - Art. 168 CST
                </CardTitle>
                <CardDescription>
                  Porcentajes adicionales por trabajo nocturno y festivo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-full">
                        <Moon className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">Recargo Nocturno</p>
                        <p className="text-sm text-muted-foreground">7pm - 6am (Ley 2466/2025)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={configuracion.porcentajeRecargoNocturno}
                        onChange={(e) => setConfiguracion({ ...configuracion, porcentajeRecargoNocturno: parseInt(e.target.value) })}
                        className="w-20 text-right font-bold"
                      />
                      <span className="text-lg font-bold">%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-full">
                        <Calendar className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium">Recargo Dominical/Festivo</p>
                        <p className="text-sm text-muted-foreground">Trabajo en días festivos (diurno)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={configuracion.porcentajeRecargoDomFestivo}
                        onChange={(e) => setConfiguracion({ ...configuracion, porcentajeRecargoDomFestivo: parseInt(e.target.value) })}
                        className="w-20 text-right font-bold"
                      />
                      <span className="text-lg font-bold">%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-full">
                        <Moon className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium">Nocturno + Festivo</p>
                        <p className="text-sm text-muted-foreground">Combinado nocturno y festivo</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={configuracion.porcentajeRecargoNocturnoFestivo}
                        onChange={(e) => setConfiguracion({ ...configuracion, porcentajeRecargoNocturnoFestivo: parseInt(e.target.value) })}
                        className="w-20 text-right font-bold"
                      />
                      <span className="text-lg font-bold">%</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hora Inicio Nocturno</Label>
                    <Input
                      type="time"
                      value={configuracion.horaInicioNocturno}
                      onChange={(e) => setConfiguracion({ ...configuracion, horaInicioNocturno: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora Fin Nocturno</Label>
                    <Input
                      type="time"
                      value={configuracion.horaFinNocturno}
                      onChange={(e) => setConfiguracion({ ...configuracion, horaFinNocturno: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Explicación */}
            <Card>
              <CardHeader>
                <CardTitle>¿Cómo se aplican los recargos?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium text-purple-700">Ejemplo Nocturno:</p>
                    <p className="text-sm text-muted-foreground">
                      Hora ordinaria: $10,000<br />
                      Con recargo 35%: $13,500
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium text-orange-700">Ejemplo Festivo:</p>
                    <p className="text-sm text-muted-foreground">
                      Hora ordinaria: $10,000<br />
                      Con recargo 75%: $17,500
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium text-red-700">Ejemplo Nocturno + Festivo:</p>
                    <p className="text-sm text-muted-foreground">
                      Hora ordinaria: $10,000<br />
                      Con recargo 110%: $21,000
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Horas Extras */}
        <TabsContent value="extras" className="space-y-6">
          <div className="space-y-6">
            {/* Método de Cálculo */}
            <Card>
              <CardHeader className="bg-violet-50 dark:bg-violet-950">
                <CardTitle className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
                  <Calculator className="h-5 w-5" />
                  Método de Cálculo de Horas Extras
                </CardTitle>
                <CardDescription>
                  Define cuándo una hora trabajada se convierte en hora extra
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* SEMANAL option */}
                  <button
                    type="button"
                    onClick={() => setConfiguracion(prev => ({ ...prev, tipoCalculoHorasExtras: 'SEMANAL' }))}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      configuracion.tipoCalculoHorasExtras === 'SEMANAL'
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/60'
                        : 'border-gray-200 hover:border-violet-300 bg-white dark:bg-gray-900'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 bg-violet-100 dark:bg-violet-900 rounded-lg">
                        <Clock className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                      </div>
                      {configuracion.tipoCalculoHorasExtras === 'SEMANAL' && (
                        <CheckCircle2 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                      )}
                    </div>
                    <p className="font-semibold text-sm mb-1">Cálculo Semanal</p>
                    <p className="text-xs text-muted-foreground">
                      Las extras se generan cuando el empleado supera las <strong>{configuracion.horasSemanalesMaximas}h</strong> acumuladas en la semana (dom–sáb). Comportamiento actual del sistema.
                    </p>
                    <div className="mt-3">
                      <Badge variant="outline" className="text-[10px] border-violet-300 text-violet-700">Art. 161 CST</Badge>
                    </div>
                  </button>

                  {/* DIARIO option */}
                  <button
                    type="button"
                    onClick={() => setConfiguracion(prev => ({ ...prev, tipoCalculoHorasExtras: 'DIARIO' }))}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      configuracion.tipoCalculoHorasExtras === 'DIARIO'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60'
                        : 'border-gray-200 hover:border-emerald-300 bg-white dark:bg-gray-900'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
                        <CalendarDays className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      {configuracion.tipoCalculoHorasExtras === 'DIARIO' && (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>
                    <p className="font-semibold text-sm mb-1">Cálculo Diario</p>
                    <p className="text-xs text-muted-foreground">
                      Las horas que excedan <strong>{configuracion.horasDiariasEstandar}h</strong> en un mismo día se convierten en extras de inmediato, sin esperar al cierre semanal.
                    </p>
                    <div className="mt-3">
                      <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700">Nuevo</Badge>
                    </div>
                  </button>
                </div>

                <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Este parámetro afecta todos los cálculos de nómina futuros. Los períodos ya calculados y cerrados mantienen su resultado original sin cambios.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Horas Extras */}
            <Card>
              <CardHeader className="bg-orange-50 dark:bg-orange-950">
                <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                  <Sun className="h-5 w-5" />
                  Horas Extras - Arts. 159 y 168 CST
                </CardTitle>
                <CardDescription>
                  Porcentajes para trabajo adicional a la jornada
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-100 rounded-full">
                        <Sun className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="font-medium">Extra Diurna Ordinaria</p>
                        <p className="text-sm text-muted-foreground">Lunes a sábado, 6am - 7pm</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={configuracion.porcentajeExtraDiurna}
                        onChange={(e) => setConfiguracion({ ...configuracion, porcentajeExtraDiurna: parseInt(e.target.value) })}
                        className="w-20 text-right font-bold"
                      />
                      <span className="text-lg font-bold">%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-full">
                        <Moon className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">Extra Nocturna Ordinaria</p>
                        <p className="text-sm text-muted-foreground">Lunes a sábado, 7pm - 6am</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={configuracion.porcentajeExtraNocturna}
                        onChange={(e) => setConfiguracion({ ...configuracion, porcentajeExtraNocturna: parseInt(e.target.value) })}
                        className="w-20 text-right font-bold"
                      />
                      <span className="text-lg font-bold">%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-full">
                        <Sun className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium">Extra Diurna Festiva</p>
                        <p className="text-sm text-muted-foreground">Domingos/Festivos, 6am - 7pm</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={configuracion.porcentajeExtraDiurnaFestiva}
                        onChange={(e) => setConfiguracion({ ...configuracion, porcentajeExtraDiurnaFestiva: parseInt(e.target.value) })}
                        className="w-20 text-right font-bold"
                      />
                      <span className="text-lg font-bold">%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-full">
                        <Moon className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium">Extra Nocturna Festiva</p>
                        <p className="text-sm text-muted-foreground">Domingos/Festivos, 7pm - 6am</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={configuracion.porcentajeExtraNocturnaFestiva}
                        onChange={(e) => setConfiguracion({ ...configuracion, porcentajeExtraNocturnaFestiva: parseInt(e.target.value) })}
                        className="w-20 text-right font-bold"
                      />
                      <span className="text-lg font-bold">%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Información */}
            <Card>
              <CardHeader>
                <CardTitle>Reglas de Horas Extras</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="font-medium text-yellow-800 mb-2">Art. 159 CST</p>
                  <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                    <li>Máximo 2 horas extras diarias</li>
                    <li>Máximo 12 horas extras semanales</li>
                    <li>No pueden exceder el tope semanal</li>
                  </ul>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="font-medium text-orange-800 mb-2">Cálculo de Extras</p>
                  <p className="text-sm text-orange-700">
                    Las horas extras se calculan sobre el valor de la hora ordinaria
                    más el porcentaje correspondiente. Ejemplo: si la hora vale $10,000
                    y el recargo es 25%, el valor sería $12,500.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          </div>
        </TabsContent>

        {/* Tab: Tipos de Turno */}
        <TabsContent value="turnos" className="space-y-6">
          <Card>
            <CardHeader className="bg-green-50 dark:bg-green-950">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <Briefcase className="h-5 w-5" />
                    Tipos de Turno y Horarios
                  </CardTitle>
                  <CardDescription>
                    Configura los turnos disponibles para programación (Día, Noche, 24h, etc.)
                  </CardDescription>
                </div>
                <Button onClick={agregarConceptoTurno} className="bg-green-600 hover:bg-green-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Turno
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {conceptosTurno.length === 0 && (
                  <div className="text-center p-8 bg-gray-50 rounded-lg">
                    <p className="text-muted-foreground">
                      No hay turnos configurados. Haz clic en "Agregar Turno" para crear uno.
                    </p>
                  </div>
                )}

                {conceptosTurno.map((concepto, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: concepto.color }}
                        >
                          {concepto.codigo.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{concepto.nombre}</p>
                            <Badge variant="outline" className="uppercase text-[10px] tracking-[0.2em]">
                              {concepto.tipoTurno === "DIURNO" ? "Día" : concepto.tipoTurno === "NOCTURNO" ? "Noche" : concepto.tipoTurno === "24H" ? "24h" : "Personalizado"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">Código: {concepto.codigo}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={concepto.estaActivo}
                          onCheckedChange={(checked) => actualizarConcepto(index, 'estaActivo', checked)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => eliminarConcepto(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Tipo de Turno</Label>
                        <Select value={concepto.tipoTurno} onValueChange={(value) => actualizarConcepto(index, 'tipoTurno', value)}>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Selecciona tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DIURNO">Día</SelectItem>
                            <SelectItem value="NOCTURNO">Noche</SelectItem>
                            <SelectItem value="24H">24 Horas</SelectItem>
                            <SelectItem value="PERSONALIZADO">Personalizado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Nombre</Label>
                        <Input
                          value={concepto.nombre}
                          onChange={(e) => actualizarConcepto(index, 'nombre', e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Hora Inicio</Label>
                        <Input
                          type="time"
                          value={concepto.horaInicioDefecto}
                          onChange={(e) => actualizarConcepto(index, 'horaInicioDefecto', e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Hora Fin</Label>
                        <Input
                          type="time"
                          value={concepto.horaFinDefecto}
                          onChange={(e) => actualizarConcepto(index, 'horaFinDefecto', e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Horas Fijas</Label>
                        <Input
                          type="number"
                          value={concepto.horasFijas}
                          onChange={(e) => actualizarConcepto(index, 'horasFijas', parseFloat(e.target.value))}
                          className="h-8"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={concepto.cruzaMedianoche}
                          onCheckedChange={(checked) => actualizarConcepto(index, 'cruzaMedianoche', checked)}
                        />
                        <Label className="text-sm">Cruza medianoche</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        {coloresPredefinidos.map((c) => (
                          <button
                            key={c.color}
                            onClick={() => actualizarConcepto(index, 'color', c.color)}
                            className={`w-6 h-6 rounded-full border-2 ${concepto.color === c.color ? 'border-gray-800' : 'border-transparent'}`}
                            style={{ backgroundColor: c.color }}
                            title={c.nombre}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Turnos Predefinidos Sugeridos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Turnos Sugeridos</CardTitle>
              <CardDescription>
                Configuraciones recomendadas según la práctica laboral colombiana
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setConceptosTurno([...conceptosTurno, construirConceptoTurnoPredeterminado("DIURNO") as ConceptoTurno])}
                  className="text-left p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                >
                  <p className="font-medium text-blue-800">Turno Día (D)</p>
                  <p className="text-sm text-blue-700">7:00 - 19:00 (12h)</p>
                </button>
                <button
                  type="button"
                  onClick={() => setConceptosTurno([...conceptosTurno, construirConceptoTurnoPredeterminado("NOCTURNO") as ConceptoTurno])}
                  className="text-left p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition"
                >
                  <p className="font-medium text-purple-800">Turno Noche (N)</p>
                  <p className="text-sm text-purple-700">19:00 - 7:00 (12h)</p>
                </button>
                <button
                  type="button"
                  onClick={() => setConceptosTurno([...conceptosTurno, construirConceptoTurnoPredeterminado("24H") as ConceptoTurno])}
                  className="text-left p-3 bg-green-50 rounded-lg hover:bg-green-100 transition"
                >
                  <p className="font-medium text-green-800">24 Horas (24)</p>
                  <p className="text-sm text-green-700">7:00 - 7:00 siguiente (24h)</p>
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
