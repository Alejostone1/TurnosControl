import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthToken } from "@/lib/getAuthToken"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getAuthToken(request)
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const empresaId = (token as any)?.empresaId
    if (!empresaId) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })

    const { id } = params
    const body = await request.json()
    const { estado, observacionRevision } = body

    if (!estado) {
      return NextResponse.json({ error: "Estado es requerido" }, { status: 400 })
    }

    const validEstados = ["PENDIENTE", "PROGRAMADO", "LIQUIDADO", "EN_REVISION", "APROBADO", "RECHAZADO"]
    if (!validEstados.includes(estado)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 })
    }

    const updateData: any = { estado }

    if (observacionRevision !== undefined) {
      updateData.observacionRevision = observacionRevision
    }

    // Set timestamps based on estado
    const now = new Date()
    if (estado === "LIQUIDADO") {
      updateData.liquidadoEn = now
      updateData.liquidadoPor = (token as any).id
    } else if (estado === "EN_REVISION" || estado === "APROBADO") {
      updateData.revisadoEn = now
      updateData.revisadoPor = (token as any).id
      if (estado === "APROBADO") {
        updateData.aprobadoEn = now
        updateData.aprobadoPor = (token as any).id
      }
    } else if (estado === "RECHAZADO") {
      updateData.revisadoEn = now
      updateData.revisadoPor = (token as any).id
    }

    const asignacion = await prisma.asignacionTurno.updateMany({
      where: { id, empresaId },
      data: updateData,
    })

    if (asignacion.count === 0) {
      return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true, estado })
  } catch (error) {
    console.error("Error al actualizar turno:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getAuthToken(request)
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const empresaId = (token as any)?.empresaId
    if (!empresaId) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })

    const asignacion = await prisma.asignacionTurno.findFirst({
      where: { id: params.id, empresaId },
      include: {
        concepto: true,
        novedad: true,
        empleado: {
          select: {
            id: true, nombres: true, apellidos: true, numeroDocumento: true,
            centroCosto: true, programa: true, modalidad: true, cargo: true,
          },
        },
      },
    })

    if (!asignacion) {
      return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 })
    }

    return NextResponse.json(asignacion)
  } catch (error) {
    console.error("Error al obtener turno:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
