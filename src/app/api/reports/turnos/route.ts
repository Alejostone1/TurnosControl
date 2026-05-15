import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getToken } from "next-auth/jwt"
import ExcelJS from "exceljs"

export const dynamic = "force-dynamic"

const H_BG = "FF1E3A5F"
const H_FG = "FFFFFFFF"
const ALT  = "FFEff6FF"

const DIAS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"]

function styleHeader(ws: ExcelJS.Worksheet, rowNum: number) {
  const row = ws.getRow(rowNum)
  row.height = 30
  row.font      = { bold: true, color: { argb: H_FG }, size: 9, name: "Calibri" }
  row.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: H_BG } }
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
  row.eachCell(cell => {
    cell.border = { bottom: { style: "medium", color: { argb: "FF3B82F6" } }, right: { style: "thin", color: { argb: "FF93C5FD" } } }
  })
}

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const empresaId = (token as any)?.empresaId
  if (!empresaId) return NextResponse.json({ error: "Sin empresa" }, { status: 403 })

  const sp         = request.nextUrl.searchParams
  const periodoId  = sp.get("periodoId")
  const empleadoId = sp.get("empleadoId") ?? ""
  const cc         = sp.get("centroCosto") ?? ""
  const prog       = sp.get("programa") ?? ""
  const mod        = sp.get("modalidad") ?? ""
  const conceptoId = sp.get("conceptoId") ?? ""

  if (!periodoId) return NextResponse.json({ error: "periodoId es requerido" }, { status: 400 })

  const periodo = await prisma.periodoNomina.findFirst({ where: { id: periodoId, empresaId } })
  if (!periodo) return NextResponse.json({ error: "Período no encontrado" }, { status: 404 })

  const whereEmp: any = {}
  if (cc)         whereEmp.centroCosto = cc
  if (prog)       whereEmp.programa    = prog
  if (mod)        whereEmp.modalidad   = mod

  const where: any = {
    empresaId,
    fechaTurno: { gte: periodo.fechaInicio, lte: periodo.fechaFin },
  }
  if (empleadoId)                     where.empleadoId = empleadoId
  if (conceptoId)                     where.conceptoId = conceptoId
  if (Object.keys(whereEmp).length)   where.empleado   = whereEmp

  const turnos = await prisma.asignacionTurno.findMany({
    where,
    include: {
      empleado: { select: { nombres: true, apellidos: true, numeroDocumento: true, centroCosto: true, programa: true, modalidad: true } },
      concepto: { select: { codigo: true, nombre: true, horaInicioDefecto: true, horaFinDefecto: true } },
      novedad:  { select: { codigo: true, nombre: true } },
    },
    orderBy: [{ empleado: { apellidos: "asc" } }, { fechaTurno: "asc" }],
  })

  const wb = new ExcelJS.Workbook()
  wb.creator = "Sistema de Nómina"
  wb.created = new Date()

  const ws = wb.addWorksheet("Turnos", { views: [{ state: "frozen", ySplit: 4 }] })

  const COLS = 14
  const endCol = COLS <= 26 ? String.fromCharCode(64 + COLS) : "A" + String.fromCharCode(64 + COLS - 26)

  ws.mergeCells(`A1:${endCol}1`)
  Object.assign(ws.getCell("A1"), {
    value: `TURNOS PROGRAMADOS — ${periodo.nombrePeriodo.toUpperCase()}`,
    font: { bold: true, size: 14, color: { argb: H_FG }, name: "Calibri" },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: H_BG } },
    alignment: { horizontal: "center", vertical: "middle" },
  })
  ws.getRow(1).height = 36

  ws.mergeCells(`A2:${endCol}2`)
  const filtersStr = [
    `Período: ${periodo.fechaInicio.toLocaleDateString("es-CO")} – ${periodo.fechaFin.toLocaleDateString("es-CO")}`,
    cc && `Centro: ${cc}`, prog && `Programa: ${prog}`, mod && `Modalidad: ${mod}`,
  ].filter(Boolean).join("  |  ")
  Object.assign(ws.getCell("A2"), {
    value: `${filtersStr}  |  Generado: ${new Date().toLocaleString("es-CO")}  |  Total: ${turnos.length} turnos`,
    font: { size: 9, italic: true, color: { argb: "FF1E40AF" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } },
    alignment: { horizontal: "center", vertical: "middle" },
  })
  ws.getRow(2).height = 16
  ws.getRow(3).height = 6

  ws.columns = [
    { key: "empleado",     width: 26 },
    { key: "documento",    width: 14 },
    { key: "centroCosto",  width: 14 },
    { key: "programa",     width: 16 },
    { key: "modalidad",    width: 14 },
    { key: "fecha",        width: 13 },
    { key: "diaSemana",    width: 8  },
    { key: "festivo",      width: 10 },
    { key: "turCodigo",    width: 8  },
    { key: "turNombre",    width: 18 },
    { key: "novCodigo",    width: 8  },
    { key: "novNombre",    width: 18 },
    { key: "horaInicio",   width: 11 },
    { key: "horaFin",      width: 11 },
  ]

  ws.getRow(4).values = [
    "Empleado", "Documento", "Centro Costo", "Programa", "Modalidad",
    "Fecha", "Día", "Fest/Dom",
    "Turno", "Nombre Turno", "Novedad", "Nombre Novedad",
    "Hora Inicio", "Hora Fin",
  ]
  styleHeader(ws, 4)

  const FESTIVOS = new Set([
    "2026-01-01","2026-01-12","2026-03-23","2026-04-02","2026-04-03",
    "2026-05-01","2026-05-25","2026-06-15","2026-06-22","2026-06-29",
    "2026-07-20","2026-08-07","2026-08-17","2026-10-12","2026-11-02",
    "2026-11-16","2026-12-08","2026-12-25",
  ])

  turnos.forEach((t, i) => {
    const emp = t.empleado
    const fecha = new Date(t.fechaTurno)
    const dk = fecha.toISOString().slice(0,10)
    const dow = fecha.getDay()
    const esDom = dow === 0
    const esFest = FESTIVOS.has(dk)
    const festLabel = esDom ? "Domingo" : esFest ? "Festivo" : ""

    const horaInicio = t.horaInicioPersonalizada ?? t.concepto.horaInicioDefecto ?? ""
    const horaFin    = t.horaFinPersonalizada    ?? t.concepto.horaFinDefecto    ?? ""

    const row = ws.addRow({
      empleado:    `${emp.apellidos} ${emp.nombres}`,
      documento:   emp.numeroDocumento,
      centroCosto: emp.centroCosto ?? "",
      programa:    emp.programa ?? "",
      modalidad:   emp.modalidad ?? "",
      fecha,
      diaSemana:   DIAS[dow],
      festivo:     festLabel,
      turCodigo:   t.concepto.codigo,
      turNombre:   t.concepto.nombre,
      novCodigo:   t.novedad?.codigo ?? "",
      novNombre:   t.novedad?.nombre ?? "",
      horaInicio,
      horaFin,
    })
    row.height = 17
    row.font = { size: 9, name: "Calibri" }
    if (i % 2 === 1) row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT } }
    if (esDom || esFest) {
      row.getCell("diaSemana").font = { bold: true, color: { argb: "FFD97706" }, size: 9 }
      row.getCell("festivo").font   = { bold: true, color: { argb: "FFD97706" }, size: 9 }
    }
    row.getCell("fecha").numFmt = "DD/MM/YYYY"
    row.getCell("turCodigo").font = { bold: true, size: 10 }
  })

  const buf = await wb.xlsx.writeBuffer()
  const fname = `Turnos_${periodo.nombrePeriodo.replace(/\s+/g,"_")}.xlsx`
  return new NextResponse(Buffer.from(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fname)}"`,
    },
  })
}
