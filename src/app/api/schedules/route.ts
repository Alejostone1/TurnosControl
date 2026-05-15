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
    const startDate   = searchParams.get("startDate")
    const endDate     = searchParams.get("endDate")
    const month       = searchParams.get("month")
    const year        = searchParams.get("year")
    const empleadoId  = searchParams.get("empleadoId")
    const centroCosto = searchParams.get("centroCosto")
    const programa    = searchParams.get("programa")
    const modalidad   = searchParams.get("modalidad")
    const limitStr    = searchParams.get("limit")

    const whereClause: any = { empresaId }

    if (startDate && endDate) {
      whereClause.fechaTurno = {
        gte: new Date(startDate + "T00:00:00Z"),
        lte: new Date(endDate + "T23:59:59Z"),
      }
    } else if (month && year) {
      whereClause.fechaTurno = {
        gte: new Date(parseInt(year), parseInt(month) - 1, 1),
        lte: new Date(parseInt(year), parseInt(month), 0),
      }
    }

    if (empleadoId) whereClause.empleadoId = empleadoId

    if (centroCosto || programa || modalidad) {
      whereClause.empleado = {
        ...(centroCosto && { centroCosto }),
        ...(programa    && { programa }),
        ...(modalidad   && { modalidad }),
      }
    }

    const asignaciones = await prisma.asignacionTurno.findMany({
      where: whereClause,
      include: {
        concepto: true,
        empleado: { select: { id: true, nombres: true, apellidos: true, numeroDocumento: true, centroCosto: true, programa: true, modalidad: true } },
      },
      orderBy: [{ fechaTurno: "desc" }, { empleadoId: "asc" }],
      ...(limitStr ? { take: parseInt(limitStr) } : {}),
    })

    return NextResponse.json(asignaciones)
  } catch (error) {
    console.error("Error al obtener asignaciones:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
