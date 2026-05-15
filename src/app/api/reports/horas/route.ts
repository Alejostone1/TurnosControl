import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getToken } from "next-auth/jwt"
import ExcelJS from "exceljs"

export const dynamic = "force-dynamic"

const H_BG = "FF065F46"
const H_FG = "FFFFFFFF"
const ALT  = "FFF0FDF4"

const DIAS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"]

function styleHeader(ws: ExcelJS.Worksheet, rowNum: number) {
  const row = ws.getRow(rowNum)
  row.height = 32
  row.font      = { bold: true, color: { argb: H_FG }, size: 9, name: "Calibri" }
  row.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: H_BG } }
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
  row.eachCell(cell => {
    cell.border = { bottom: { style: "medium", color: { argb: "FF10B981" } }, right: { style: "thin", color: { argb: "FF6EE7B7" } } }
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

  if (!periodoId) return NextResponse.json({ error: "periodoId es requerido" }, { status: 400 })

  const periodo = await prisma.periodoNomina.findFirst({ where: { id: periodoId, empresaId } })
  if (!periodo) return NextResponse.json({ error: "Período no encontrado" }, { status: 404 })

  const whereEmp: any = {}
  if (cc) whereEmp.centroCosto = cc

  const where: any = { empresaId, periodoId }
  if (empleadoId)                   where.empleadoId = empleadoId
  if (Object.keys(whereEmp).length) where.empleado   = whereEmp

  const registros = await prisma.registroDiaTrabajado.findMany({
    where,
    include: {
      empleado: { select: { nombres: true, apellidos: true, numeroDocumento: true, centroCosto: true, programa: true } },
      asignacion: {
        include: {
          concepto: { select: { codigo: true, nombre: true } },
          novedad:  { select: { codigo: true } },
        }
      },
    },
    orderBy: [{ empleado: { apellidos: "asc" } }, { fechaDia: "asc" }],
  })

  const wb = new ExcelJS.Workbook()
  wb.creator = "Sistema de Nómina"
  wb.created = new Date()

  const ws = wb.addWorksheet("Horas por Día", { views: [{ state: "frozen", ySplit: 6 }] })

  ws.mergeCells("A1:U1")
  Object.assign(ws.getCell("A1"), {
    value: `HORAS TRABAJADAS POR DÍA — ${periodo.nombrePeriodo.toUpperCase()}`,
    font: { bold: true, size: 14, color: { argb: H_FG }, name: "Calibri" },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: H_BG } },
    alignment: { horizontal: "center", vertical: "middle" },
  })
  ws.getRow(1).height = 36

  ws.mergeCells("A2:U2")
  const filtersStr = [
    `Período: ${periodo.fechaInicio.toLocaleDateString("es-CO")} – ${periodo.fechaFin.toLocaleDateString("es-CO")}`,
    cc && `Centro: ${cc}`,
  ].filter(Boolean).join("  |  ")
  Object.assign(ws.getCell("A2"), {
    value: `${filtersStr}  |  Generado: ${new Date().toLocaleString("es-CO")}  |  Total: ${registros.length} registros`,
    font: { size: 9, italic: true, color: { argb: "FF065F46" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } },
    alignment: { horizontal: "center", vertical: "middle" },
  })
  ws.getRow(2).height = 16
  ws.getRow(3).height = 6

  const hourFmt = "0.00"

  ws.columns = [
    { key: "empleado",      width: 26 },
    { key: "documento",     width: 14 },
    { key: "centroCosto",   width: 13 },
    { key: "programa",      width: 15 },
    { key: "fecha",         width: 13 },
    { key: "diaSemana",     width: 8  },
    { key: "festivo",       width: 8  },
    { key: "turno",         width: 8  },
    { key: "novedad",       width: 8  },
    { key: "hOrd",          width: 9, style: { numFmt: hourFmt } },
    { key: "hNoc",          width: 9, style: { numFmt: hourFmt } },
    { key: "hFest",         width: 9, style: { numFmt: hourFmt } },
    { key: "hNocFest",      width: 9, style: { numFmt: hourFmt } },
    { key: "hExDiurna",     width: 9, style: { numFmt: hourFmt } },
    { key: "hExNoc",        width: 9, style: { numFmt: hourFmt } },
    { key: "hExDFest",      width: 9, style: { numFmt: hourFmt } },
    { key: "hExNFest",      width: 9, style: { numFmt: hourFmt } },
    { key: "totalDia",      width: 10, style: { numFmt: hourFmt } },
    { key: "horasExtra",    width: 10, style: { numFmt: hourFmt } },
    { key: "acumSemana",    width: 12, style: { numFmt: hourFmt } },
    { key: "nroSemana",     width: 9  },
  ]

  // ── Group header row (row 4) ──────────────────────────────────
  const REC_BG  = "FF0F766E"  // teal-700  (recargos)
  const EXT_BG  = "FFB45309"  // amber-700 (extras)
  const gr = ws.getRow(4)
  gr.height = 18
  // A–I: same dark bg, empty
  for (let c = 1; c <= 9; c++) {
    const cell = gr.getCell(c)
    cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: H_BG } }
    cell.border = { bottom: { style: "thin", color: { argb: "FF10B981" } } }
  }
  // J–M: RECARGOS (merged)
  ws.mergeCells("J4:M4")
  Object.assign(gr.getCell(10), {
    value:     "RECARGOS",
    font:      { bold: true, color: { argb: H_FG }, size: 9, name: "Calibri" },
    fill:      { type: "pattern", pattern: "solid", fgColor: { argb: REC_BG } },
    alignment: { horizontal: "center", vertical: "middle" },
    border:    { bottom: { style: "medium", color: { argb: "FF34D399" } } },
  })
  // N–Q: HORAS EXTRAS (merged)
  ws.mergeCells("N4:Q4")
  Object.assign(gr.getCell(14), {
    value:     "HORAS EXTRAS",
    font:      { bold: true, color: { argb: H_FG }, size: 9, name: "Calibri" },
    fill:      { type: "pattern", pattern: "solid", fgColor: { argb: EXT_BG } },
    alignment: { horizontal: "center", vertical: "middle" },
    border:    { bottom: { style: "medium", color: { argb: "FFFBBF24" } } },
  })
  // R–U: same dark bg, empty
  for (let c = 18; c <= 21; c++) {
    const cell = gr.getCell(c)
    cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: H_BG } }
    cell.border = { bottom: { style: "thin", color: { argb: "FF10B981" } } }
  }

  // ── Concept codes row (row 5) ─────────────────────────────────
  // Codes per Colombian nomina concepts: recargos 010-013, extras 045-048
  const CON_CODES: Record<number, string> = {
    10: "010", 11: "011", 12: "012", 13: "013",   // recargos J–M
    14: "045", 15: "046", 16: "047", 17: "048",   // extras   N–Q
  }
  const cr = ws.getRow(5)
  cr.height = 14
  for (let c = 1; c <= 21; c++) {
    const cell = cr.getCell(c)
    const code = CON_CODES[c]
    if (code) {
      const isRec = c <= 13
      cell.value     = code
      cell.font      = { bold: true, color: { argb: H_FG }, size: 8, name: "Calibri" }
      cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: isRec ? REC_BG : EXT_BG } }
      cell.alignment = { horizontal: "center", vertical: "middle" }
      cell.border    = { bottom: { style: "thin", color: { argb: isRec ? "FF34D399" : "FFFBBF24" } } }
    } else {
      cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: H_BG } }
      cell.border = { bottom: { style: "thin", color: { argb: "FF10B981" } } }
    }
  }

  // ── Column headers (row 6) ────────────────────────────────────
  ws.getRow(6).values = [
    "Empleado", "Documento", "Centro Costo", "Programa",
    "Fecha", "Día", "F/Dom",
    "Turno", "Novedad",
    "H. Ordinarias", "H. Nocturnas\n(35%)", "H. Festivas\n(75%)", "H. Noct/Fest\n(110%)",
    "HE Diurna\n(25%)", "HE Nocturna\n(75%)", "HE D/Fest\n(100%)", "HE N/Fest\n(150%)",
    "Total Día", "Horas Extra", "Acum. Semana", "Nro. Semana",
  ]
  styleHeader(ws, 6)
  // Override fill for recargo cols (J–M) and extra cols (N–Q)
  const hdrRow = ws.getRow(6)
  for (let c = 10; c <= 13; c++) hdrRow.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: REC_BG } }
  for (let c = 14; c <= 17; c++) hdrRow.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXT_BG } }

  // Totals accumulator
  let totOrd = 0, totNoc = 0, totFest = 0, totNF = 0
  let totEDi = 0, totEN = 0, totEDF = 0, totENF = 0
  let totTotal = 0, totExtra = 0

  registros.forEach((r, i) => {
    const emp  = r.empleado
    const fecha = new Date(r.fechaDia)
    const dow   = fecha.getDay()
    const festLabel = r.esDomingo ? "Dom" : r.esFestivo ? "Fest" : ""

    const row = ws.addRow({
      empleado:    `${emp.apellidos} ${emp.nombres}`,
      documento:   emp.numeroDocumento,
      centroCosto: emp.centroCosto ?? "",
      programa:    emp.programa ?? "",
      fecha,
      diaSemana:   DIAS[dow],
      festivo:     festLabel,
      turno:       r.asignacion?.concepto?.codigo ?? "",
      novedad:     r.asignacion?.novedad?.codigo  ?? "",
      hOrd:        r.horasOrdinarias,
      hNoc:        r.horasNocturnas,
      hFest:       r.horasFestivas,
      hNocFest:    r.horasNoctFestivas,
      hExDiurna:   r.horasExtraDiurna,
      hExNoc:      r.horasExtraNocturna,
      hExDFest:    r.horasExtraDiurnaFest,
      hExNFest:    r.horasExtraNoctFest,
      totalDia:    r.totalHorasTrabajadas,
      horasExtra:  r.horasExtrasGeneradas,
      acumSemana:  r.horasSemanaAcumuladas,
      nroSemana:   r.numeroSemana,
    })
    row.height = 17
    row.font = { size: 9, name: "Calibri" }
    if (i % 2 === 1) row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT } }
    if (r.esDomingo || r.esFestivo) {
      row.getCell("festivo").font = { bold: true, color: { argb: "FFD97706" }, size: 9 }
    }
    if (r.horasExtrasGeneradas > 0) {
      row.getCell("horasExtra").font = { bold: true, color: { argb: "FFEA580C" }, size: 9 }
    }
    row.getCell("fecha").numFmt = "DD/MM/YYYY"
    row.getCell("turno").font = { bold: true, size: 10 }

    totOrd   += r.horasOrdinarias
    totNoc   += r.horasNocturnas
    totFest  += r.horasFestivas
    totNF    += r.horasNoctFestivas
    totEDi   += r.horasExtraDiurna
    totEN    += r.horasExtraNocturna
    totEDF   += r.horasExtraDiurnaFest
    totENF   += r.horasExtraNoctFest
    totTotal += r.totalHorasTrabajadas
    totExtra += r.horasExtrasGeneradas
  })

  // Totals row
  const fmt = (n: number) => Math.round(n * 100) / 100
  const tr = ws.addRow({
    empleado: `TOTALES (${registros.length} días / ${new Set(registros.map(r => r.empleadoId)).size} empleados)`,
    hOrd: fmt(totOrd), hNoc: fmt(totNoc), hFest: fmt(totFest), hNocFest: fmt(totNF),
    hExDiurna: fmt(totEDi), hExNoc: fmt(totEN), hExDFest: fmt(totEDF), hExNFest: fmt(totENF),
    totalDia: fmt(totTotal), horasExtra: fmt(totExtra),
  })
  tr.height = 22
  tr.font = { bold: true, size: 10, name: "Calibri" }
  tr.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } }
  tr.eachCell(cell => { cell.border = { top: { style: "medium", color: { argb: "FF10B981" } } } })

  const buf = await wb.xlsx.writeBuffer()
  const fname = `Horas_${periodo.nombrePeriodo.replace(/\s+/g,"_")}.xlsx`
  return new NextResponse(Buffer.from(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fname)}"`,
    },
  })
}
