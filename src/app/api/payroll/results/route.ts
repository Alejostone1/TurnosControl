import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getToken } from "next-auth/jwt"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const empresaId = (token as any)?.empresaId

    if (!empresaId) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const periodoId = searchParams.get('periodoId')

    if (!periodoId) {
      return NextResponse.json({ error: "ID de período requerido" }, { status: 400 })
    }

    const resultados = await prisma.resultadoNomina.findMany({
      where: {
        empresaId: empresaId,
        periodoId: periodoId
      },
      include: {
        empleado: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            numeroDocumento: true,
            centroCosto: true,
            programa: true,
            modalidad: true,
          }
        }
      },
      orderBy: {
        empleado: {
          apellidos: 'asc'
        }
      }
    })

    return NextResponse.json(resultados)

  } catch (error) {
    console.error("Error al obtener resultados:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
