import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthToken } from "@/lib/getAuthToken"
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

    const periodo = await prisma.periodoNomina.findFirst({
      where: { id: params.id, empresaId },
    })

    if (!periodo) return NextResponse.json({ error: "Período no encontrado" }, { status: 404 })

    if (!["PENDIENTE", "CALCULADO"].includes(periodo.estadoPeriodo)) {
      return NextResponse.json({
        error: "Solo se puede resetear un período en estado Procesando o Calculado",
      }, { status: 400 })
    }

    await prisma.periodoNomina.update({
      where: { id: params.id },
      data: { estadoPeriodo: 'BORRADOR', calculadoEn: null, calculadoPor: null },
    })

    await registrarAuditoria({
      empresaId,
      usuarioId: userId,
      accion:    'ACTUALIZAR',
      modulo:    'NOMINA',
      entidad:   'PeriodoNomina',
      entidadId: params.id,
      descripcion:     `Período reseteado a Borrador: ${periodo.nombrePeriodo}`,
      accionDetallada: `Estado anterior: ${periodo.estadoPeriodo} → BORRADOR (reset manual)`,
      severidad:       'MEDIO',
      requiereRevision: false,
    })

    return NextResponse.json({ success: true, message: "Período reseteado a Borrador" })

  } catch (error) {
    console.error("Error al resetear período:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
