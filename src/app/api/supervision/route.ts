import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthToken } from "@/lib/getAuthToken"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = await getAuthToken(request)
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const empresaId = (token as any)?.empresaId
    const role = (token as any)?.role
    const userId = (token as any)?.id

    if (!empresaId) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const visualizadorId = searchParams.get("visualizadorId")
    const loadUsers = searchParams.get("loadUsers") === "true"

    // Only admins can see all assignments; visualizador sees only their own
    const isAdmin = role === "SUPER_ADMIN" || role === "ADMINISTRADOR"
    const filterVisorId = isAdmin && visualizadorId ? visualizadorId : (!isAdmin ? userId : undefined)

    const whereClause: any = { empresaId }
    if (filterVisorId) whereClause.visualizadorId = filterVisorId

    // When loadUsers=true, admin is loading the management page → return available users for select dropdowns
    if (loadUsers && isAdmin) {
      const [visualizadores, liquidadores, auxiliares] = await Promise.all([
        prisma.usuario.findMany({
          where: { empresaId, rol: "VISUALIZADOR", estaActivo: true },
          select: { id: true, nombres: true, apellidos: true, correo: true },
          orderBy: { nombres: "asc" },
        }),
        prisma.usuario.findMany({
          where: { empresaId, rol: "LIQUIDADOR", estaActivo: true },
          select: { id: true, nombres: true, apellidos: true, correo: true },
          orderBy: { nombres: "asc" },
        }),
        prisma.auxiliar.findMany({
          where: { empresaId, estaActivo: true },
          select: { id: true, nombres: true, apellidos: true, correo: true },
          orderBy: { nombres: "asc" },
        }),
      ])
      return NextResponse.json({ visualizadores, liquidadores, auxiliares })
    }

    const asignaciones = await prisma.supervisionAsignacion.findMany({
      where: whereClause,
      include: {
        visualizador: {
          select: { id: true, nombres: true, apellidos: true, correo: true, rol: true },
        },
      },
      orderBy: { creadoEn: "desc" },
    })

    // Enrich with the assigned user/auxiliar info
    const enriched = await Promise.all(asignaciones.map(async (a) => {
      let asignado: any = null
      if (a.tipoAsignado === "LIQUIDADOR") {
        asignado = await prisma.usuario.findUnique({
          where: { id: a.asignadoId },
          select: { id: true, nombres: true, apellidos: true, correo: true, rol: true },
        })
      } else if (a.tipoAsignado === "AUXILIAR") {
        asignado = await prisma.auxiliar.findUnique({
          where: { id: a.asignadoId },
          select: { id: true, nombres: true, apellidos: true, correo: true },
        })
      }
      return { ...a, asignado }
    }))

    return NextResponse.json(enriched)
  } catch (error) {
    console.error("Error al obtener supervisiones:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getAuthToken(request)
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const empresaId = (token as any)?.empresaId
    const userId = (token as any)?.id
    const role = (token as any)?.role

    if (!empresaId) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })

    const isAdmin = role === "SUPER_ADMIN" || role === "ADMINISTRADOR"
    if (!isAdmin) {
      return NextResponse.json({ error: "No autorizado para esta acción" }, { status: 403 })
    }

    const body = await request.json()
    const { visualizadorId, asignadoId, tipoAsignado } = body

    if (!visualizadorId || !asignadoId || !tipoAsignado) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    if (!["LIQUIDADOR", "AUXILIAR"].includes(tipoAsignado)) {
      return NextResponse.json({ error: "tipoAsignado debe ser LIQUIDADOR o AUXILIAR" }, { status: 400 })
    }

    // Verify the visualizador exists and is VISUALIZADOR role
    const visor = await prisma.usuario.findFirst({
      where: { id: visualizadorId, empresaId, rol: "VISUALIZADOR" },
    })
    if (!visor) {
      return NextResponse.json({ error: "Visualizador no encontrado" }, { status: 404 })
    }

    // Verify the asignado exists
    if (tipoAsignado === "LIQUIDADOR") {
      const liq = await prisma.usuario.findFirst({
        where: { id: asignadoId, empresaId, rol: "LIQUIDADOR" },
      })
      if (!liq) return NextResponse.json({ error: "Liquidador no encontrado" }, { status: 404 })
    } else {
      const aux = await prisma.auxiliar.findFirst({
        where: { id: asignadoId, empresaId },
      })
      if (!aux) return NextResponse.json({ error: "Auxiliar no encontrado" }, { status: 404 })
    }

    const asignacion = await prisma.supervisionAsignacion.create({
      data: {
        empresaId,
        visualizadorId,
        asignadoId,
        tipoAsignado,
        creadoPor: userId,
      },
    })

    return NextResponse.json(asignacion, { status: 201 })
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Esta asignación ya existe" }, { status: 409 })
    }
    console.error("Error al crear supervisión:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
