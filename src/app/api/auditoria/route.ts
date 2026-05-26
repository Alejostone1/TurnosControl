import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getToken } from "next-auth/jwt"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const session = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const empresaId = (session as any)?.empresaId
    if (!empresaId) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const page        = Math.max(1, parseInt(searchParams.get("page")   ?? "1"))
    const limit       = Math.min(100, parseInt(searchParams.get("limit") ?? "25"))
    const skip        = (page - 1) * limit
    const auxiliarId  = searchParams.get("auxiliarId")  || undefined
    const usuarioId   = searchParams.get("usuarioId")   || undefined
    const accion      = searchParams.get("accion")      || undefined
    const modulo      = searchParams.get("modulo")      || undefined
    const severidad   = searchParams.get("severidad")   || undefined
    const entidad     = searchParams.get("entidad")     || undefined
    const busqueda    = searchParams.get("busqueda")    || undefined
    const desde       = searchParams.get("desde")       || undefined
    const hasta       = searchParams.get("hasta")       || undefined
    const entidadId   = searchParams.get("entidadId")   || undefined

    const where: Record<string, unknown> = { empresaId }
    if (auxiliarId && auxiliarId !== 'all') where.auxiliarId = auxiliarId
    if (usuarioId  && usuarioId  !== 'all') where.usuarioId  = usuarioId
    if (accion     && accion     !== 'all') where.accion     = accion
    if (modulo     && modulo     !== 'all') where.modulo     = modulo
    if (severidad  && severidad  !== 'all') where.severidad  = severidad
    if (entidad    && entidad    !== 'all') where.entidad    = { contains: entidad, mode: 'insensitive' }
    if (entidadId) where.entidadId = entidadId
    if (busqueda) {
      where.OR = [
        { descripcion:     { contains: busqueda, mode: 'insensitive' } },
        { accionDetallada: { contains: busqueda, mode: 'insensitive' } },
        { entidad:         { contains: busqueda, mode: 'insensitive' } },
      ]
    }
    if (desde || hasta) {
      where.creadoEn = {
        ...(desde ? { gte: new Date(desde) } : {}),
        ...(hasta ? { lte: new Date(hasta + "T23:59:59") } : {}),
      }
    }

    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    const hace7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [registros, total, accionesHoy, eventosCriticos7d, totalRegistros, auxiliares, usuarios] = await Promise.all([
      prisma.registroAuditoria.findMany({
        where,
        orderBy: { creadoEn: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          accion: true,
          modulo: true,
          entidad: true,
          entidadId: true,
          descripcion: true,
          accionDetallada: true,
          severidad: true,
          esMasiva: true,
          esAutomatico: true,
          requiereRevision: true,
          ipAddress: true,
          userAgent: true,
          valorAntes: true,
          valorDespues: true,
          creadoEn: true,
          usuario:  { select: { id: true, nombres: true, apellidos: true, correo: true, rol: true } },
          auxiliar: { select: { id: true, nombres: true, apellidos: true, correo: true } },
        },
      }),
      prisma.registroAuditoria.count({ where }),
      prisma.registroAuditoria.count({ where: { empresaId, creadoEn: { gte: hoy } } }),
      prisma.registroAuditoria.count({ where: { empresaId, severidad: { in: ['ALTO', 'CRITICO'] }, creadoEn: { gte: hace7d } } }),
      prisma.registroAuditoria.count({ where: { empresaId } }),
      prisma.auxiliar.findMany({ where: { empresaId }, select: { id: true, nombres: true, apellidos: true }, orderBy: { nombres: "asc" } }),
      prisma.usuario.findMany({ where: { empresaId, estaActivo: true }, select: { id: true, nombres: true, apellidos: true, rol: true }, orderBy: { nombres: "asc" } }),
    ])

    return NextResponse.json({
      registros,
      total,
      page,
      limit,
      auxiliares,
      usuarios,
      stats: { accionesHoy, eventosCriticos7d, totalRegistros },
    })
  } catch (error) {
    console.error("Error al obtener auditoría:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
