'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Plus, Search, Edit, Trash2, Eye, Filter,
  Building2, Users, ChevronLeft, ChevronRight, LayoutList, LayoutGrid,
  User,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Empleado {
  id: string
  tipoDocumento: string
  numeroDocumento: string
  nombres: string
  apellidos: string
  centroCosto: string | null
  programa: string | null
  modalidad: string | null
  cargo: string | null
  fechaIngreso: string
  tipoVinculacion: string
  salarioBase: number
  tieneAuxilioTransporte: boolean
  tipoContrato: string
  horasSemanales: number
  estaActivo: boolean
  creadoEn: string
  auxiliarCreador?: { id: string; nombres: string; apellidos: string; correo: string }
  usuarioCreador?:  { id: string; nombres: string; apellidos: string; correo: string }
}

const PAGE_SIZE = 8

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount)
}

function creadorLabel(e: Empleado): string {
  if (e.usuarioCreador)  return `${e.usuarioCreador.nombres} ${e.usuarioCreador.apellidos}`
  if (e.auxiliarCreador) return `${e.auxiliarCreador.nombres} ${e.auxiliarCreador.apellidos}`
  return 'Sistema'
}

function creadorTipo(e: Empleado): string {
  if (e.usuarioCreador)  return 'Admin'
  if (e.auxiliarCreador) return 'Auxiliar'
  return ''
}

