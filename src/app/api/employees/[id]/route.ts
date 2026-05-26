import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthToken } from "@/lib/getAuthToken"
import { registrarAuditoria } from "@/lib/auditoria"

export const dynamic = 'force-dynamic'

// GET - Obtener un empleado específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthToken(request)
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const empresaId = (session as any)?.empresaId

    if (!empresaId) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })
    }

    const empleado = await prisma.empleado.findFirst({
      where: {
        id: params.id,
        empresaId: empresaId
      },
      include: {
        auxiliarCreador: { select: { id: true, nombres: true, apellidos: true, correo: true } },
        usuarioCreador:  { select: { id: true, nombres: true, apellidos: true, correo: true } },
      },
    })

    if (!empleado) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 })
    }

    return NextResponse.json(empleado)

  } catch (error) {
    console.error("Error al obtener empleado:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// PUT - Actualizar un empleado
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verificar que el empleado exista y pertenezca a la empresa
    const existingEmpleado = await prisma.empleado.findFirst({
      where: {
        id: params.id,
        empresaId: empresaId
      }
    })

    if (!existingEmpleado) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 })
    }

    // Si se está cambiando el documento, verificar que no exista otro empleado con ese documento
    if (body.numeroDocumento && body.numeroDocumento !== existingEmpleado.numeroDocumento) {
      const duplicateEmpleado = await prisma.empleado.findFirst({
        where: {
          empresaId: empresaId,
          numeroDocumento: body.numeroDocumento,
          id: { not: params.id }
        }
      })

      if (duplicateEmpleado) {
        return NextResponse.json(
          { error: "Ya existe un empleado con ese número de documento" },
          { status: 400 }
        )
      }
    }

    const empleado = await prisma.empleado.update({
      where: { id: params.id },
      data: {
        tipoDocumento: body.tipoDocumento,
        numeroDocumento: body.numeroDocumento,
        nombres: body.nombres,
        apellidos: body.apellidos,
        centroCosto: body.centroCosto,
        programa: body.programa,
        modalidad: body.modalidad,
        cargo: body.cargo,
        fechaIngreso: body.fechaIngreso ? new Date(body.fechaIngreso) : existingEmpleado.fechaIngreso,
        tipoVinculacion: body.tipoVinculacion,
        salarioBase: body.salarioBase ? parseFloat(body.salarioBase) : existingEmpleado.salarioBase,
        tieneAuxilioTransporte: body.tieneAuxilioTransporte,
        tipoContrato: body.tipoContrato,
        horasSemanales: body.horasSemanales ? parseFloat(body.horasSemanales) : existingEmpleado.horasSemanales,
        estaActivo: body.estaActivo,
        actualizadoEn: new Date()
      }
    })

    const salarioCambio = body.salarioBase !== undefined && body.salarioBase !== existingEmpleado.salarioBase
    await registrarAuditoria({
      empresaId,
      usuarioId: (session as any)?.id ?? null,
      accion: 'ACTUALIZAR',
      modulo: 'EMPLEADOS',
      entidad: 'Empleado',
      entidadId: params.id,
      valorAntes: { salarioBase: existingEmpleado.salarioBase, cargo: existingEmpleado.cargo, estaActivo: existingEmpleado.estaActivo },
      valorDespues: { salarioBase: empleado.salarioBase, cargo: empleado.cargo, estaActivo: empleado.estaActivo },
      descripcion: `Empleado actualizado: ${empleado.nombres} ${empleado.apellidos}`,
      accionDetallada: salarioCambio ? `Cambio de salario: ${existingEmpleado.salarioBase} → ${empleado.salarioBase}` : 'Actualización de datos',
      severidad: salarioCambio ? 'ALTO' : 'BAJO',
      requiereRevision: salarioCambio,
    })

    return NextResponse.json(empleado)

  } catch (error) {
    console.error("Error al actualizar empleado:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar un empleado (baja lógica)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthToken(request)
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const empresaId = (session as any)?.empresaId

    if (!empresaId) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })
    }

    // Verificar que el empleado exista y pertenezca a la empresa
    const existingEmpleado = await prisma.empleado.findFirst({
      where: {
        id: params.id,
        empresaId: empresaId
      }
    })

    if (!existingEmpleado) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 })
    }

    // Baja lógica: marcar como inactivo en lugar de eliminar
    const empleado = await prisma.empleado.update({
      where: { id: params.id },
      data: {
        estaActivo: false,
        actualizadoEn: new Date()
      }
    })

    await registrarAuditoria({
      empresaId,
      usuarioId: (session as any)?.id ?? null,
      accion: 'DESACTIVAR',
      modulo: 'EMPLEADOS',
      entidad: 'Empleado',
      entidadId: params.id,
      descripcion: `Empleado desactivado: ${existingEmpleado.nombres} ${existingEmpleado.apellidos}`,
      severidad: 'MEDIO',
      requiereRevision: true,
    })

    return NextResponse.json({
      message: "Empleado eliminado exitosamente",
      empleado
    })

  } catch (error) {
    console.error("Error al eliminar empleado:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
