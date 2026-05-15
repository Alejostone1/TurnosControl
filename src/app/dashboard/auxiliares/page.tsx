'use client'

import { useState, useEffect, useMemo, type ElementType } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Plus, Search, Eye, Edit, Trash2, Users, ChevronLeft, ChevronRight,
  LayoutGrid, List, Mail, Phone, Hash, Calendar, TrendingUp, CheckCircle2, XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Auxiliar {
  id: string
  correo: string
  nombres: string
  apellidos: string
  documento?: string
  telefono?: string
  estaActivo: boolean
  creadoEn: string
  _count: { empleadosCreados: number }
}

type ViewMode    = 'grid' | 'list'
type StatusFilter = 'all' | 'active' | 'inactive'

const PAGE_SIZE = 9

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function AuxiliaresPage() {
  const [auxiliares, setAuxiliares] = useState<Auxiliar[]>([])
  const [loading, setLoading]       = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage]             = useState(1)
  const [viewMode, setViewMode]     = useState<ViewMode>('grid')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => { fetchAuxiliares() }, [])

  const fetchAuxiliares = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/auxiliares')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAuxiliares(Array.isArray(data) ? data : data.auxiliares)
    } catch {
      toast.error('Error al cargar auxiliares')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Desactivar a ${nombre}? Podrá reactivarlo más adelante.`)) return
    try {
      const res = await fetch(`/api/auxiliares/${id}`, { method: 'DELETE' })
      if (res.ok) { toast.success('Auxiliar desactivado'); fetchAuxiliares() }
      else { const e = await res.json(); toast.error(e.error || 'Error al desactivar') }
    } catch { toast.error('Error de conexión') }
  }

  const filtered = useMemo(() =>
    auxiliares.filter(a => {
      const matchSearch =
        `${a.nombres} ${a.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.correo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.documento || '').includes(searchTerm)
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active'   &&  a.estaActivo) ||
        (statusFilter === 'inactive' && !a.estaActivo)
      return matchSearch && matchStatus
    }), [auxiliares, searchTerm, statusFilter])

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  const totalPages    = Math.ceil(filtered.length / PAGE_SIZE)
  const totalActivos  = auxiliares.filter(a => a.estaActivo).length
  const totalInactivos = auxiliares.length - totalActivos
  const totalEmpleados = auxiliares.reduce((s, a) => s + a._count.empleadosCreados, 0)

  useEffect(() => { setPage(1) }, [searchTerm, statusFilter])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Auxiliares</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Administración del equipo de auxiliares del sistema
          </p>
        </div>
        <Link href="/dashboard/auxiliares/new">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Nuevo Auxiliar
          </Button>
        </Link>
      </div>

      {/* ── KPI Stats ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total auxiliares',      value: auxiliares.length, icon: Users,         color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-950/60' },
          { label: 'Activos',               value: totalActivos,      icon: CheckCircle2,  color: 'text-emerald-600',bg: 'bg-emerald-50 dark:bg-emerald-950/60' },
          { label: 'Inactivos',             value: totalInactivos,    icon: XCircle,       color: 'text-slate-400',  bg: 'bg-slate-100 dark:bg-slate-800' },
          { label: 'Empleados registrados', value: totalEmpleados,    icon: TrendingUp,    color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/60' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border border-border/60">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide leading-none mb-1.5">
                    {label}
                  </p>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
                <div className={`p-2 rounded-lg ${bg}`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Filters + View Toggle ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, correo o documento…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          {/* Status filter pills */}
          <div className="flex gap-1 bg-muted rounded-lg p-1 h-10">
            {(['all', 'active', 'inactive'] as StatusFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  statusFilter === f
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Inactivos'}
              </button>
            ))}
          </div>
        </div>
        {/* View mode toggle */}
        <div className="flex gap-1 bg-muted rounded-lg p-1 h-10">
          <button
            onClick={() => setViewMode('grid')}
            title="Vista en tarjetas"
            className={`px-2.5 rounded-md transition-all ${
              viewMode === 'grid'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            title="Vista en lista"
            className={`px-2.5 rounded-md transition-all ${
              viewMode === 'list'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Results summary */}
      {(searchTerm || statusFilter !== 'all') && (
        <p className="text-xs text-muted-foreground -mt-3">
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} de {auxiliares.length} auxiliares
        </p>
      )}

      {/* ── Content ─────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState hasFilters={!!(searchTerm || statusFilter !== 'all')} />
      ) : viewMode === 'grid' ? (
        <GridView auxiliares={paginated} onDelete={handleDelete} />
      ) : (
        <ListView auxiliares={paginated} onDelete={handleDelete} />
      )}

      {/* ── Pagination ──────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-sm text-muted-foreground">
            Página {page} de {totalPages} &middot; <span className="font-medium">{filtered.length}</span> auxiliares
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              Siguiente <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="text-center py-20 border-2 border-dashed rounded-xl">
      <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/25" />
      <p className="font-semibold text-muted-foreground">
        {hasFilters ? 'Sin resultados' : 'No hay auxiliares registrados'}
      </p>
      <p className="text-sm text-muted-foreground/60 mt-1">
        {hasFilters
          ? 'Intenta con otro término o ajusta los filtros'
          : 'Crea el primer auxiliar para comenzar'}
      </p>
    </div>
  )
}

// ─── Grid View ────────────────────────────────────────────────────────────────
function GridView({
  auxiliares,
  onDelete,
}: {
  auxiliares: Auxiliar[]
  onDelete: (id: string, name: string) => void
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {auxiliares.map(a => (
        <Card
          key={a.id}
          className="group border border-border/60 hover:border-border hover:shadow-md transition-all duration-200 overflow-hidden"
        >
          <CardContent className="p-0">
            {/* Status accent bar */}
            <div className={`h-1 w-full ${a.estaActivo ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />

            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-semibold text-sm leading-snug truncate">{a.nombres} {a.apellidos}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Auxiliar Administrativo</p>
                </div>
                <Badge
                  className={`text-[10px] shrink-0 ${
                    a.estaActivo
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {a.estaActivo ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>

              {/* Info rows */}
              <div className="space-y-2 mb-4">
                <InfoRow icon={Mail}     text={a.correo} />
                {a.documento && <InfoRow icon={Hash}     text={a.documento} mono />}
                {a.telefono  && <InfoRow icon={Phone}    text={a.telefono} />}
                <InfoRow icon={Calendar} text={`Desde ${formatDate(a.creadoEn)}`} />
              </div>

              {/* Metric strip */}
              <div className="flex items-center justify-between py-3 border-t border-border/50">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-xs">Empleados creados</span>
                </div>
                <span className="text-sm font-bold">{a._count.empleadosCreados}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-1.5 mt-3">
                <Link href={`/dashboard/auxiliares/${a.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5">
                    <Eye className="h-3.5 w-3.5" /> Ver ficha
                  </Button>
                </Link>
                <Link href={`/dashboard/auxiliares/${a.id}/edit`}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                </Link>
                <Button
                  variant="ghost" size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onDelete(a.id, `${a.nombres} ${a.apellidos}`)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function InfoRow({ icon: Icon, text, mono }: { icon: ElementType; text: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className={`truncate ${mono ? 'font-mono' : ''}`}>{text}</span>
    </div>
  )
}

// ─── List View ────────────────────────────────────────────────────────────────
function ListView({
  auxiliares,
  onDelete,
}: {
  auxiliares: Auxiliar[]
  onDelete: (id: string, name: string) => void
}) {
  return (
    <Card className="border border-border/60 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40">
              {['Auxiliar', 'Correo / Teléfono', 'Documento', 'Empleados', 'Estado', 'Ingreso', ''].map(h => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {auxiliares.map(a => (
              <tr key={a.id} className="hover:bg-muted/20 transition-colors group">
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <div>
                    <p className="text-sm font-semibold">{a.nombres} {a.apellidos}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Auxiliar Administrativo</p>
                  </div>
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <p className="text-sm">{a.correo}</p>
                  {a.telefono && <p className="text-xs text-muted-foreground mt-0.5">{a.telefono}</p>}
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  {a.documento
                    ? <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{a.documento}</span>
                    : <span className="text-muted-foreground">—</span>
                  }
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold">{a._count.empleadosCreados}</span>
                    <span className="text-xs text-muted-foreground">emp.</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <Badge
                    className={`text-[10px] ${
                      a.estaActivo
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {a.estaActivo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </td>
                <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(a.creadoEn)}
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <div className="flex items-center gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
                    <Link href={`/dashboard/auxiliares/${a.id}`}>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <Link href={`/dashboard/auxiliares/${a.id}/edit`}>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onDelete(a.id, `${a.nombres} ${a.apellidos}`)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
