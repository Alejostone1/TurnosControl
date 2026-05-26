import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthToken } from "@/lib/getAuthToken"
import { CalculationService } from "@/services/calculation.service"

export const dynamic = 'force-dynamic'

// Función para asignar empleados a un período según criterios
async function asignarEmpleadosAPeriodo(periodoId: string, empresaId: string, body: any) {
  const { criterioSeleccion, centroCosto, programa, documentos, empleadosSeleccionados } = body
  
  let empleadosIds: string[] = []

  try {
    switch (criterioSeleccion) {
      case "TODOS":
        // Obtener todos los empleados activos de la empresa
        const todosEmpleados = await prisma.empleado.findMany({
          where: {
            empresaId: empresaId,
            estaActivo: true
          },
          select: { id: true }
        })
        empleadosIds = todosEmpleados.map(e => e.id)
        break

      case "CENTRO_COSTO":
        // Obtener empleados por centro de costo
        const empleadosCentro = await prisma.empleado.findMany({
          where: {
            empresaId: empresaId,
            estaActivo: true,
            centroCosto: centroCosto
          },
          select: { id: true }
        })
        empleadosIds = empleadosCentro.map(e => e.id)
        break

      case "PROGRAMA":
        // Obtener empleados por programa
        const empleadosPrograma = await prisma.empleado.findMany({
          where: {
            empresaId: empresaId,
            estaActivo: true,
            programa: programa
          },
          select: { id: true }
        })
        empleadosIds = empleadosPrograma.map(e => e.id)
        break

      case "MODALIDAD":
        // Obtener empleados por modalidad
        const empleadosModalidad = await prisma.empleado.findMany({
          where: {
            empresaId: empresaId,
            estaActivo: true,
            modalidad: body.modalidad
          },
          select: { id: true }
        })
        empleadosIds = empleadosModalidad.map(e => e.id)
        break

      case "DOCUMENTO":
        // Obtener empleados por números de documento
        const documentosArray = documentos.split(',').map((d: string) => d.trim()).filter((d: string) => d)
        const empleadosDocumento = await prisma.empleado.findMany({
          where: {
            empresaId: empresaId,
            estaActivo: true,
            numeroDocumento: {
              in: documentosArray
            }
          },
          select: { id: true }
        })
        empleadosIds = empleadosDocumento.map(e => e.id)
        break

      case "MANUAL":
        // Usar la lista de IDs proporcionada
        empleadosIds = empleadosSeleccionados || []
        break

      case "FILTROS": {
        // Aplicar todos los filtros disponibles como AND opcionales
        const filtros: Record<string, string> = {}
        if (centroCosto) filtros.centroCosto = centroCosto
        if (programa) filtros.programa = programa
        if (body.modalidad) filtros.modalidad = body.modalidad
        const empleadosFiltros = await prisma.empleado.findMany({
          where: {
            empresaId: empresaId,
            estaActivo: true,
            ...filtros
          },
          select: { id: true }
        })
        empleadosIds = empleadosFiltros.map(e => e.id)
        break
      }

      default:
        throw new Error("Criterio de selección no válido")
    }

    // Crear las asignaciones en lote
    if (empleadosIds.length > 0) {
      await prisma.empleadoPeriodo.createMany({
        data: empleadosIds.map(empleadoId => ({
          empleadoId,
          periodoId,
          estadoAsignacion: "ACTIVO",
          creadoPor: body.userId || null
        })),
        skipDuplicates: true // Evitar duplicados
      })
    }

    console.log(`Asignados ${empleadosIds.length} empleados al período ${periodoId}`)

  } catch (error) {
    console.error("Error al asignar empleados al período:", error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = await getAuthToken(request)
    
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const empresaId = (token as any)?.empresaId

    if (!empresaId) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })
    }

    const periodos = await prisma.periodoNomina.findMany({
      where: {
        empresaId: empresaId
      },
      include: {
        configuracionLegal: true,
        _count: {
          select: {
            registrosDias: true,
            resultadosNomina: true
          }
        }
      },
      orderBy: {
        fechaInicio: 'desc'
      }
    })

    return NextResponse.json(periodos)

  } catch (error) {
    console.error("Error al obtener períodos:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getAuthToken(request)
    
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const empresaId = (token as any)?.empresaId
    const userId = (token as any)?.id

    if (!empresaId) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })
    }

    const body = await request.json()

    // Obtener configuración legal activa
    const configLegal = await prisma.configuracionLegal.findFirst({
      where: {
        empresaId: empresaId,
        estaActiva: true
      }
    })

    if (!configLegal) {
      return NextResponse.json(
        { error: "No hay configuración legal activa" },
        { status: 400 }
      )
    }

    // Verificar que no exista un período con las mismas fechas
    const existingPeriodo = await prisma.periodoNomina.findFirst({
      where: {
        empresaId: empresaId,
        fechaInicio: new Date(body.fechaInicio),
        fechaFin: new Date(body.fechaFin)
      }
    })

    if (existingPeriodo) {
      return NextResponse.json(
        { error: "Ya existe un período con estas fechas" },
        { status: 400 }
      )
    }

    const periodo = await prisma.periodoNomina.create({
      data: {
        empresaId: empresaId,
        nombrePeriodo: body.nombrePeriodo,
        tipoPeriodo: body.tipoPeriodo || "MENSUAL",
        tipoCalculoHorasExtras: body.tipoCalculoHorasExtras || "SEMANAL",
        fechaInicio: new Date(body.fechaInicio),
        fechaFin: new Date(body.fechaFin),
        fechaCorte: body.fechaCorte ? new Date(body.fechaCorte) : new Date(body.fechaFin),
        configuracionLegalId: configLegal.id,
        minutosAlimentacion: body.minutosAlimentacion != null ? Number(body.minutosAlimentacion) : null,
        estadoPeriodo: "BORRADOR",
        creadoPor: userId
      },
      include: {
        configuracionLegal: true
      }
    })

    // Asignar empleados según el criterio seleccionado
    await asignarEmpleadosAPeriodo(periodo.id, empresaId, { ...body, userId })

    return NextResponse.json(periodo, { status: 201 })

  } catch (error) {
    console.error("Error al crear período:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = await getAuthToken(request)
    
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const empresaId = (token as any)?.empresaId

    if (!empresaId) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })
    }

    const url = new URL(request.url)
    const periodoId = url.pathname.split('/').pop()

    if (!periodoId) {
      return NextResponse.json({ error: "ID de período no proporcionado" }, { status: 400 })
    }

    // Verificar que el período existe y pertenece a la empresa
    const periodo = await prisma.periodoNomina.findFirst({
      where: {
        id: periodoId,
        empresaId: empresaId
      }
    })

    if (!periodo) {
      return NextResponse.json({ error: "Período no encontrado" }, { status: 404 })
    }

    // Verificar que el período está en estado BORRADOR
    if (periodo.estadoPeriodo !== "BORRADOR") {
      return NextResponse.json({ 
        error: "Solo se pueden eliminar períodos en estado BORRADOR" 
      }, { status: 400 })
    }

    // Eliminar el período (las relaciones se eliminarán en cascada)
    await prisma.periodoNomina.delete({
      where: {
        id: periodoId
      }
    })

    return NextResponse.json({ message: "Período eliminado exitosamente" }, { status: 200 })

  } catch (error) {
    console.error("Error al eliminar período:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
