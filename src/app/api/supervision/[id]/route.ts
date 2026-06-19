import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthToken } from "@/lib/getAuthToken"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getAuthToken(request)
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const empresaId = (token as any)?.empresaId
    const role = (token as any)?.role
    const isAdmin = role === "SUPER_ADMIN" || role === "ADMINISTRADOR"

    if (!isAdmin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const result = await prisma.supervisionAsignacion.deleteMany({
      where: { id: params.id, empresaId },
    })

    if (result.count === 0) {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error al eliminar supervisión:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
