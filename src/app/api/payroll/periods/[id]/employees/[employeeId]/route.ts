import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getToken } from "next-auth/jwt"

export const dynamic = 'force-dynamic'

// DELETE - Eliminar empleado de un período específico
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; employeeId: string } }
) {
  try {
    const session = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const empresaId = (session as any)?.empresaId

    if (!empresaId) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })
    }

    const periodoId = params.id
    const empleadoId = params.employeeId

    // Verificar que el período exista y pertenezca a la empresa
    const periodo = await prisma.periodoNomina.findFirst({
      where: {
        id: periodoId,
        empresaId: empresaId
      }
    })

    if (!periodo) {
      return NextResponse.json({ error: "Período no encontrado" }, { status: 404 })
    }

    // Verificar que el empleado exista y esté activo
    const empleado = await prisma.empleado.findFirst({
      where: {
        id: empleadoId,
        empresaId: empresaId,
        estaActivo: true
      }
    })

    if (!empleado) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 })
    }

    // Verificar que el empleado esté asignado a este período
    const asignacionExistente = await prisma.empleadoPeriodo.findFirst({
      where: {
        periodoId: periodoId,
        empleadoId: empleadoId
      }
    })

    if (!asignacionExistente) {
      return NextResponse.json({
        error: "El empleado no está asignado a este período"
      }, { status: 400 })
    }

    // Eliminar la asignación del empleado al período
    await prisma.empleadoPeriodo.deleteMany({
      where: {
        periodoId: periodoId,
        empleadoId: empleadoId
      }
    })

    return NextResponse.json({
      success: true,
      message: "Empleado eliminado del período exitosamente"
    })

  } catch (error) {
    console.error("Error al eliminar empleado del período:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
