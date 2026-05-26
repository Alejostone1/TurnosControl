import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthToken } from "@/lib/getAuthToken"
import { CalculationService } from "@/services/calculation.service"
import { registrarAuditoria } from "@/lib/auditoria"

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getAuthToken(request)
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const empresaId = (token as any)?.empresaId
    const userId    = (token as any)?.id
    if (!empresaId) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })

    const periodoId = params.id
    const { searchParams } = new URL(request.url)
    const forzar = searchParams.get("forzar") === "true"

    // Verify period belongs to this company and is in BORRADOR
    const periodo = await prisma.periodoNomina.findFirst({
      where: { id: periodoId, empresaId },
      include: {
        empleadosAsignados: { select: { empleadoId: true } },
      },
    })

    if (!periodo) return NextResponse.json({ error: "Período no encontrado" }, { status: 404 })

    if (periodo.estadoPeriodo !== 'BORRADOR') {
      return NextResponse.json({
        error: "El período ya fue calculado o está en proceso",
      }, { status: 400 })
    }

    const empleadoIds = periodo.empleadosAsignados.map(e => e.empleadoId)
    const totalEmpleados = empleadoIds.length

    if (totalEmpleados === 0) {
      return NextResponse.json({
        error: "El período no tiene empleados asignados. Agrega empleados antes de calcular.",
        code: "SIN_EMPLEADOS",
      }, { status: 422 })
    }

    // Check how many employees have at least one shift in the period date range
    const conTurnos = await prisma.asignacionTurno.groupBy({
      by: ["empleadoId"],
      where: {
        empresaId,
        empleadoId: { in: empleadoIds },
        fechaTurno: {
          gte: new Date(periodo.fechaInicio),
          lte: new Date(periodo.fechaFin),
        },
      },
    })

    const idsConTurnos  = new Set(conTurnos.map(r => r.empleadoId))
    const sinTurnos     = empleadoIds.filter(id => !idsConTurnos.has(id))
    const totalSinTurnos = sinTurnos.length

    if (totalSinTurnos > 0 && !forzar) {
      // Return a warning — frontend will ask confirmation with ?forzar=true
      return NextResponse.json({
        error: `${totalSinTurnos} de ${totalEmpleados} empleado(s) no tienen turnos programados en este período.`,
        code: "TURNOS_INCOMPLETOS",
        totalEmpleados,
        conTurnos: totalEmpleados - totalSinTurnos,
        sinTurnos: totalSinTurnos,
      }, { status: 422 })
    }

    // Set period to PENDIENTE immediately to prevent duplicate requests
    await prisma.periodoNomina.update({
      where: { id: periodoId },
      data: { estadoPeriodo: 'PENDIENTE', calculadoPor: userId },
    })

    await registrarAuditoria({
      empresaId,
      usuarioId: userId,
      accion:    'CALCULAR',
      modulo:    'NOMINA',
      entidad:   'PeriodoNomina',
      entidadId: periodoId,
      descripcion:     `Cálculo iniciado: ${periodo.nombrePeriodo}`,
      accionDetallada: `Período enviado a cálculo sincrónico (${totalEmpleados} empleados, ${totalSinTurnos} sin turnos)`,
      severidad: 'ALTO',
      requiereRevision: false,
    })

    // Run calculation synchronously — no Redis/BullMQ required
    try {
      await new CalculationService().calcularPeriodo(periodoId)

      await prisma.periodoNomina.update({
        where: { id: periodoId },
        data: {
          estadoPeriodo: 'CALCULADO',
          calculadoEn:   new Date(),
          calculadoPor:  userId,
        },
      })

      return NextResponse.json({
        success: true,
        message: `Nómina calculada exitosamente para ${totalEmpleados} empleado(s)`,
        totalEmpleados,
        conTurnos:  totalEmpleados - totalSinTurnos,
        sinTurnos:  totalSinTurnos,
      })

    } catch (calcError) {
      // Calculation failed — revert to BORRADOR
      await prisma.periodoNomina.update({
        where: { id: periodoId },
        data: { estadoPeriodo: 'BORRADOR', calculadoEn: null, calculadoPor: null },
      })
      console.error("Error en cálculo de nómina:", calcError)
      return NextResponse.json({
        error: "Error durante el cálculo. El período fue revertido a Borrador.",
        details: calcError instanceof Error ? calcError.message : "Error desconocido",
      }, { status: 500 })
    }

  } catch (error) {
    console.error("Error en API de cálculo:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
