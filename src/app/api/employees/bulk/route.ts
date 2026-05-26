import { NextRequest, NextResponse } from "next/server"
import { getAuthToken } from "@/lib/getAuthToken"
import { prisma } from "@/lib/prisma"
import { empleadoSchema } from "@/lib/schemas/empleado"
import type { Prisma } from "@prisma/client"
import { z } from "zod"

export const dynamic = "force-dynamic"

const BATCH_SIZE = 100

const bulkSchema = z.object({
  empleados: z
    .array(empleadoSchema)
    .min(1, "Al menos un empleado requerido")
    .max(1000, "Máximo 1000 empleados por lote"),
})

export async function POST(request: NextRequest) {
  try {
    const token = await getAuthToken(request)
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const empresaId = (token as any)?.empresaId as string
    if (!empresaId) return NextResponse.json({ error: "Sin empresa asignada" }, { status: 403 })

    const userType = (token as any)?.userType as string
    const userId = (token as any)?.id as string

    const body = await request.json()
    const parsed = bulkSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload inválido", details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const { empleados } = parsed.data

    // Detect duplicates within the payload itself
    const docsInPayload = empleados.map((e) => e.numeroDocumento)
    const dupesInPayload = docsInPayload.filter((d, i) => docsInPayload.indexOf(d) !== i)
    if (dupesInPayload.length > 0) {
      return NextResponse.json(
        { error: "Documentos duplicados en el archivo", duplicates: Array.from(new Set(dupesInPayload)) },
        { status: 422 }
      )
    }

    // Pre-fetch existing documents to avoid individual DB calls per row
    const existingDocs = await prisma.empleado.findMany({
      where: { empresaId, numeroDocumento: { in: docsInPayload } },
      select: { numeroDocumento: true },
    })
    const existingSet = new Set(existingDocs.map((e) => e.numeroDocumento))

    const result = {
      created: 0,
      failed: 0,
      total: empleados.length,
      errors: [] as Array<{ index: number; numeroDocumento: string; error: string }>,
    }

    for (let i = 0; i < empleados.length; i += BATCH_SIZE) {
      const batch = empleados.slice(i, i + BATCH_SIZE)
      const toInsert: Prisma.EmpleadoCreateManyInput[] = []

      for (let j = 0; j < batch.length; j++) {
        const emp = batch[j]
        const idx = i + j

        if (existingSet.has(emp.numeroDocumento)) {
          result.failed++
          result.errors.push({
            index: idx,
            numeroDocumento: emp.numeroDocumento,
            error: "Documento ya registrado en esta empresa",
          })
          continue
        }

        toInsert.push({
          empresaId,
          tipoDocumento: emp.tipoDocumento,
          numeroDocumento: emp.numeroDocumento,
          nombres: emp.nombres.trim(),
          apellidos: emp.apellidos.trim(),
          centroCosto: emp.centroCosto ?? null,
          programa: emp.programa ?? null,
          modalidad: emp.modalidad ?? null,
          cargo: emp.cargo ?? null,
          fechaIngreso: new Date(emp.fechaIngreso),
          tipoVinculacion: emp.tipoVinculacion,
          tipoContrato: emp.tipoContrato,
          salarioBase: emp.salarioBase,
          horasSemanales: emp.horasSemanales,
          tieneAuxilioTransporte: emp.tieneAuxilioTransporte,
          estaActivo: true,
          creadoPorUsuarioId: userType !== "auxiliar" ? userId : null,
          creadoPorAuxiliarId: userType === "auxiliar" ? userId : null,
        })
      }

      if (toInsert.length > 0) {
        try {
          const created = await prisma.empleado.createMany({
            data: toInsert,
            skipDuplicates: true,
          })
          result.created += created.count
        } catch (err) {
          console.error("[BULK_INSERT_BATCH]", err)
          result.failed += toInsert.length
          for (const emp of toInsert) {
            result.errors.push({
              index: -1,
              numeroDocumento: emp.numeroDocumento,
              error: "Error al insertar en base de datos",
            })
          }
        }
      }
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("[POST /api/employees/bulk]", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
