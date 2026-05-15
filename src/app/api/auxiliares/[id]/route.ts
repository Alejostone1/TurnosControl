import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getToken } from "next-auth/jwt"
import bcrypt from "bcryptjs"
import { registrarAuditoria } from "@/lib/auditoria"

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

    const auxiliar = await prisma.auxiliar.findFirst({
      where: { id: params.id, empresaId },
      select: {
        id: true,
        correo: true,
        nombres: true,
        apellidos: true,
        documento: true,
        telefono: true,
        estaActivo: true,
        creadoEn: true,
        actualizadoEn: true,
        creadoPor: true,
        _count: { select: { empleadosCreados: true } },
        empleadosCreados: {
          take: 5,
          orderBy: { creadoEn: "desc" },
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            cargo: true,
            centroCosto: true,
            estaActivo: true,
            creadoEn: true,
          },
        },
      },
    })

    if (!auxiliar) return NextResponse.json({ error: "Auxiliar no encontrado" }, { status: 404 })

    return NextResponse.json(auxiliar)
  } catch (error) {
    console.error("Error al obtener auxiliar:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const empresaId = (session as any)?.empresaId
    if (!empresaId) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })

    const rol = (session as any)?.rol
    if (rol !== "SUPER_ADMIN" && rol !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No tienes permisos para editar auxiliares" }, { status: 403 })
    }

    const existente = await prisma.auxiliar.findFirst({ where: { id: params.id, empresaId } })
    if (!existente) return NextResponse.json({ error: "Auxiliar no encontrado" }, { status: 404 })

    const body = await request.json()

    // Validar unicidad de correo si cambió
    if (body.correo && body.correo !== existente.correo) {
      const duplicado = await prisma.auxiliar.findFirst({
        where: { empresaId, correo: body.correo, id: { not: params.id } },
      })
      if (duplicado) return NextResponse.json({ error: "Ya existe un auxiliar con ese correo" }, { status: 400 })
    }

    // Validar unicidad de documento si cambió
    if (body.documento && body.documento !== existente.documento) {
      const duplicado = await prisma.auxiliar.findFirst({
        where: { empresaId, documento: body.documento, id: { not: params.id } },
      })
      if (duplicado) return NextResponse.json({ error: "Ya existe un auxiliar con ese documento" }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {
      nombres:   body.nombres   ?? existente.nombres,
      apellidos: body.apellidos ?? existente.apellidos,
      documento: body.documento !== undefined ? body.documento : existente.documento,
      telefono:  body.telefono  !== undefined ? body.telefono  : existente.telefono,
      estaActivo: body.estaActivo !== undefined ? body.estaActivo : existente.estaActivo,
    }

    if (body.correo) updateData.correo = body.correo

    if (body.contrasena) {
      if (body.contrasena.length < 8) {
        return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 })
      }
      updateData.contrasena = await bcrypt.hash(body.contrasena, 10)
    }

    const auxiliar = await prisma.auxiliar.update({
      where: { id: params.id },
      data: updateData,
    })

    await registrarAuditoria({
      empresaId,
      usuarioId:   (session as any)?.usuarioId,
      accion:      "ACTUALIZAR",
      entidad:     "Auxiliar",
      entidadId:   auxiliar.id,
      valorAntes:  { nombres: existente.nombres, apellidos: existente.apellidos, correo: existente.correo, estaActivo: existente.estaActivo },
      valorDespues: { nombres: auxiliar.nombres, apellidos: auxiliar.apellidos, correo: auxiliar.correo, estaActivo: auxiliar.estaActivo },
      descripcion: `Auxiliar actualizado: ${auxiliar.nombres} ${auxiliar.apellidos}`,
    })

    const { contrasena: _, ...auxiliarData } = auxiliar
    return NextResponse.json(auxiliarData)
  } catch (error) {
    console.error("Error al actualizar auxiliar:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const empresaId = (session as any)?.empresaId
    if (!empresaId) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })

    const rol = (session as any)?.rol
    if (rol !== "SUPER_ADMIN" && rol !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No tienes permisos para eliminar auxiliares" }, { status: 403 })
    }

    const existente = await prisma.auxiliar.findFirst({ where: { id: params.id, empresaId } })
    if (!existente) return NextResponse.json({ error: "Auxiliar no encontrado" }, { status: 404 })

    await prisma.auxiliar.update({
      where: { id: params.id },
      data: { estaActivo: false },
    })

    await registrarAuditoria({
      empresaId,
      usuarioId:   (session as any)?.usuarioId,
      accion:      "ELIMINAR",
      entidad:     "Auxiliar",
      entidadId:   params.id,
      descripcion: `Auxiliar desactivado: ${existente.nombres} ${existente.apellidos}`,
    })

    return NextResponse.json({ message: "Auxiliar desactivado exitosamente" })
  } catch (error) {
    console.error("Error al eliminar auxiliar:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
