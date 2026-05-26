import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthToken } from "@/lib/getAuthToken"

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getAuthToken(request)
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const empresaId = (token as any)?.empresaId
    if (!empresaId) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })

    const url = new URL(request.url)
    const disponibles = url.searchParams.get("disponibles") === "true"

    const periodo = await prisma.periodoNomina.findFirst({
      where: { id: params.id, empresaId },
    })
    if (!periodo) return NextResponse.json({ error: "Período no encontrado" }, { status: 404 })

    if (disponibles) {
      // Return active employees NOT yet assigned to this period
      const asignados = await prisma.empleadoPeriodo.findMany({
        where: { periodoId: params.id, estadoAsignacion: "ACTIVO" },
        select: { empleadoId: true },
      })
      const asignadosIds = asignados.map(a => a.empleadoId)

      const empleados = await prisma.empleado.findMany({
        where: {
          empresaId,
          estaActivo: true,
          id: { notIn: asignadosIds },
        },
        orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
        select: {
          id: true,
          nombres: true,
          apellidos: true,
          numeroDocumento: true,
          centroCosto: true,
          programa: true,
          modalidad: true,
          cargo: true,
          tipoVinculacion: true,
          salarioBase: true,
        },
      })
      return NextResponse.json({ empleados })
    }

    // Default: return employees assigned via EmpleadoPeriodo with estadoAsignacion = ACTIVO
    const asignacionesPeriodo = await prisma.empleadoPeriodo.findMany({
      where: { periodoId: params.id, estadoAsignacion: "ACTIVO" },
      select: { empleadoId: true },
    })
    const empleadosIds = asignacionesPeriodo.map(a => a.empleadoId)

    const empleados = await prisma.empleado.findMany({
      where: {
        id: { in: empleadosIds },
        empresaId,
      },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        numeroDocumento: true,
        centroCosto: true,
        programa: true,
        modalidad: true,
        cargo: true,
        tipoVinculacion: true,
        salarioBase: true,
      },
    })

    // Shift assignments in this period — manual count per employee
    const asignacionesTurno = await prisma.asignacionTurno.findMany({
      where: {
        empresaId,
        empleadoId: { in: empleadosIds },
        fechaTurno: {
          gte: periodo.fechaInicio,
          lte: periodo.fechaFin,
        },
      },
      select: { empleadoId: true },
    })
    const turnosMap = new Map<string, number>()
    asignacionesTurno.forEach(a => {
      turnosMap.set(a.empleadoId, (turnosMap.get(a.empleadoId) ?? 0) + 1)
    })

    // Existing calculation results for this period
    const resultados = await prisma.resultadoNomina.findMany({
      where: { periodoId: params.id, empleadoId: { in: empleadosIds } },
      select: {
        empleadoId: true,
        totalHorasOrdinarias: true,
        totalHorasNocturnas: true,
        totalHorasFestivas: true,
        totalHorasNoctFestivas: true,
        totalExtraDiurna: true,
        totalExtraNocturna: true,
        totalExtraDiurnaFest: true,
        totalExtraNoctFest: true,
        totalHorasTrabajadas: true,
        totalHorasExtras: true,
        salarioBase: true,
        auxilioTransporte: true,
        totalDevengado: true,
        totalDeducciones: true,
        netoAPagar: true,
      },
    })
    const resultadoMap = new Map(resultados.map(r => [r.empleadoId, r]))

    const data = empleados.map(e => ({
      ...e,
      turnosCount: turnosMap.get(e.id) ?? 0,
      resultado: resultadoMap.get(e.id) ?? null,
    }))

    return NextResponse.json({ periodo, empleados: data })
  } catch (error) {
    console.error("Error al obtener empleados del período:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getAuthToken(request)
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const empresaId = (token as any)?.empresaId
    const userId = (token as any)?.id
    if (!empresaId) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })

    const periodo = await prisma.periodoNomina.findFirst({
      where: { id: params.id, empresaId },
    })
    if (!periodo) return NextResponse.json({ error: "Período no encontrado" }, { status: 404 })

    const body = await request.json()
    const { criterioSeleccion, centroCosto, programa, modalidad, empleadoIds } = body

    let finalIds: string[] = []

    if (criterioSeleccion && criterioSeleccion !== "MANUAL") {
      // Resolve employees server-side based on filter criteria
      const where: Record<string, unknown> = { empresaId, estaActivo: true }

      switch (criterioSeleccion) {
        case "TODOS":
          break
        case "CENTRO_COSTO":
          if (centroCosto) where.centroCosto = centroCosto
          break
        case "PROGRAMA":
          if (programa) where.programa = programa
          break
        case "MODALIDAD":
          if (modalidad) where.modalidad = modalidad
          break
        case "FILTROS": {
          if (centroCosto) where.centroCosto = centroCosto
          if (programa) where.programa = programa
          if (modalidad) where.modalidad = modalidad
          break
        }
        default:
          break
      }

      const resolved = await prisma.empleado.findMany({
        where,
        select: { id: true },
      })
      finalIds = resolved.map(e => e.id)
    } else {
      // MANUAL — use provided IDs
      finalIds = Array.isArray(empleadoIds) ? empleadoIds : []
    }

    if (finalIds.length === 0) {
      return NextResponse.json({ added: 0 })
    }

    const result = await prisma.empleadoPeriodo.createMany({
      data: finalIds.map(empleadoId => ({
        empleadoId,
        periodoId: params.id,
        estadoAsignacion: "ACTIVO",
        creadoPor: userId || null,
      })),
      skipDuplicates: true,
    })

    return NextResponse.json({ added: result.count })
  } catch (error) {
    console.error("Error al agregar empleados al período:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
