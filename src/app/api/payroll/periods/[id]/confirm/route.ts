import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getToken } from "next-auth/jwt"
import { registrarAuditoria } from "@/lib/auditoria"

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const periodoId = params.id

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

    // Obtener empleados con sus asignaciones y resultados
    const empleados = await prisma.empleado.findMany({
      where: {
        empresaId: empresaId,
        estaActivo: true
      },
      include: {
        asignacionesTurno: {
          where: {
            fechaTurno: {
              gte: periodo.fechaInicio,
              lte: periodo.fechaFin
            }
          }
        }
      }
    })

    // Obtener resultados del período
    const resultados = await prisma.resultadoNomina.findMany({
      where: {
        periodoId: periodoId
      }
    })

    // Verificar que todos los empleados tengan turnos asignados
    const empleadosSinTurnos = empleados.filter((emp: any) => 
      emp.asignacionesTurno.length === 0
    )

    if (empleadosSinTurnos.length > 0) {
      return NextResponse.json({ 
        error: "No todos los empleados tienen turnos asignados",
        details: `${empleadosSinTurnos.length} empleados sin turnos`
      }, { status: 400 })
    }

    // Verificar que ya haya resultados calculados
    if (resultados.length === 0) {
      return NextResponse.json({ 
        error: "El período no ha sido calculado aún",
        details: "Primero debe calcular la nómina del período"
      }, { status: 400 })
    }

    // Verificar que todos los empleados tengan resultados
    if (resultados.length !== empleados.length) {
      return NextResponse.json({ 
        error: "No todos los empleados tienen resultados calculados",
        details: `${resultados.length} de ${empleados.length} empleados calculados`
      }, { status: 400 })
    }

    
    // Actualizar estado a CALCULADO (o APROBADO si prefieres)
    const updatedPeriodo = await prisma.periodoNomina.update({
      where: { id: periodoId },
      data: {
        estadoPeriodo: 'CALCULADO',
        calculadoEn: new Date(),
        calculadoPor: userId
      }
    })

    await registrarAuditoria({
      empresaId,
      usuarioId: userId,
      accion: 'CONFIRMAR',
      modulo: 'NOMINA',
      entidad: 'PeriodoNomina',
      entidadId: periodoId,
      descripcion: `Período confirmado: ${periodo.nombrePeriodo}`,
      accionDetallada: `${empleados.length} empleados, ${resultados.length} resultados calculados`,
      severidad: 'ALTO',
      requiereRevision: true,
    })

    return NextResponse.json({
      success: true,
      message: "Período confirmado exitosamente",
      periodo: updatedPeriodo,
      stats: {
        empleadosTotal: empleados.length,
        empleadosConTurnos: empleados.filter((emp: any) => emp.asignacionesTurno.length > 0).length,
        empleadosConResultados: resultados.length
      }
    })

  } catch (error) {
    console.error("Error al confirmar período:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
