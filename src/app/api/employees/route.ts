import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthToken } from "@/lib/getAuthToken"
import { registrarAuditoria } from "@/lib/auditoria"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthToken(request)
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const empresaId = (session as any)?.empresaId

    if (!empresaId) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })
    }

    try {
      const { searchParams } = new URL(request.url)
      const soloMios      = searchParams.get("soloMios") === "true"
      const auxiliarIdFilt = searchParams.get("auxiliarId")
      const userType      = (session as any)?.userType

      // When an auxiliar requests with soloMios, filter to their created employees
      const auxiliarFilter = (soloMios && userType === "auxiliar")
        ? { creadoPorAuxiliarId: (session as any).id }
        : auxiliarIdFilt
          ? { creadoPorAuxiliarId: auxiliarIdFilt }
          : {}

      const empleados = await prisma.empleado.findMany({
        where: {
          empresaId: empresaId,
          estaActivo: true,
          ...auxiliarFilter,
        },
        orderBy: {
          creadoEn: 'desc'
        },
        select: {
          id: true,
          tipoDocumento: true,
          numeroDocumento: true,
          nombres: true,
          apellidos: true,
          centroCosto: true,
          programa: true,
          modalidad: true,
          cargo: true,
          fechaIngreso: true,
          tipoVinculacion: true,
          salarioBase: true,
          tieneAuxilioTransporte: true,
          tipoContrato: true,
          horasSemanales: true,
          estaActivo: true,
          creadoEn: true,
          creadoPorAuxiliarId: true,
          creadoPorUsuarioId: true,
          auxiliarCreador: {
            select: {
              id: true,
              nombres: true,
              apellidos: true,
              correo: true
            }
          },
          usuarioCreador: {
            select: {
              id: true,
              nombres: true,
              apellidos: true,
              correo: true
            }
          }
        }
      })

      console.log(`Empleados encontrados: ${empleados.length}`)
      return NextResponse.json(empleados)
    } catch (dbError) {
      console.error("Error en base de datos al obtener empleados:", dbError)
      return NextResponse.json(
        { error: "Error al obtener empleados", details: (dbError as Error).message },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error("Error al obtener empleados:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthToken(request)
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const empresaId = (session as any)?.empresaId

    if (!empresaId) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })
    }

    const body = await request.json()
    
    // Validar datos requeridos
    const { nombres, apellidos, numeroDocumento, fechaIngreso, salarioBase } = body
    
    if (!nombres || !apellidos || !numeroDocumento || !fechaIngreso || !salarioBase) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: nombres, apellidos, numeroDocumento, fechaIngreso, salarioBase" },
        { status: 400 }
      )
    }

    // Validar que el documento no exista
    const existingEmpleado = await prisma.empleado.findFirst({
      where: {
        empresaId: empresaId,
        numeroDocumento: body.numeroDocumento
      }
    })

    if (existingEmpleado) {
      return NextResponse.json(
        { error: "Ya existe un empleado con ese número de documento" },
        { status: 400 }
      )
    }

    const empleado = await prisma.empleado.create({
      data: {
        empresaId,
        tipoDocumento: body.tipoDocumento,
        numeroDocumento: body.numeroDocumento,
        nombres: body.nombres,
        apellidos: body.apellidos,
        centroCosto: body.centroCosto,
        programa: body.programa,
        modalidad: body.modalidad,
        cargo: body.cargo,
        fechaIngreso: new Date(body.fechaIngreso),
        tipoVinculacion: body.tipoVinculacion,
        salarioBase: parseFloat(body.salarioBase),
        tieneAuxilioTransporte: body.tieneAuxilioTransporte,
        tipoContrato: body.tipoContrato,
        horasSemanales: parseFloat(body.horasSemanales),
        estaActivo: true,
        creadoPorUsuarioId:  (session as any)?.userType !== "auxiliar" ? (session as any)?.id : null,
        creadoPorAuxiliarId: (session as any)?.userType === "auxiliar"  ? (session as any)?.id : null,
      }
    })

    await registrarAuditoria({
      empresaId,
      usuarioId: (session as any)?.userType !== 'auxiliar' ? (session as any)?.id ?? null : null,
      auxiliarId: (session as any)?.userType === 'auxiliar' ? (session as any)?.id : null,
      accion: 'CREAR',
      modulo: 'EMPLEADOS',
      entidad: 'Empleado',
      entidadId: empleado.id,
      descripcion: `Empleado creado: ${empleado.nombres} ${empleado.apellidos}`,
      accionDetallada: `Creación de empleado con documento ${empleado.numeroDocumento}`,
      severidad: 'INFO',
    })

    return NextResponse.json(empleado, { status: 201 })

  } catch (error) {
    console.error("Error al crear empleado:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
