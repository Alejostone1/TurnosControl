"use client"

import React, { useState, useEffect, useCallback, type ElementType } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  ShieldCheck, ChevronLeft, ChevronRight, RotateCcw, Search,
  Filter, ChevronDown, ChevronRight as ChevronRightIcon,
  Activity, AlertTriangle, Database, Clock, User, UserCheck,
  Monitor, Globe, Layers, FileText, Shield, Zap,
  CalendarDays, Eye,
} from "lucide-react"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Actor {
  id: string; nombres: string; apellidos: string; correo: string; rol?: string
}

interface RegistroAuditoria {
  id: string
  accion: string
  modulo: string | null
  entidad: string
  entidadId: string
  descripcion: string | null
  accionDetallada: string | null
  severidad: string
  esMasiva: boolean
  esAutomatico: boolean
  requiereRevision: boolean
  ipAddress: string | null
  userAgent: string | null
  valorAntes: Record<string, unknown> | null
  valorDespues: Record<string, unknown> | null
  creadoEn: string
  usuario?: Actor
  auxiliar?: Actor
}

interface Stats { accionesHoy: number; eventosCriticos7d: number; totalRegistros: number }

// ─── Config maps ──────────────────────────────────────────────────────────────

const SEVERIDAD_CFG: Record<string, { label: string; dot: string; badge: string }> = {
  INFO:    { label: "Info",     dot: "bg-slate-400",   badge: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300" },
  BAJO:    { label: "Bajo",     dot: "bg-blue-400",    badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300" },
  MEDIO:   { label: "Medio",   dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300" },
  ALTO:    { label: "Alto",    dot: "bg-orange-500",  badge: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300" },
  CRITICO: { label: "Crítico", dot: "bg-red-500",     badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300" },
}

const ACCION_CFG: Record<string, { label: string; color: string }> = {
  CREAR:          { label: "Crear",          color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300" },
  ACTUALIZAR:     { label: "Actualizar",     color: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300" },
  ELIMINAR:       { label: "Eliminar",       color: "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300" },
  DESACTIVAR:     { label: "Desactivar",     color: "bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-300" },
  ACTIVAR:        { label: "Activar",        color: "bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300" },
  CALCULAR:       { label: "Calcular",       color: "bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-300" },
  RECALCULAR:     { label: "Recalcular",     color: "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300" },
  CONFIRMAR:      { label: "Confirmar",      color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300" },
  APROBAR:        { label: "Aprobar",        color: "bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-300" },
  CERRAR:         { label: "Cerrar",         color: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300" },
  ASIGNAR:        { label: "Asignar",        color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-300" },
  DESASIGNAR:     { label: "Desasignar",     color: "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300" },
  EXPORTAR:       { label: "Exportar",       color: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300" },
  IMPORTAR:       { label: "Importar",       color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300" },
  CONFIGURAR:     { label: "Configurar",     color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-300" },
  INICIAR_SESION: { label: "Login",          color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  CERRAR_SESION:  { label: "Logout",         color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  LOGIN_FALLIDO:  { label: "Login fallido",  color: "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300" },
  LEER:           { label: "Leer",           color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  RESTAURAR:      { label: "Restaurar",      color: "bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300" },
}

const MODULO_CFG: Record<string, { label: string; icon: ElementType; color: string; bg: string }> = {
  EMPLEADOS:      { label: "Empleados",      icon: User,       color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-950/60" },
  NOMINA:         { label: "Nómina",         icon: FileText,   color: "text-emerald-600",bg: "bg-emerald-50 dark:bg-emerald-950/60" },
  TURNOS:         { label: "Turnos",         icon: Layers,     color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/60" },
  SEGURIDAD:      { label: "Seguridad",      icon: Shield,     color: "text-red-600",    bg: "bg-red-50 dark:bg-red-950/60" },
  CONFIGURACION:  { label: "Configuración",  icon: Zap,        color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-950/60" },
  SISTEMA:        { label: "Sistema",        icon: Monitor,    color: "text-slate-600",  bg: "bg-slate-100 dark:bg-slate-800" },
}

const ACCIONES_LIST = [
  "CREAR","ACTUALIZAR","ELIMINAR","DESACTIVAR","ACTIVAR",
  "CALCULAR","RECALCULAR","CONFIRMAR","APROBAR","CERRAR",
  "ASIGNAR","DESASIGNAR","EXPORTAR","IMPORTAR","CONFIGURAR",
  "INICIAR_SESION","CERRAR_SESION","LOGIN_FALLIDO","RESTAURAR","LEER",
]
const MODULOS_LIST  = ["EMPLEADOS","NOMINA","TURNOS","SEGURIDAD","CONFIGURACION","SISTEMA"]
const SEVERIDADES   = ["INFO","BAJO","MEDIO","ALTO","CRITICO"]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(d: string) {
  return new Date(d).toLocaleString("es-CO", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  })
}

function fmtShort(d: string) {
  return new Date(d).toLocaleString("es-CO", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

function actorInfo(r: RegistroAuditoria) {
  if (r.usuario)  return { nombre: `${r.usuario.nombres} ${r.usuario.apellidos}`, tipo: r.usuario.rol ?? "Admin", correo: r.usuario.correo }
  if (r.auxiliar) return { nombre: `${r.auxiliar.nombres} ${r.auxiliar.apellidos}`, tipo: "Auxiliar", correo: r.auxiliar.correo }
  return { nombre: "Sistema", tipo: "Sistema", correo: "" }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SeveridadBadge({ s }: { s: string }) {
  const cfg = SEVERIDAD_CFG[s] ?? SEVERIDAD_CFG.INFO
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function AccionBadge({ a }: { a: string }) {
  const cfg = ACCION_CFG[a] ?? { label: a, color: "bg-gray-100 text-gray-700" }
  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

function ModuloBadge({ m }: { m: string | null }) {
  if (!m) return <span className="text-muted-foreground text-xs">—</span>
  const cfg = MODULO_CFG[m] ?? { label: m, icon: Database, color: "text-slate-600", bg: "bg-slate-100" }
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
      <Icon className="h-2.5 w-2.5" />{cfg.label}
    </span>
  )
}

// ─── JSON Diff Viewer ─────────────────────────────────────────────────────────

function JsonDiff({ before, after }: { before: Record<string, unknown> | null; after: Record<string, unknown> | null }) {
  if (!before && !after) return null

  const allKeys = Array.from(new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after  ?? {}),
  ]))

  if (before && after) {
    const changed = allKeys.filter(k => JSON.stringify(before[k]) !== JSON.stringify(after[k]))
    if (!changed.length) return (
      <p className="text-xs text-muted-foreground italic">Sin cambios detectados en los valores registrados.</p>
    )
    return (
      <div className="space-y-1">
        {changed.map(k => (
          <div key={k} className="grid grid-cols-[120px_1fr_1fr] gap-2 items-start text-xs font-mono">
            <span className="text-muted-foreground font-sans truncate pt-0.5">{k}</span>
            <span className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 rounded px-2 py-0.5 truncate">
              {JSON.stringify(before[k])}
            </span>
            <span className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 rounded px-2 py-0.5 truncate">
              {JSON.stringify(after[k])}
            </span>
          </div>
        ))}
      </div>
    )
  }

  const data = before ?? after
  const isAdded = !before
  return (
    <div className="space-y-1">
      {Object.entries(data ?? {}).map(([k, v]) => (
        <div key={k} className="grid grid-cols-[120px_1fr] gap-2 items-start text-xs font-mono">
          <span className="text-muted-foreground font-sans truncate pt-0.5">{k}</span>
          <span className={`rounded px-2 py-0.5 truncate ${
            isAdded
              ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400"
              : "bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400"
          }`}>
            {JSON.stringify(v)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Row expanded detail ──────────────────────────────────────────────────────

function RowDetail({ r }: { r: RegistroAuditoria }) {
  const hasDiff = r.valorAntes || r.valorDespues
  return (
    <div className="px-4 py-4 bg-muted/30 border-t border-border/50 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Metadata */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Detalles del evento</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex gap-2">
              <span className="text-muted-foreground w-24 shrink-0">ID registro</span>
              <span className="font-mono text-[11px] text-muted-foreground truncate">{r.id}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-24 shrink-0">Entidad ID</span>
              <span className="font-mono text-[11px] truncate">{r.entidadId}</span>
            </div>
            {r.accionDetallada && (
              <div className="flex gap-2">
                <span className="text-muted-foreground w-24 shrink-0">Detalle</span>
                <span className="font-medium">{r.accionDetallada}</span>
              </div>
            )}
            <div className="flex gap-2">
              <span className="text-muted-foreground w-24 shrink-0">Fecha exacta</span>
              <span>{fmt(r.creadoEn)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {r.esMasiva && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300">
                Acción masiva
              </span>
            )}
            {r.esAutomatico && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                Automático
              </span>
            )}
            {r.requiereRevision && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                Requiere revisión
              </span>
            )}
          </div>
        </div>

        {/* Technical info */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Contexto técnico</p>
          <div className="space-y-1.5 text-xs">
            {r.ipAddress && (
              <div className="flex items-center gap-2">
                <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="font-mono">{r.ipAddress}</span>
              </div>
            )}
            {r.userAgent && (
              <div className="flex items-start gap-2">
                <Monitor className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-muted-foreground line-clamp-3 break-all">{r.userAgent}</span>
              </div>
            )}
            {!r.ipAddress && !r.userAgent && (
              <p className="text-muted-foreground italic">Sin datos de sesión registrados</p>
            )}
          </div>
        </div>

        {/* Diff header label */}
        {hasDiff && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Leyenda</p>
            <div className="space-y-1.5 text-xs">
              {r.valorAntes && r.valorDespues && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-red-200 dark:bg-red-900 shrink-0" />
                    <span className="text-muted-foreground">Valor anterior</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-emerald-200 dark:bg-emerald-900 shrink-0" />
                    <span className="text-muted-foreground">Valor nuevo</span>
                  </div>
                </>
              )}
              {r.valorAntes && !r.valorDespues && (
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-red-200 dark:bg-red-900 shrink-0" />
                  <span className="text-muted-foreground">Valores eliminados</span>
                </div>
              )}
              {!r.valorAntes && r.valorDespues && (
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-emerald-200 dark:bg-emerald-900 shrink-0" />
                  <span className="text-muted-foreground">Valores creados</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Diff view */}
      {hasDiff && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Comparativa de cambios
            {r.valorAntes && r.valorDespues && (
              <span className="ml-2 font-normal normal-case text-muted-foreground/70">
                Campo · <span className="text-red-600 dark:text-red-400">Antes</span> · <span className="text-emerald-600 dark:text-emerald-400">Después</span>
              </span>
            )}
          </p>
          <div className="rounded-lg border border-border/60 bg-background p-3 overflow-x-auto">
            <JsonDiff before={r.valorAntes} after={r.valorDespues} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, bg, iconColor, valueColor, note,
}: {
  icon: ElementType; label: string; value: number | string; bg: string; iconColor: string; valueColor?: string; note?: string
}) {
  return (
    <Card className="border border-border/60">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${valueColor ?? ""}`}>{value}</p>
            {note && <p className="text-[11px] text-muted-foreground mt-0.5">{note}</p>}
          </div>
          <span className={`p-2 rounded-lg ${bg}`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AuditoriaPage() {
  const [registros, setRegistros]   = useState<RegistroAuditoria[]>([])
  const [loading, setLoading]       = useState(true)
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [expanded, setExpanded]     = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(true)
  const [stats, setStats]           = useState<Stats>({ accionesHoy: 0, eventosCriticos7d: 0, totalRegistros: 0 })
  const [actores, setActores]       = useState<{ auxiliares: Actor[]; usuarios: Actor[] }>({ auxiliares: [], usuarios: [] })

  const limit = 25

  const [filters, setFilters] = useState({
    busqueda:   "",
    usuarioId:  "",
    auxiliarId: "",
    actorTipo:  "", // "admin" | "auxiliar"
    accion:     "",
    modulo:     "",
    severidad:  "",
    entidad:    "",
    desde:      "",
    hasta:      "",
  })

  const buildQuery = useCallback((p: number) => {
    const q = new URLSearchParams({ page: String(p), limit: String(limit) })
    if (filters.busqueda)   q.set("busqueda",   filters.busqueda)
    if (filters.usuarioId && filters.usuarioId !== "all")  q.set("usuarioId",  filters.usuarioId)
    if (filters.auxiliarId && filters.auxiliarId !== "all") q.set("auxiliarId", filters.auxiliarId)
    if (filters.accion && filters.accion !== "all")     q.set("accion",     filters.accion)
    if (filters.modulo && filters.modulo !== "all")     q.set("modulo",     filters.modulo)
    if (filters.severidad && filters.severidad !== "all") q.set("severidad",  filters.severidad)
    if (filters.entidad)    q.set("entidad",    filters.entidad)
    if (filters.desde)      q.set("desde",      filters.desde)
    if (filters.hasta)      q.set("hasta",      filters.hasta)
    return q.toString()
  }, [filters])

  const fetchData = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/auditoria?${buildQuery(p)}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setRegistros(data.registros ?? [])
      setTotal(data.total ?? 0)
      if (data.stats) setStats(data.stats)
      if (data.auxiliares || data.usuarios) {
        setActores({ auxiliares: data.auxiliares ?? [], usuarios: data.usuarios ?? [] })
      }
    } catch {
      toast.error("Error al cargar auditoría")
    } finally {
      setLoading(false)
    }
  }, [buildQuery])

  useEffect(() => { fetchData(page) }, [page])

  const applyFilters = () => { setPage(1); fetchData(1) }
  const clearFilters = () => {
    setFilters({ busqueda: "", usuarioId: "", auxiliarId: "", actorTipo: "", accion: "", modulo: "", severidad: "", entidad: "", desde: "", hasta: "" })
    setPage(1)
  }

  const toggleRow = (id: string) =>
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const activeFiltersCount = Object.values(filters).filter(v => v && v !== "all").length
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800">
            <ShieldCheck className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Registro de Auditoría</h1>
            <p className="text-sm text-muted-foreground">Trazabilidad completa de todas las operaciones del sistema</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs gap-1.5 px-3 py-1">
          <Database className="h-3 w-3" />
          {stats.totalRegistros.toLocaleString()} registros totales
        </Badge>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={Activity}       label="Acciones hoy"       value={stats.accionesHoy}      bg="bg-teal-50 dark:bg-teal-950/60"   iconColor="text-teal-600"   valueColor="text-teal-600 dark:text-teal-400" note="en las últimas 24h" />
        <KpiCard icon={AlertTriangle}  label="Eventos críticos"   value={stats.eventosCriticos7d} bg="bg-red-50 dark:bg-red-950/60"    iconColor="text-red-600"    valueColor="text-red-600 dark:text-red-400"  note="últimos 7 días (ALTO+CRÍTICO)" />
        <KpiCard icon={Database}       label="Total registros"    value={stats.totalRegistros.toLocaleString()} bg="bg-blue-50 dark:bg-blue-950/60" iconColor="text-blue-600" note="en el historial completo" />
        <KpiCard icon={Eye}            label="Mostrando ahora"    value={total.toLocaleString()}  bg="bg-violet-50 dark:bg-violet-950/60" iconColor="text-violet-600" note={activeFiltersCount > 0 ? `${activeFiltersCount} filtro${activeFiltersCount !== 1 ? 's' : ''} activo${activeFiltersCount !== 1 ? 's' : ''}` : "sin filtros activos"} />
      </div>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <Card className="border border-border/60">
        <CardHeader className="p-4 pb-0">
          <button
            className="flex items-center justify-between w-full"
            onClick={() => setShowFilters(f => !f)}
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Filtros avanzados</span>
              {activeFiltersCount > 0 && (
                <Badge className="h-5 px-1.5 text-[10px] bg-primary text-primary-foreground">
                  {activeFiltersCount}
                </Badge>
              )}
            </div>
            {showFilters ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />}
          </button>
        </CardHeader>

        {showFilters && (
          <CardContent className="p-4 pt-3 space-y-4">
            {/* Row 1: search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar en descripción, acción detallada o módulo…"
                value={filters.busqueda}
                onChange={e => setFilters(p => ({ ...p, busqueda: e.target.value }))}
                className="pl-9"
                onKeyDown={e => e.key === "Enter" && applyFilters()}
              />
            </div>

            {/* Row 2: actor filters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <FilterField label="Administrador">
                <Select value={filters.usuarioId} onValueChange={v => setFilters(p => ({ ...p, usuarioId: v, auxiliarId: "" }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {actores.usuarios.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.nombres} {u.apellidos}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label="Auxiliar">
                <Select value={filters.auxiliarId} onValueChange={v => setFilters(p => ({ ...p, auxiliarId: v, usuarioId: "" }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {actores.auxiliares.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.nombres} {a.apellidos}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label="Acción">
                <Select value={filters.accion} onValueChange={v => setFilters(p => ({ ...p, accion: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {ACCIONES_LIST.map(a => (
                      <SelectItem key={a} value={a}>{ACCION_CFG[a]?.label ?? a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label="Módulo">
                <Select value={filters.modulo} onValueChange={v => setFilters(p => ({ ...p, modulo: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {MODULOS_LIST.map(m => (
                      <SelectItem key={m} value={m}>{MODULO_CFG[m]?.label ?? m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
            </div>

            {/* Row 3: severity + entidad + dates */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <FilterField label="Severidad">
                <Select value={filters.severidad} onValueChange={v => setFilters(p => ({ ...p, severidad: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {SEVERIDADES.map(s => (
                      <SelectItem key={s} value={s}>{SEVERIDAD_CFG[s]?.label ?? s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label="Entidad">
                <Input
                  className="h-8 text-xs" placeholder="Ej: Empleado, PeriodoNomina"
                  value={filters.entidad}
                  onChange={e => setFilters(p => ({ ...p, entidad: e.target.value }))}
                />
              </FilterField>

              <FilterField label="Desde">
                <Input
                  type="date" className="h-8 text-xs"
                  value={filters.desde}
                  onChange={e => setFilters(p => ({ ...p, desde: e.target.value }))}
                />
              </FilterField>

              <FilterField label="Hasta">
                <Input
                  type="date" className="h-8 text-xs"
                  value={filters.hasta}
                  onChange={e => setFilters(p => ({ ...p, hasta: e.target.value }))}
                />
              </FilterField>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" onClick={applyFilters} className="gap-1.5">
                <Search className="h-3.5 w-3.5" /> Aplicar filtros
              </Button>
              {activeFiltersCount > 0 && (
                <Button size="sm" variant="ghost" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
                  <RotateCcw className="h-3.5 w-3.5" /> Limpiar
                </Button>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── Results summary ─────────────────────────────────────── */}
      {!loading && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{total.toLocaleString()}</span> registros encontrados
            {activeFiltersCount > 0 && <span className="ml-1">con los filtros aplicados</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            Página {page} de {totalPages || 1} · {limit} por página
          </p>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────── */}
      {loading ? (
        <Card className="border border-border/60">
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </Card>
      ) : registros.length === 0 ? (
        <Card className="border-2 border-dashed border-border/50">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <ShieldCheck className="h-12 w-12 mb-4 text-muted-foreground/25" />
            <p className="font-semibold text-muted-foreground">Sin registros de auditoría</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              {activeFiltersCount > 0
                ? "No hay eventos que coincidan con los filtros aplicados."
                : "Las operaciones del sistema aparecerán aquí automáticamente."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-border/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40">
                  {["", "Fecha y hora", "Actor", "Módulo", "Acción", "Severidad", "Descripción"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registros.map(r => {
                  const actor = actorInfo(r)
                  const isOpen = expanded.has(r.id)
                  const sev = SEVERIDAD_CFG[r.severidad]
                  const isCritical = r.severidad === "CRITICO" || r.severidad === "ALTO"

                  return (
                    <React.Fragment key={r.id}>
                      <tr
                        className={`border-b border-border/30 cursor-pointer transition-colors ${
                          isOpen ? "bg-muted/40" : isCritical ? "hover:bg-red-50/30 dark:hover:bg-red-950/10" : "hover:bg-muted/20"
                        } ${isCritical && !isOpen ? "border-l-2 border-l-orange-400" : ""}`}
                        onClick={() => toggleRow(r.id)}
                      >
                        {/* Expand toggle */}
                        <td className="pl-4 pr-1 py-3 w-6">
                          <span className="text-muted-foreground">
                            {isOpen
                              ? <ChevronDown className="h-3.5 w-3.5" />
                              : <ChevronRightIcon className="h-3.5 w-3.5" />
                            }
                          </span>
                        </td>

                        {/* Timestamp */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sev?.dot ?? "bg-slate-400"}`} />
                            <div>
                              <p className="text-xs font-medium">{fmtShort(r.creadoEn)}</p>
                              {(r.esMasiva || r.requiereRevision) && (
                                <div className="flex gap-1 mt-0.5">
                                  {r.esMasiva && <span className="text-[9px] font-bold text-violet-600 dark:text-violet-400">MASIVA</span>}
                                  {r.requiereRevision && <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">REVISIÓN</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Actor */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="p-1 bg-muted rounded-md shrink-0">
                              {r.usuario ? <UserCheck className="h-3 w-3 text-muted-foreground" /> : <User className="h-3 w-3 text-muted-foreground" />}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate max-w-[120px]">{actor.nombre}</p>
                              <p className="text-[10px] text-muted-foreground">{actor.tipo}</p>
                            </div>
                          </div>
                        </td>

                        {/* Módulo */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <ModuloBadge m={r.modulo} />
                        </td>

                        {/* Acción */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <AccionBadge a={r.accion} />
                        </td>

                        {/* Severidad */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <SeveridadBadge s={r.severidad} />
                        </td>

                        {/* Descripción */}
                        <td className="px-3 py-3 max-w-[280px]">
                          <p className="text-xs truncate">{r.descripcion || r.entidad || "—"}</p>
                          {r.accionDetallada && r.accionDetallada !== r.descripcion && (
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{r.accionDetallada}</p>
                          )}
                        </td>
                      </tr>

                      {/* Expanded detail */}
                      {isOpen && (
                        <tr>
                          <td colSpan={7} className="p-0">
                            <RowDetail r={r} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Pagination ──────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-sm text-muted-foreground">
            Página <span className="font-semibold">{page}</span> de <span className="font-semibold">{totalPages}</span>
            {" "}· {total.toLocaleString()} registros
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            {/* Page numbers (compact) */}
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i
                if (p < 1 || p > totalPages) return null
                return (
                  <Button
                    key={p} size="sm" variant={p === page ? "default" : "outline"}
                    className="w-8 p-0 text-xs"
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                )
              })}
            </div>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              Siguiente <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Small helper ─────────────────────────────────────────────────────────────
function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}
