import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthToken } from "@/lib/getAuthToken"
import { registrarAuditoria } from "@/lib/auditoria"

export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest) {
  try {
    const token = await getAuthToken(request)
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const empresaId = (token as any)?.empresaId
    const userId = (token as any)?.id
    if (!empresaId) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })

    const body = await request.json()
    const { asignaciones = [], eliminaciones = [], fechasEnPeriodosCalculados = [] } = body

    const results: any[] = []

    for (const asignacion of asignaciones) {
      try {
        const fechaDate = new Date(asignacion.fechaTurno + "T12:00:00Z")

        const data = {
          conceptoId: asignacion.conceptoId,
          novedadId: asignacion.novedadId ?? null,
          horaInicioPersonalizada: asignacion.horaInicioPersonalizada ?? null,
          horaFinPersonalizada: asignacion.horaFinPersonalizada ?? null,
          minutosAlimentacion: asignacion.minutosAlimentacion !== undefined
            ? (asignacion.minutosAlimentacion === null ? null : Number(asignacion.minutosAlimentacion))
            : null,
        }

        const result = await prisma.asignacionTurno.upsert({
          where: {
            empresaId_empleadoId_fechaTurno: {
              empresaId,
              empleadoId: asignacion.empleadoId,
              fechaTurno: fechaDate,
            },
          },
          update: data,
          create: {
            empresaId,
            empleadoId: asignacion.empleadoId,
            fechaTurno: fechaDate,
            creadoPor: userId ?? null,
            ...data,
          },
        })

        results.push({ action: "upserted", id: result.id })
      } catch (error) {
        console.error("Error al guardar asignación:", error)
        results.push({
          action: "error",
          empleadoId: asignacion.empleadoId,
          fechaTurno: asignacion.fechaTurno,
          error: error instanceof Error ? error.message : "Error desconocido",
        })
      }
    }

    for (const del of eliminaciones) {
      try {
        const fechaDate = new Date(del.fechaTurno + "T12:00:00Z")
        const existing = await prisma.asignacionTurno.findFirst({
          where: { empresaId, empleadoId: del.empleadoId, fechaTurno: fechaDate },
        })
        if (existing) {
          // Remove linked work records before deleting (FK restrict, no cascade)
          await prisma.registroDiaTrabajado.deleteMany({
            where: { asignacionId: existing.id },
          })
          await prisma.asignacionTurno.delete({ where: { id: existing.id } })
          results.push({ action: "deleted", id: existing.id })
        }
      } catch (error) {
        console.error("Error al eliminar asignación:", error)
        results.push({ action: "error", ...del, error: (error as Error).message })
      }
    }

    const saved = results.filter(r => r.action === "upserted").length
    const deleted = results.filter(r => r.action === "deleted").length
    const errors = results.filter(r => r.action === "error").length

    if (saved > 0 || deleted > 0) {
      await registrarAuditoria({
        empresaId,
        usuarioId: typeof userId === 'string' ? userId : null,
        accion: 'ASIGNAR',
        modulo: 'TURNOS',
        entidad: 'AsignacionTurno',
        entidadId: `BATCH-${Date.now()}`,
        descripcion: `Programación masiva: ${saved} asignaciones, ${deleted} eliminaciones`,
        accionDetallada: `Batch de turnos: ${saved} guardados, ${deleted} eliminados, ${errors} errores`,
        severidad: errors > 0 ? 'MEDIO' : 'INFO',
        esMasiva: true,
      })
    }

    // Extra audit entry when modifying shifts inside already-calculated periods
    if (fechasEnPeriodosCalculados.length > 0) {
      const uniquePeriodos = Array.from(new Set((fechasEnPeriodosCalculados as {periodoNombre: string}[]).map(f => f.periodoNombre)))
      await registrarAuditoria({
        empresaId,
        usuarioId: typeof userId === 'string' ? userId : null,
        accion: 'ACTUALIZAR',
        modulo: 'TURNOS',
        entidad: 'AsignacionTurno',
        entidadId: `RECALCULO-${Date.now()}`,
        descripcion: `Turnos modificados en período(s) ya calculado(s): ${uniquePeriodos.join(', ')}`,
        accionDetallada: `Se editaron ${fechasEnPeriodosCalculados.length} día(s) pertenecientes a período(s) en estado CALCULADO/APROBADO/CERRADO`,
        severidad: 'ALTO',
        esMasiva: false,
      })
    }

    const parts = []
    if (saved) parts.push(`${saved} guardado${saved !== 1 ? "s" : ""}`)
    if (deleted) parts.push(`${deleted} eliminado${deleted !== 1 ? "s" : ""}`)
    if (errors) parts.push(`${errors} error${errors !== 1 ? "es" : ""}`)

    return NextResponse.json({
      success: errors === 0,
      message: parts.length ? parts.join(", ") : "Sin cambios",
      results: { saved, deleted, errors },
    })
  } catch (error) {
    console.error("Error en batch:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
