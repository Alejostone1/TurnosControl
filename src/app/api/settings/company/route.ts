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

    const empresa = await prisma.empresa.findUnique({
      where: {
        id: empresaId
      }
    })

    if (!empresa) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 })
    }

    return NextResponse.json(empresa)

  } catch (error) {
    console.error("Error al obtener empresa:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const empresaId = (token as any)?.empresaId
    const userRole = (token as any)?.role

    if (!empresaId) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })
    }

    // Solo administradores y super admin pueden modificar la empresa
    if (userRole !== "ADMINISTRADOR" && userRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "No tienes permisos para realizar esta acción" }, { status: 403 })
    }

    const body = await request.json()

    // Verificar que la empresa existe
    const empresaExistente = await prisma.empresa.findUnique({
      where: {
        id: empresaId
      }
    })

    if (!empresaExistente) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 })
    }

    // Validaciones básicas
    if (!body.nombre || body.nombre.trim() === "") {
      return NextResponse.json({ error: "El nombre de la empresa es obligatorio" }, { status: 400 })
    }

    // Verificar que el nombre no esté en uso por otra empresa
    if (body.nombre !== empresaExistente.nombre) {
      const nombreExistente = await prisma.empresa.findFirst({
        where: {
          nombre: body.nombre,
          id: {
            not: empresaId
          }
        }
      })

      if (nombreExistente) {
        return NextResponse.json({ error: "Ya existe otra empresa con este nombre" }, { status: 400 })
      }
    }

    // Verificar que el correo no esté en uso por otra empresa
    if (body.correo && body.correo !== empresaExistente.correo) {
      const correoExistente = await prisma.empresa.findFirst({
        where: {
          correo: body.correo,
          id: {
            not: empresaId
          }
        }
      })

      if (correoExistente) {
        return NextResponse.json({ error: "Ya existe otra empresa con este correo" }, { status: 400 })
      }
    }

    // Actualizar empresa
    const empresaActualizada = await prisma.empresa.update({
      where: {
        id: empresaId
      },
      data: {
        nombre: body.nombre,
        nit: body.nit || null,
        correo: body.correo || null,
        telefono: body.telefono || null,
        direccion: body.direccion || null,
        estado: body.estado || empresaExistente.estado,
        configuracionPredeterminada: body.configuracionPredeterminada || empresaExistente.configuracionPredeterminada,
        actualizadoEn: new Date()
      }
    })

    return NextResponse.json(empresaActualizada)

  } catch (error) {
    console.error("Error al actualizar empresa:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
