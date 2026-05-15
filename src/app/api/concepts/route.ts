import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getToken } from "next-auth/jwt"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const empresaId = (token as any)?.empresaId
    if (!empresaId) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get("includeInactive") === "true"

    const conceptos = await prisma.conceptoNomina.findMany({
      where: { empresaId, ...(includeInactive ? {} : { estaActivo: true }) },
      orderBy: [{ orden: "asc" }, { creadoEn: "asc" }],
    })

    return NextResponse.json(conceptos)
  } catch (error) {
    console.error("Error al obtener conceptos:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const empresaId = (token as any)?.empresaId
    const userId = (token as any)?.id
    if (!empresaId) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })

    const body = await request.json()
    const {
      codigo, nombre, descripcion, categoria, tipoCalculo, tipoImpacto,
      horasFijas, horaInicioDefecto, horaFinDefecto, cruzaMedianoche,
      afectaLiquidacion, cuentaParaTope, color, icono, orden,
    } = body

    if (!codigo || !nombre || !categoria || !tipoCalculo || !tipoImpacto) {
      return NextResponse.json(
        { error: "Campos requeridos: codigo, nombre, categoria, tipoCalculo, tipoImpacto" },
        { status: 400 }
      )
    }

    const existing = await prisma.conceptoNomina.findFirst({
      where: { empresaId, codigo: codigo.toUpperCase() },
    })
    if (existing) {
      return NextResponse.json(
        { error: `Ya existe un concepto con código "${codigo.toUpperCase()}"` },
        { status: 409 }
      )
    }

    const concepto = await prisma.conceptoNomina.create({
      data: {
        empresaId,
        codigo: codigo.toUpperCase().trim(),
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        categoria,
        tipoCalculo,
        tipoImpacto,
        horasFijas: horasFijas != null ? parseFloat(horasFijas) : null,
        horaInicioDefecto: horaInicioDefecto || null,
        horaFinDefecto: horaFinDefecto || null,
        cruzaMedianoche: cruzaMedianoche ?? false,
        afectaLiquidacion: afectaLiquidacion ?? true,
        cuentaParaTope: cuentaParaTope ?? false,
        color: color || null,
        icono: icono || null,
        orden: orden ?? 99,
        creadoPor: userId,
      },
    })

    return NextResponse.json(concepto, { status: 201 })
  } catch (error) {
    console.error("Error al crear concepto:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