// ── Tarjeta individual de empleado ──────────────────────────────
function EmpleadoCard({ empleado, onDelete }: { empleado: Empleado; onDelete: (id: string, nombre: string) => void }) {
  const nombre = creadorLabel(empleado)
  const tipo   = creadorTipo(empleado)

  return (
    <Card className="group border border-border/60 hover:border-border hover:shadow-md transition-all duration-200 overflow-hidden">
      <CardContent className="p-0">
        {/* Status accent bar */}
        <div className={`h-1 w-full ${empleado.estaActivo ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">
                {empleado.nombres} {empleado.apellidos}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {empleado.cargo || 'Sin cargo asignado'}
              </p>
            </div>
            <Badge
              className={`text-[10px] px-1.5 py-0 shrink-0 ${
                empleado.estaActivo
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {empleado.estaActivo ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>

          {/* Info rows */}
          <div className="space-y-1.5 text-xs mb-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Documento</span>
              <span className="font-mono font-medium">{empleado.numeroDocumento}</span>
            </div>
            {empleado.centroCosto && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">C. Costo</span>
                <span className="font-medium truncate max-w-[120px] text-right">{empleado.centroCosto}</span>
              </div>
            )}
            {empleado.modalidad && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Modalidad</span>
                <span className="font-medium truncate max-w-[120px] text-right">{empleado.modalidad}</span>
              </div>
            )}
            {empleado.programa && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Programa</span>
                <span className="font-medium truncate max-w-[120px] text-right">{empleado.programa}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-0.5">
              <span className="text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" /> Creado por
              </span>
              <span className="font-medium truncate max-w-[130px] text-right">
                {nombre}{tipo ? <span className="text-muted-foreground font-normal"> · {tipo}</span> : null}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(empleado.salarioBase)}
            </p>
            <div className="flex gap-0.5">
              <Link href={`/dashboard/employees/${empleado.id}`}>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Link href={`/dashboard/employees/${empleado.id}/edit`}>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(empleado.id, `${empleado.nombres} ${empleado.apellidos}`)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Paginación ───────────────────────────────────────────────────
function Pagination({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between mt-6">
      <p className="text-sm text-muted-foreground">
        Página {page} de {totalPages} · {total} empleados
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => onChange(page + 1)}>
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────
export default function EmployeesPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading]     = useState(true)
  const [viewMode, setViewMode]   = useState<'grid' | 'list'>('grid')
  const [page, setPage]           = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    centroCosto: '', programa: '', tipoContrato: '', estado: 'todos',
  })

  useEffect(() => { fetchEmpleados() }, [])

  const fetchEmpleados = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/employees')
      if (!res.ok) throw new Error()
      setEmpleados(await res.json())
    } catch {
      toast.error('Error al cargar empleados')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar a ${nombre}? Esta acción se puede revertir.`)) return
    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' })
      if (res.ok) { toast.success('Empleado eliminado'); fetchEmpleados() }
      else { const e = await res.json(); toast.error(e.error || 'Error al eliminar') }
    } catch { toast.error('Error de conexión') }
  }

  const filtered = useMemo(() => {
    return empleados.filter(e => {
      const matchSearch = `${e.nombres} ${e.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.numeroDocumento.includes(searchTerm)
      const matchCentro   = !filters.centroCosto  || filters.centroCosto  === 'all' || e.centroCosto  === filters.centroCosto
      const matchPrograma = !filters.programa     || filters.programa     === 'all' || e.programa     === filters.programa
      const matchContrato = !filters.tipoContrato || filters.tipoContrato === 'all' || e.tipoContrato === filters.tipoContrato
      const matchEstado   = filters.estado === 'todos' || (filters.estado === 'activos' ? e.estaActivo : !e.estaActivo)
      return matchSearch && matchCentro && matchPrograma && matchContrato && matchEstado
    })
  }, [empleados, searchTerm, filters])

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  const uniqueValues = <K extends keyof Empleado>(key: K) =>
    Array.from(new Set(empleados.map(e => e[key]).filter(Boolean))).sort() as string[]

  const activeFiltersCount = Object.values(filters).filter(f => f && f !== 'todos' && f !== 'all').length

  // Resetear página al cambiar filtros/búsqueda
  useEffect(() => { setPage(1) }, [searchTerm, filters])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Empleados</h1>
          <p className="text-sm text-muted-foreground">Gestión del personal vinculado</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge className="ml-2 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
          <Link href="/dashboard/employees/new">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: empleados.length, icon: Users, color: 'text-blue-600' },
          { label: 'Activos', value: empleados.filter(e => e.estaActivo).length, icon: Users, color: 'text-green-600' },
          { label: 'C. Costo', value: uniqueValues('centroCosto').length, icon: Building2, color: 'text-purple-600' },
          { label: 'Programas', value: uniqueValues('programa').length, icon: Building2, color: 'text-orange-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{label}</p>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className="text-xl font-bold mt-1">{value}</p>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o documento…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filtros desplegables */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Centro de Costo</label>
              <Select value={filters.centroCosto} onValueChange={v => setFilters(p => ({ ...p, centroCosto: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueValues('centroCosto').map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Programa</label>
              <Select value={filters.programa} onValueChange={v => setFilters(p => ({ ...p, programa: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueValues('programa').map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tipo Contrato</label>
              <Select value={filters.tipoContrato} onValueChange={v => setFilters(p => ({ ...p, tipoContrato: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueValues('tipoContrato').map(v => <SelectItem key={v} value={v}>{v.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Estado</label>
              <Select value={filters.estado} onValueChange={v => setFilters(p => ({ ...p, estado: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="activos">Activos</SelectItem>
                  <SelectItem value="inactivos">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" className="mt-2 text-xs h-7" onClick={() => setFilters({ centroCosto: '', programa: '', tipoContrato: '', estado: 'todos' })}>
              Limpiar filtros
            </Button>
          )}
        </Card>
      )}

      {/* Toggle vista + contador */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length === empleados.length
            ? `${empleados.length} empleados`
            : `${filtered.length} de ${empleados.length} empleados`}
        </p>
        <div className="flex border rounded-md overflow-hidden">
          <button
            className={`px-2 py-1.5 ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'} transition-colors`}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            className={`px-2 py-1.5 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'} transition-colors`}
            onClick={() => setViewMode('list')}
          >
            <LayoutList className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">No se encontraron empleados</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Ajusta los filtros o crea un nuevo empleado</p>
        </div>
      ) : viewMode === 'grid' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginated.map(e => (
              <EmpleadoCard key={e.id} empleado={e} onDelete={handleDelete} />
            ))}
          </div>
          <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40">
                    {['Empleado', 'Documento', 'Cargo', 'C. Costo', 'Modalidad', 'Salario', 'Creado por', 'Estado', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {paginated.map(e => (
                    <tr key={e.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-semibold">{e.nombres} {e.apellidos}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{e.programa || '—'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{e.numeroDocumento}</span>
                      </td>
                      <td className="px-4 py-3.5 text-sm whitespace-nowrap">{e.cargo || <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-3.5 text-sm whitespace-nowrap">{e.centroCosto || <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-3.5 text-sm whitespace-nowrap">
                        {e.modalidad
                          ? <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-medium px-2 py-0.5 rounded-full">{e.modalidad}</span>
                          : <span className="text-muted-foreground">—</span>
                        }
                      </td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {formatCurrency(e.salarioBase)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div>
                          <p className="text-xs font-medium">{creadorLabel(e)}</p>
                          {creadorTipo(e) && (
                            <p className="text-[11px] text-muted-foreground">{creadorTipo(e)}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Badge
                          className={`text-[10px] ${
                            e.estaActivo
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800'
                          }`}
                        >
                          {e.estaActivo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
                          <Link href={`/dashboard/employees/${e.id}`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                          </Link>
                          <Link href={`/dashboard/employees/${e.id}/edit`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="h-3.5 w-3.5" /></Button>
                          </Link>
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(e.id, `${e.nombres} ${e.apellidos}`)}>
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
          <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      )}
    </div>
  )
}
