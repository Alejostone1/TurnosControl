import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getToken } from "next-auth/jwt"
import { registrarAuditoria } from "@/lib/auditoria"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const empresaId = (token as any)?.empresaId

    if (!empresaId) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })
    }

    const periodo = await prisma.periodoNomina.findFirst({
      where: {
        id: params.id,
        empresaId: empresaId
      },
      include: {
        configuracionLegal: true
      }
    })

    if (!periodo) {
      return NextResponse.json({ error: "Período no encontrado" }, { status: 404 })
    }

    return NextResponse.json(periodo)

  } catch (error) {
    console.error("Error al obtener período:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const empresaId = (token as any)?.empresaId
    const userId = (token as any)?.id

    if (!empresaId) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })
    }

    const body = await request.json()

    // Verificar que el período existe y pertenece a la empresa
    const periodoExistente = await prisma.periodoNomina.findFirst({
      where: {
        id: params.id,
        empresaId: empresaId
      }
    })

    if (!periodoExistente) {
      return NextResponse.json({ error: "Período no encontrado" }, { status: 404 })
    }

    // Fechas solo editables en BORRADOR
    const cambiandoFechas =
      body.fechaInicio !== periodoExistente.fechaInicio.toISOString().substring(0, 10) ||
      body.fechaFin !== periodoExistente.fechaFin.toISOString().substring(0, 10)
    if (cambiandoFechas && periodoExistente.estadoPeriodo !== "BORRADOR") {
      return NextResponse.json({
        error: "Las fechas solo se pueden modificar cuando el período está en estado BORRADOR",
      }, { status: 400 })
    }

    // Verificar que no exista otro período con las mismas fechas
    const existingPeriodo = await prisma.periodoNomina.findFirst({
      where: {
        empresaId: empresaId,
        fechaInicio: new Date(body.fechaInicio),
        fechaFin: new Date(body.fechaFin),
        id: {
          not: params.id
        }
      }
    })

    if (existingPeriodo) {
      return NextResponse.json(
        { error: "Ya existe un período con estas fechas" },
        { status: 400 }
      )
    }

    const minutosAlimentacion = body.minutosAlimentacion === undefined
      ? undefined
      : body.minutosAlimentacion === null ? null : Number(body.minutosAlimentacion)

    const periodo = await prisma.periodoNomina.update({
      where: {
        id: params.id
      },
      data: {
        nombrePeriodo: body.nombrePeriodo,
        tipoPeriodo: body.tipoPeriodo || "MENSUAL",
        fechaInicio: new Date(body.fechaInicio),
        fechaFin: new Date(body.fechaFin),
        fechaCorte: body.fechaCorte ? new Date(body.fechaCorte) : new Date(body.fechaFin),
        modificadoPor: userId,
        ...(minutosAlimentacion !== undefined && { minutosAlimentacion }),
      },
      include: {
        configuracionLegal: true
      }
    })

    const fechasCambiaron =
      periodoExistente.fechaInicio.toISOString() !== new Date(body.fechaInicio).toISOString() ||
      periodoExistente.fechaFin.toISOString() !== new Date(body.fechaFin).toISOString()

    await registrarAuditoria({
      empresaId,
      usuarioId: userId,
      accion: 'ACTUALIZAR',
      modulo: 'NOMINA',
      entidad: 'PeriodoNomina',
      entidadId: params.id,
      valorAntes: {
        nombrePeriodo: periodoExistente.nombrePeriodo,
        fechaInicio: periodoExistente.fechaInicio,
        fechaFin: periodoExistente.fechaFin,
        tipoPeriodo: periodoExistente.tipoPeriodo,
      },
      valorDespues: {
        nombrePeriodo: periodo.nombrePeriodo,
        fechaInicio: periodo.fechaInicio,
        fechaFin: periodo.fechaFin,
        tipoPeriodo: periodo.tipoPeriodo,
      },
      descripcion: `Período actualizado: ${periodo.nombrePeriodo}`,
      accionDetallada: fechasCambiaron ? 'Cambio de fechas del período' : 'Actualización de datos del período',
      severidad: fechasCambiaron ? 'MEDIO' : 'BAJO',
    })

    return NextResponse.json(periodo)

  } catch (error) {
    console.error("Error al actualizar período:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const empresaId = (token as any)?.empresaId

    if (!empresaId) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })
    }

    // Verificar que el período existe y pertenece a la empresa
    const periodo = await prisma.periodoNomina.findFirst({
      where: {
        id: params.id,
        empresaId: empresaId
      }
    })

    if (!periodo) {
      return NextResponse.json({ error: "Período no encontrado" }, { status: 404 })
    }

    // Verificar que el período está en estado BORRADOR
    if (periodo.estadoPeriodo !== "BORRADOR") {
      return NextResponse.json({ 
        error: "Solo se pueden eliminar períodos en estado BORRADOR" 
      }, { status: 400 })
    }

    // Eliminar el período (las relaciones se eliminarán en cascada)
    await prisma.periodoNomina.delete({
      where: {
        id: params.id
      }
    })

    return NextResponse.json({ message: "Período eliminado exitosamente" }, { status: 200 })

  } catch (error) {
    console.error("Error al eliminar período:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
