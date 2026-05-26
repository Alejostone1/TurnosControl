import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthToken } from "@/lib/getAuthToken"
import bcrypt from "bcryptjs"
import { registrarAuditoria } from "@/lib/auditoria"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthToken(request)
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const empresaId = (session as any)?.empresaId
    if (!empresaId) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") ?? ""
    const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1"))
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "50"))
    const skip  = (page - 1) * limit

    const where = {
      empresaId,
      estaActivo: true,
      ...(search ? {
        OR: [
          { nombres:   { contains: search, mode: "insensitive" as const } },
          { apellidos: { contains: search, mode: "insensitive" as const } },
          { correo:    { contains: search, mode: "insensitive" as const } },
          { documento: { contains: search, mode: "insensitive" as const } },
        ]
      } : {})
    }

    const [auxiliares, total] = await Promise.all([
      prisma.auxiliar.findMany({
        where,
        orderBy: { creadoEn: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          correo: true,
          nombres: true,
          apellidos: true,
          documento: true,
          telefono: true,
          estaActivo: true,
          creadoEn: true,
          _count: { select: { empleadosCreados: true } },
        },
      }),
      prisma.auxiliar.count({ where }),
    ])

    return NextResponse.json({ auxiliares, total, page, limit })
  } catch (error) {
    console.error("Error al obtener auxiliares:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthToken(request)
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const empresaId = (session as any)?.empresaId
    if (!empresaId) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })

    const rol = (session as any)?.rol
    if (rol !== "SUPER_ADMIN" && rol !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No tienes permisos para crear auxiliares" }, { status: 403 })
    }

    const body = await request.json()
    const { correo, contrasena, nombres, apellidos } = body

    if (!correo || !contrasena || !nombres || !apellidos) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: correo, contrasena, nombres, apellidos" },
        { status: 400 }
      )
    }

    if (contrasena.length < 8) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 })
    }

    const existeCorreo = await prisma.auxiliar.findFirst({ where: { empresaId, correo } })
    if (existeCorreo) {
      return NextResponse.json({ error: "Ya existe un auxiliar con ese correo" }, { status: 400 })
    }

    if (body.documento) {
      const existeDoc = await prisma.auxiliar.findFirst({ where: { empresaId, documento: body.documento } })
      if (existeDoc) {
        return NextResponse.json({ error: "Ya existe un auxiliar con ese número de documento" }, { status: 400 })
      }
    }

    const hashedPassword = await bcrypt.hash(contrasena, 10)

    const auxiliar = await prisma.auxiliar.create({
      data: {
        empresaId,
        correo:    body.correo,
        contrasena: hashedPassword,
        nombres:   body.nombres,
        apellidos: body.apellidos,
        documento: body.documento ?? null,
        telefono:  body.telefono  ?? null,
        estaActivo: true,
        creadoPor: (session as any)?.usuarioId ?? null,
      },
    })

    await registrarAuditoria({
      empresaId,
      usuarioId:   (session as any)?.usuarioId,
      accion:      "CREAR",
      entidad:     "Auxiliar",
      entidadId:   auxiliar.id,
      descripcion: `Auxiliar creado: ${auxiliar.nombres} ${auxiliar.apellidos}`,
    })

    const { contrasena: _, ...auxiliarData } = auxiliar
    return NextResponse.json(auxiliarData, { status: 201 })
  } catch (error) {
    console.error("Error al crear auxiliar:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
