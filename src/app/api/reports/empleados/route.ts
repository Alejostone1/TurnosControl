import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getToken } from "next-auth/jwt"
import ExcelJS from "exceljs"

export const dynamic = "force-dynamic"

const H_BG = "FF5B21B6"
const H_FG = "FFFFFFFF"
const ALT  = "FFF5F3FF"

function styleHeader(ws: ExcelJS.Worksheet, rowNum: number) {
  const row = ws.getRow(rowNum)
  row.height = 32
  row.font      = { bold: true, color: { argb: H_FG }, size: 9, name: "Calibri" }
  row.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: H_BG } }
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
  row.eachCell(cell => {
    cell.border = { bottom: { style: "medium", color: { argb: "FF7C3AED" } }, right: { style: "thin", color: { argb: "FF7C3AED" } } }
  })
}

const TIPO_VINC: Record<string, string> = {
  TIEMPO_COMPLETO: "Tiempo Completo",
  MEDIO_TIEMPO: "Medio Tiempo",
  TEMPORAL: "Temporal",
  APRENDIZ_SENA: "Aprendiz SENA",
  PRACTICANTE: "Practicante",
}
const TIPO_CONT: Record<string, string> = {
  TERMINO_INDEFINIDO: "Término Indefinido",
  TERMINO_FIJO: "Término Fijo",
  OBRA_LABOR: "Obra/Labor",
  PRESTACION_SERVICIOS: "Prestación de Servicios",
  APRENDIZAJE: "Aprendizaje",
}

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const empresaId = (token as any)?.empresaId
  if (!empresaId) return NextResponse.json({ error: "Sin empresa" }, { status: 403 })

  const sp       = request.nextUrl.searchParams
  const estado   = sp.get("estado") ?? "activo"
  const cc       = sp.get("centroCosto") ?? ""
  const prog     = sp.get("programa") ?? ""
  const mod      = sp.get("modalidad") ?? ""

  const where: any = { empresaId }
  if (estado === "activo")   where.estaActivo = true
  if (estado === "inactivo") where.estaActivo = false
  if (cc)   where.centroCosto = cc
  if (prog) where.programa    = prog
  if (mod)  where.modalidad   = mod

  const empleados = await prisma.empleado.findMany({
    where,
    orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
  })

  const wb = new ExcelJS.Workbook()
  wb.creator = "Sistema de Nómina"
  wb.created = new Date()

  const ws = wb.addWorksheet("Empleados", { views: [{ state: "frozen", ySplit: 4 }] })

  const COLS = 15
  const endCol = String.fromCharCode(64 + COLS)

  ws.mergeCells(`A1:${endCol}1`)
  Object.assign(ws.getCell("A1"), {
    value: "LISTADO DE EMPLEADOS",
    font: { bold: true, size: 14, color: { argb: H_FG }, name: "Calibri" },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: H_BG } },
    alignment: { horizontal: "center", vertical: "middle" },
  })
  ws.getRow(1).height = 36

  ws.mergeCells(`A2:${endCol}2`)
  const filtersStr = [cc && `Centro: ${cc}`, prog && `Programa: ${prog}`, mod && `Modalidad: ${mod}`, `Estado: ${estado === "todos" ? "Todos" : estado === "activo" ? "Activos" : "Inactivos"}`].filter(Boolean).join("  |  ")
  Object.assign(ws.getCell("A2"), {
    value: `${filtersStr}  |  Generado: ${new Date().toLocaleString("es-CO")}  |  Total: ${empleados.length} empleados`,
    font: { size: 9, italic: true, color: { argb: "FF4C1D95" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDE9FE" } },
    alignment: { horizontal: "center", vertical: "middle" },
  })
  ws.getRow(2).height = 16

  ws.getRow(3).height = 6

  ws.columns = [
    { key: "apellidos",      width: 18 },
    { key: "nombres",        width: 18 },
    { key: "tipoDoc",        width: 10 },
    { key: "documento",      width: 14 },
    { key: "centroCosto",    width: 14 },
    { key: "programa",       width: 18 },
    { key: "modalidad",      width: 14 },
    { key: "cargo",          width: 16 },
    { key: "fechaIngreso",   width: 14 },
    { key: "fechaRetiro",    width: 14 },
    { key: "vinculacion",    width: 18 },
    { key: "contrato",       width: 18 },
    { key: "salarioBase",    width: 16, style: { numFmt: "$#,##0" } },
    { key: "auxTransporte",  width: 12 },
    { key: "estado",         width: 10 },
  ]

  ws.getRow(4).values = [
    "Apellidos", "Nombres", "Tipo Doc.", "Documento",
    "Centro Costo", "Programa", "Modalidad", "Cargo",
    "Fecha Ingreso", "Fecha Retiro", "Tipo Vinculación", "Tipo Contrato",
    "Salario Base", "Aux. Transp.", "Estado",
  ]
  styleHeader(ws, 4)

  empleados.forEach((e, i) => {
    const row = ws.addRow({
      apellidos:     e.apellidos,
      nombres:       e.nombres,
      tipoDoc:       e.tipoDocumento.replace(/_/g, " "),
      documento:     e.numeroDocumento,
      centroCosto:   e.centroCosto ?? "",
      programa:      e.programa ?? "",
      modalidad:     e.modalidad ?? "",
      cargo:         e.cargo ?? "",
      fechaIngreso:  e.fechaIngreso,
      fechaRetiro:   e.fechaRetiro ?? "",
      vinculacion:   TIPO_VINC[e.tipoVinculacion] ?? e.tipoVinculacion,
      contrato:      TIPO_CONT[e.tipoContrato] ?? e.tipoContrato,
      salarioBase:   e.salarioBase,
      auxTransporte: e.tieneAuxilioTransporte ? "Sí" : "No",
      estado:        e.estaActivo ? "Activo" : "Inactivo",
    })
    row.height = 17
    row.font = { size: 9, name: "Calibri" }
    if (i % 2 === 1) row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT } }
    row.getCell("fechaIngreso").numFmt = "DD/MM/YYYY"
    if (e.fechaRetiro) row.getCell("fechaRetiro").numFmt = "DD/MM/YYYY"
    row.getCell("salarioBase").numFmt = "$#,##0"
    row.getCell("estado").font = { size: 9, bold: true, color: { argb: e.estaActivo ? "FF16A34A" : "FFDC2626" } }
  })

  const buf = await wb.xlsx.writeBuffer()
  return new NextResponse(Buffer.from(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Empleados_${new Date().toISOString().slice(0,10)}.xlsx"`,
    },
  })
}
