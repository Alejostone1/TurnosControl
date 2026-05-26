import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthToken } from "@/lib/getAuthToken"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthToken(request)
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const empresaId = (session as any)?.empresaId
    if (!empresaId) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })

    const conceptos = await prisma.conceptoNomina.findMany({
      where: { empresaId },
      orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
      select: {
        id: true,
        codigo: true,
        nombre: true,
        descripcion: true,
        categoria: true,
        tipoImpacto: true,
        horaInicioDefecto: true,
        horaFinDefecto: true,
        horasFijas: true,
        color: true,
        icono: true,
        cruzaMedianoche: true,
        afectaLiquidacion: true,
        estaActivo: true,
      },
    })

    return NextResponse.json(conceptos)
  } catch (error) {
    console.error("Error al obtener conceptos:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
