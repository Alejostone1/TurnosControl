import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getToken } from "next-auth/jwt"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const empresaId = (session as any)?.empresaId
    if (!empresaId) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })

    const auxiliar = await prisma.auxiliar.findFirst({ where: { id: params.id, empresaId } })
    if (!auxiliar) return NextResponse.json({ error: "Auxiliar no encontrado" }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1"))
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"))
    const skip  = (page - 1) * limit

    const where = { empresaId, auxiliarId: params.id }

    const [registros, total] = await Promise.all([
      prisma.registroAuditoria.findMany({
        where,
        orderBy: { creadoEn: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          accion: true,
          entidad: true,
          entidadId: true,
          descripcion: true,
          creadoEn: true,
        },
      }),
      prisma.registroAuditoria.count({ where }),
    ])

    return NextResponse.json({ registros, total, page, limit })
  } catch (error) {
    console.error("Error al obtener auditoría del auxiliar:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
