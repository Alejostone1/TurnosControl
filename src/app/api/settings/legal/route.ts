import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getToken } from "next-auth/jwt"
import { registrarAuditoria } from "@/lib/auditoria"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const empresaId = (session as any)?.empresaId

    if (!empresaId) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })
    }

    // Obtener configuración legal
    const configuracion = await prisma.configuracionLegal.findFirst({
      where: {
        empresaId: empresaId,
        estaActiva: true
      }
    })

    // Obtener conceptos de turno
    const conceptosTurno = await prisma.conceptoNomina.findMany({
      where: {
        empresaId: empresaId,
        estaActivo: true,
        categoria: 'TURNO_LABORAL'
      },
      orderBy: { orden: 'asc' }
    })

    // Si no hay configuración, crear una por defecto
    if (!configuracion) {
      const nuevaConfig = await prisma.configuracionLegal.create({
        data: {
          empresaId: empresaId,
          horasSemanalesMaximas: 44,
          horasDiariasEstandar: 7.33,
          porcentajeRecargoNocturno: 35,
          porcentajeRecargoDomFestivo: 75,
          porcentajeRecargoNocturnoFestivo: 110,
          porcentajeExtraDiurna: 25,
          porcentajeExtraNocturna: 75,
          porcentajeExtraDiurnaFestiva: 100,
          porcentajeExtraNocturnaFestiva: 150,
          horaInicioNocturno: "19:00",
          horaFinNocturno: "06:00",
          formulaValorHora: "SALARIO_MENSUAL / 220"
        }
      })
      
      return NextResponse.json({
        configuracion: nuevaConfig,
        conceptosTurno: conceptosTurno
      })
    }

    return NextResponse.json({
      configuracion,
      conceptosTurno
    })

  } catch (error) {
    console.error("Error al obtener configuración legal:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const empresaId = (session as any)?.empresaId

    if (!empresaId) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })
    }

    const body = await request.json()
    const { configuracion, conceptosTurno } = body

    // Obtener configuración actual
    const configuracionActual = await prisma.configuracionLegal.findFirst({
      where: {
        empresaId: empresaId,
        estaActiva: true
      }
    })

    const valorAntesTipo = configuracionActual?.tipoCalculoHorasExtras ?? 'SEMANAL'

    let configuracionActualizada

    if (!configuracionActual) {
      // Crear nueva configuración
      configuracionActualizada = await prisma.configuracionLegal.create({
        data: {
          empresaId: empresaId,
          horasSemanalesMaximas: configuracion.horasSemanalesMaximas,
          horasDiariasEstandar: configuracion.horasDiariasEstandar ?? configuracion.horasSemanalesMaximas / 6,
          porcentajeRecargoNocturno: configuracion.porcentajeRecargoNocturno,
          porcentajeRecargoDomFestivo: configuracion.porcentajeRecargoDomFestivo,
          porcentajeRecargoNocturnoFestivo: configuracion.porcentajeRecargoNocturnoFestivo,
          porcentajeExtraDiurna: configuracion.porcentajeExtraDiurna,
          porcentajeExtraNocturna: configuracion.porcentajeExtraNocturna,
          porcentajeExtraDiurnaFestiva: configuracion.porcentajeExtraDiurnaFestiva,
          porcentajeExtraNocturnaFestiva: configuracion.porcentajeExtraNocturnaFestiva,
          horaInicioNocturno: configuracion.horaInicioNocturno,
          horaFinNocturno: configuracion.horaFinNocturno,
          formulaValorHora: configuracion.formulaValorHora,
          tipoCalculoHorasExtras: configuracion.tipoCalculoHorasExtras ?? 'SEMANAL',
          creadoPor: (session as any)?.id
        }
      })
    } else {
      // Actualizar configuración existente
      configuracionActualizada = await prisma.configuracionLegal.update({
        where: { id: configuracionActual.id },
        data: {
          horasSemanalesMaximas: configuracion.horasSemanalesMaximas,
          horasDiariasEstandar: configuracion.horasSemanalesMaximas / 6,
          porcentajeRecargoNocturno: configuracion.porcentajeRecargoNocturno,
          porcentajeRecargoDomFestivo: configuracion.porcentajeRecargoDomFestivo,
          porcentajeRecargoNocturnoFestivo: configuracion.porcentajeRecargoNocturnoFestivo,
          porcentajeExtraDiurna: configuracion.porcentajeExtraDiurna,
          porcentajeExtraNocturna: configuracion.porcentajeExtraNocturna,
          porcentajeExtraDiurnaFestiva: configuracion.porcentajeExtraDiurnaFestiva,
          porcentajeExtraNocturnaFestiva: configuracion.porcentajeExtraNocturnaFestiva,
          horaInicioNocturno: configuracion.horaInicioNocturno,
          horaFinNocturno: configuracion.horaFinNocturno,
          formulaValorHora: configuracion.formulaValorHora,
          tipoCalculoHorasExtras: configuracion.tipoCalculoHorasExtras ?? 'SEMANAL',
          actualizadoEn: new Date()
        }
      })
    }

    // Actualizar conceptos de turno si se proporcionan
    if (conceptosTurno && Array.isArray(conceptosTurno)) {
      for (const concepto of conceptosTurno) {
        if (concepto.id) {
          await prisma.conceptoNomina.update({
            where: { id: concepto.id },
            data: {
              nombre: concepto.nombre,
              descripcion: concepto.descripcion,
              horaInicioDefecto: concepto.horaInicioDefecto,
              horaFinDefecto: concepto.horaFinDefecto,
              cruzaMedianoche: concepto.cruzaMedianoche,
              color: concepto.color,
              horasFijas: concepto.horasFijas,
              estaActivo: concepto.estaActivo
            }
          })
        } else {
          // Crear nuevo concepto
          await prisma.conceptoNomina.create({
            data: {
              empresaId: empresaId,
              codigo: concepto.codigo,
              nombre: concepto.nombre,
              descripcion: concepto.descripcion,
              categoria: concepto.categoria || 'TURNO_LABORAL',
              tipoCalculo: concepto.tipoCalculo || 'HORAS_TURNO',
              horaInicioDefecto: concepto.horaInicioDefecto,
              horaFinDefecto: concepto.horaFinDefecto,
              cruzaMedianoche: concepto.cruzaMedianoche || false,
              horasFijas: concepto.horasFijas,
              color: concepto.color,
              estaActivo: true,
              esDelSistema: false
            }
          })
        }
      }
    }

    if (configuracionActual && valorAntesTipo !== (configuracion.tipoCalculoHorasExtras ?? 'SEMANAL')) {
      await registrarAuditoria({
        empresaId,
        usuarioId: (session as any)?.id ?? null,
        accion: 'CONFIGURAR',
        modulo: 'CONFIGURACION',
        entidad: 'ConfiguracionLegal',
        entidadId: configuracionActualizada.id,
        valorAntes: { tipoCalculoHorasExtras: valorAntesTipo },
        valorDespues: { tipoCalculoHorasExtras: configuracion.tipoCalculoHorasExtras ?? 'SEMANAL' },
        descripcion: `Tipo de cálculo de horas extras cambiado: ${valorAntesTipo} → ${configuracion.tipoCalculoHorasExtras ?? 'SEMANAL'}`,
        accionDetallada: 'Cambio de modalidad de cálculo de horas extras en configuración legal',
        severidad: 'ALTO',
        requiereRevision: true,
      })
    }

    return NextResponse.json({
      configuracion: configuracionActualizada,
      message: "Configuración guardada exitosamente"
    })

  } catch (error) {
    console.error("Error al actualizar configuración legal:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
