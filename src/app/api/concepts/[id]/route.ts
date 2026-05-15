import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getToken } from "next-auth/jwt"

export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const empresaId = (token as any)?.empresaId
    if (!empresaId) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })

    const concepto = await prisma.conceptoNomina.findFirst({
      where: { id: params.id, empresaId },
    })
    if (!concepto) return NextResponse.json({ error: "Concepto no encontrado" }, { status: 404 })

    const body = await request.json()
    const {
      codigo,
      nombre,
      descripcion,
      categoria,
      tipoCalculo,
      tipoImpacto,
      horasFijas,
      horaInicioDefecto,
      horaFinDefecto,
      cruzaMedianoche,
      afectaLiquidacion,
      cuentaParaTope,
      color,
      icono,
      orden,
    } = body

    // Check unique code only if it changed
    if (codigo && codigo.toUpperCase() !== concepto.codigo) {
      const duplicate = await prisma.conceptoNomina.findFirst({
        where: { empresaId, codigo: codigo.toUpperCase(), id: { not: params.id } },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: `Ya existe un concepto con el código "${codigo.toUpperCase()}"` },
          { status: 409 }
        )
      }
    }

    const updated = await prisma.conceptoNomina.update({
      where: { id: params.id },
      data: {
        ...(codigo && { codigo: codigo.toUpperCase().trim() }),
        ...(nombre && { nombre: nombre.trim() }),
        descripcion: descripcion?.trim() ?? concepto.descripcion,
        ...(categoria && { categoria }),
        ...(tipoCalculo && { tipoCalculo }),
        ...(tipoImpacto && { tipoImpacto }),
        horasFijas: horasFijas != null ? parseFloat(horasFijas) : concepto.horasFijas,
        horaInicioDefecto: horaInicioDefecto ?? concepto.horaInicioDefecto,
        horaFinDefecto: horaFinDefecto ?? concepto.horaFinDefecto,
        cruzaMedianoche: cruzaMedianoche ?? concepto.cruzaMedianoche,
        afectaLiquidacion: afectaLiquidacion ?? concepto.afectaLiquidacion,
        cuentaParaTope: cuentaParaTope ?? concepto.cuentaParaTope,
        color: color ?? concepto.color,
        icono: icono ?? concepto.icono,
        orden: orden ?? concepto.orden,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error al actualizar concepto:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const empresaId = (token as any)?.empresaId
    if (!empresaId) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })

    const concepto = await prisma.conceptoNomina.findFirst({
      where: { id: params.id, empresaId },
    })
    if (!concepto) return NextResponse.json({ error: "Concepto no encontrado" }, { status: 404 })

    if (concepto.esDelSistema) {
      return NextResponse.json(
        { error: "Los conceptos del sistema no pueden eliminarse" },
        { status: 403 }
      )
    }

    // Check if concept is in use
    const enUso = await prisma.asignacionTurno.count({
      where: { conceptoId: params.id },
    })

    if (enUso > 0) {
      // Soft delete — keep data integrity
      await prisma.conceptoNomina.update({
        where: { id: params.id },
        data: { estaActivo: false },
      })
      return NextResponse.json({
        message: `Concepto desactivado (estaba en uso en ${enUso} asignación${enUso !== 1 ? "es" : ""})`,
        softDeleted: true,
      })
    }

    await prisma.conceptoNomina.delete({ where: { id: params.id } })
    return NextResponse.json({ message: "Concepto eliminado correctamente" })
  } catch (error) {
    console.error("Error al eliminar concepto:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
