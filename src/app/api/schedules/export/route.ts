import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getToken } from "next-auth/jwt"
import ExcelJS from "exceljs"

export const dynamic = "force-dynamic"

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

function fmtDate(d: Date) {
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`
}

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const empresaId = (token as any)?.empresaId
    if (!empresaId) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const startDate   = searchParams.get("startDate")
    const endDate     = searchParams.get("endDate")
    const empleadoId  = searchParams.get("empleadoId")
    const centroCosto = searchParams.get("centroCosto")
    const programa    = searchParams.get("programa")
    const modalidad   = searchParams.get("modalidad")
    const search      = searchParams.get("search")

    const whereClause: any = { empresaId }

    if (startDate && endDate) {
      whereClause.fechaTurno = {
        gte: new Date(startDate + "T00:00:00Z"),
        lte: new Date(endDate + "T23:59:59Z"),
      }
    }

    if (empleadoId) whereClause.empleadoId = empleadoId

    const empWhere: any = {}
    if (centroCosto) empWhere.centroCosto = centroCosto
    if (programa)    empWhere.programa    = programa
    if (modalidad)   empWhere.modalidad   = modalidad
    if (search)      empWhere.OR = [
      { nombres:  { contains: search, mode: "insensitive" } },
      { apellidos: { contains: search, mode: "insensitive" } },
    ]
    if (Object.keys(empWhere).length > 0) whereClause.empleado = empWhere

    const asignaciones = await prisma.asignacionTurno.findMany({
      where: whereClause,
      include: {
        concepto: true,
        empleado: {
          select: {
            id: true, nombres: true, apellidos: true,
            numeroDocumento: true, centroCosto: true, programa: true, modalidad: true,
          },
        },
      },
      orderBy: [{ empleadoId: "asc" }, { fechaTurno: "asc" }],
    })

    const workbook  = new ExcelJS.Workbook()
    workbook.creator = "TurnosControl"
    workbook.created  = new Date()

    const sheet = workbook.addWorksheet("Historial de Turnos")

    // Header row
    const headers = [
      "Empleado", "Documento", "Centro Costo", "Programa", "Modalidad",
      "Fecha", "Día", "Código Concepto", "Concepto", "Hora Inicio", "Hora Fin",
    ]
    const headerRow = sheet.addRow(headers)
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7C3AED" } }
      cell.alignment = { vertical: "middle", horizontal: "center" }
      cell.border = {
        top: { style: "thin" }, left: { style: "thin" },
        bottom: { style: "thin" }, right: { style: "thin" },
      }
    })
    sheet.getRow(1).height = 20

    // Column widths
    const colWidths = [28, 14, 20, 20, 14, 12, 6, 14, 28, 12, 12]
    colWidths.forEach((w, i) => { sheet.getColumn(i + 1).width = w })

    // Data rows
    asignaciones.forEach((a, idx) => {
      const fecha  = new Date(a.fechaTurno)
      const hIn    = a.horaInicioPersonalizada || a.concepto.horaInicioDefecto || ""
      const hFin   = a.horaFinPersonalizada   || a.concepto.horaFinDefecto   || ""
      const row = sheet.addRow([
        `${a.empleado.nombres} ${a.empleado.apellidos}`,
        a.empleado.numeroDocumento,
        a.empleado.centroCosto || "",
        a.empleado.programa    || "",
        a.empleado.modalidad   || "",
        fmtDate(fecha),
        DIAS[fecha.getDay()],
        a.concepto.codigo,
        a.concepto.nombre,
        hIn,
        hFin,
      ])
      const bg = idx % 2 === 0 ? "FFFAF5FF" : "FFFFFFFF"
      row.eachCell(cell => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } }
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        }
        cell.alignment = { vertical: "middle" }
      })
    })

    // Concept color dot in column 9 (Concepto) using cell fill where possible — skip, just use row stripe
    sheet.views = [{ state: "frozen", ySplit: 1 }]

    const buffer = await workbook.xlsx.writeBuffer()
    const label  = startDate && endDate ? `${startDate}_${endDate}` : "historial"
    const filename = `Historial_Turnos_${label}.xlsx`

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Error exportando historial:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
