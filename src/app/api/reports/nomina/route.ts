import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getToken } from "next-auth/jwt"
import ExcelJS from "exceljs"

export const dynamic = "force-dynamic"

const H_BG  = "FF5B21B6"
const H_FG  = "FFFFFFFF"
const ALT   = "FFF5F3FF"
const TOT   = "FFEDE9FE"
const CUR   = "$#,##0"
const HRS   = "0.00"

function styleHeader(ws: ExcelJS.Worksheet, rowNum: number) {
  const row = ws.getRow(rowNum)
  row.height = 38
  row.font      = { bold: true, color: { argb: H_FG }, size: 8.5, name: "Calibri" }
  row.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: H_BG } }
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
  row.eachCell(cell => {
    cell.border = { bottom: { style: "medium", color: { argb: "FF7C3AED" } }, right: { style: "thin", color: { argb: "FFA78BFA" } } }
  })
}

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const empresaId = (token as any)?.empresaId
  if (!empresaId) return NextResponse.json({ error: "Sin empresa" }, { status: 403 })

  const sp        = request.nextUrl.searchParams
  const periodoId = sp.get("periodoId")
  const cc        = sp.get("centroCosto") ?? ""
  const prog      = sp.get("programa")    ?? ""
  const mod       = sp.get("modalidad")   ?? ""

  if (!periodoId) return NextResponse.json({ error: "periodoId es requerido" }, { status: 400 })

  const periodo = await prisma.periodoNomina.findFirst({ where: { id: periodoId, empresaId } })
  if (!periodo) return NextResponse.json({ error: "Período no encontrado" }, { status: 404 })

  const whereEmp: any = {}
  if (cc)   whereEmp.centroCosto = cc
  if (prog) whereEmp.programa    = prog
  if (mod)  whereEmp.modalidad   = mod

  const resultados = await prisma.resultadoNomina.findMany({
    where: {
      empresaId,
      periodoId,
      ...(Object.keys(whereEmp).length ? { empleado: whereEmp } : {}),
    },
    include: {
      empleado: {
        select: {
          nombres: true, apellidos: true, numeroDocumento: true, tipoDocumento: true,
          centroCosto: true, programa: true, modalidad: true, cargo: true,
        },
      },
    },
  })
  resultados.sort((a, b) => a.empleado.apellidos.localeCompare(b.empleado.apellidos))

  const wb = new ExcelJS.Workbook()
  wb.creator = "Sistema de Nómina"
  wb.created = new Date()

  // ── Sheet 1: Resumen ────────────────────────────────────────────────────────
  const ws = wb.addWorksheet("Nómina", { views: [{ state: "frozen", ySplit: 4 }] })

  ws.mergeCells("A1:AC1")
  Object.assign(ws.getCell("A1"), {
    value: `LIQUIDACIÓN DE NÓMINA — ${periodo.nombrePeriodo.toUpperCase()}`,
    font: { bold: true, size: 14, color: { argb: H_FG }, name: "Calibri" },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: H_BG } },
    alignment: { horizontal: "center", vertical: "middle" },
  })
  ws.getRow(1).height = 38

  ws.mergeCells("A2:AC2")
  const filtersStr = [
    `Período: ${periodo.fechaInicio.toLocaleDateString("es-CO")} – ${periodo.fechaFin.toLocaleDateString("es-CO")}`,
    cc && `Centro: ${cc}`, prog && `Programa: ${prog}`, mod && `Modalidad: ${mod}`,
  ].filter(Boolean).join("  |  ")
  Object.assign(ws.getCell("A2"), {
    value: `${filtersStr}  |  Generado: ${new Date().toLocaleString("es-CO")}  |  ${resultados.length} empleados`,
    font: { size: 9, italic: true, color: { argb: "FF4C1D95" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: TOT } },
    alignment: { horizontal: "center", vertical: "middle" },
  })
  ws.getRow(2).height = 16
  ws.getRow(3).height = 6

  ws.columns = [
    { key: "empleado",        width: 28 },
    { key: "documento",       width: 14 },
    { key: "centroCosto",     width: 13 },
    { key: "programa",        width: 15 },
    { key: "modalidad",       width: 12 },
    { key: "cargo",           width: 14 },
    { key: "salarioBase",     width: 16 },
    { key: "auxTransporte",   width: 12 },
    { key: "hOrd",            width: 10 },
    { key: "hNoc",            width: 10 },
    { key: "hFest",           width: 10 },
    { key: "hNocFest",        width: 10 },
    { key: "hExDiurna",       width: 10 },
    { key: "hExNoc",          width: 10 },
    { key: "hExDFest",        width: 10 },
    { key: "hExNFest",        width: 10 },
    { key: "totalHoras",      width: 10 },
    { key: "totalExtras",     width: 10 },
    { key: "totalDeuda",      width: 9  },
    { key: "vRecNoc",         width: 14 },
    { key: "vRecFest",        width: 14 },
    { key: "vRecNocFest",     width: 14 },
    { key: "vExDiurna",       width: 14 },
    { key: "vExNoc",          width: 14 },
    { key: "vExDFest",        width: 14 },
    { key: "vExNFest",        width: 14 },
    { key: "devengado",       width: 16 },
    { key: "deducciones",     width: 14 },
    { key: "netoAPagar",      width: 16 },
  ]

  ws.getRow(4).values = [
    "Empleado", "Documento", "Centro Costo", "Programa", "Modalidad", "Cargo",
    "Salario Base", "Aux. Transporte",
    "H. Ordinarias", "H. Nocturnas\n(35%)", "H. Festivas\n(75%)", "H. Noct/Fest\n(110%)",
    "HE Diurna\n(25%)", "HE Nocturna\n(75%)", "HE D/Fest\n(100%)", "HE N/Fest\n(150%)",
    "Total Horas", "H. Extras", "H. Deuda",
    "Rec. Noc. ($)", "Rec. Fest. ($)", "Rec. N/F ($)",
    "Extra Diurna ($)", "Extra Noc. ($)", "Extra D/F ($)", "Extra N/F ($)",
    "Total Devengado", "Deducciones", "Neto a Pagar",
  ]
  styleHeader(ws, 4)

  let totSal = 0, totAux = 0, totDev = 0, totDed = 0, totNeto = 0
  let totHOrd = 0, totHNoc = 0, totHFest = 0, totHNF = 0
  let totHEDi = 0, totHEN = 0, totHEDF = 0, totHENF = 0, totHTot = 0, totHExt = 0

  resultados.forEach((r, i) => {
    const emp = r.empleado
    const row = ws.addRow({
      empleado:      `${emp.apellidos} ${emp.nombres}`,
      documento:     emp.numeroDocumento,
      centroCosto:   emp.centroCosto ?? "",
      programa:      emp.programa    ?? "",
      modalidad:     emp.modalidad   ?? "",
      cargo:         emp.cargo       ?? "",
      salarioBase:   r.salarioBase,
      auxTransporte: r.auxilioTransporte,
      hOrd:          r.totalHorasOrdinarias,
      hNoc:          r.totalHorasNocturnas,
      hFest:         r.totalHorasFestivas,
      hNocFest:      r.totalHorasNoctFestivas,
      hExDiurna:     r.totalExtraDiurna,
      hExNoc:        r.totalExtraNocturna,
      hExDFest:      r.totalExtraDiurnaFest,
      hExNFest:      r.totalExtraNoctFest,
      totalHoras:    r.totalHorasTrabajadas,
      totalExtras:   r.totalHorasExtras,
      totalDeuda:    r.totalHorasDeuda,
      vRecNoc:       r.valorRecargoNocturno,
      vRecFest:      r.valorRecargoFestivo,
      vRecNocFest:   r.valorRecargoNoctFestivo,
      vExDiurna:     r.valorExtraDiurna,
      vExNoc:        r.valorExtraNocturna,
      vExDFest:      r.valorExtraDiurnaFest,
      vExNFest:      r.valorExtraNoctFest,
      devengado:     r.totalDevengado,
      deducciones:   r.totalDeducciones,
      netoAPagar:    r.netoAPagar,
    })
    row.height = 18
    row.font = { size: 9, name: "Calibri" }
    if (i % 2 === 1) row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT } }

    ;["salarioBase","auxTransporte","vRecNoc","vRecFest","vRecNocFest",
      "vExDiurna","vExNoc","vExDFest","vExNFest","devengado","deducciones","netoAPagar",
    ].forEach(k => { row.getCell(k).numFmt = CUR })
    ;["hOrd","hNoc","hFest","hNocFest","hExDiurna","hExNoc","hExDFest","hExNFest",
      "totalHoras","totalExtras","totalDeuda",
    ].forEach(k => { row.getCell(k).numFmt = HRS })
    row.getCell("empleado").font = { bold: true, size: 9, name: "Calibri" }
    row.getCell("netoAPagar").font = { bold: true, size: 10, color: { argb: "FF16A34A" }, name: "Calibri" }

    totSal  += r.salarioBase
    totAux  += r.auxilioTransporte
    totDev  += r.totalDevengado
    totDed  += r.totalDeducciones
    totNeto += r.netoAPagar
    totHOrd  += r.totalHorasOrdinarias;   totHNoc  += r.totalHorasNocturnas
    totHFest += r.totalHorasFestivas;     totHNF   += r.totalHorasNoctFestivas
    totHEDi  += r.totalExtraDiurna;       totHEN   += r.totalExtraNocturna
    totHEDF  += r.totalExtraDiurnaFest;   totHENF  += r.totalExtraNoctFest
    totHTot  += r.totalHorasTrabajadas;   totHExt  += r.totalHorasExtras
  })

  const fr = (n: number) => Math.round(n * 100) / 100
  const totRow = ws.addRow({
    empleado: `TOTALES — ${resultados.length} empleados`,
    salarioBase: fr(totSal), auxTransporte: fr(totAux),
    hOrd: fr(totHOrd), hNoc: fr(totHNoc), hFest: fr(totHFest), hNocFest: fr(totHNF),
    hExDiurna: fr(totHEDi), hExNoc: fr(totHEN), hExDFest: fr(totHEDF), hExNFest: fr(totHENF),
    totalHoras: fr(totHTot), totalExtras: fr(totHExt),
    devengado: fr(totDev), deducciones: fr(totDed), netoAPagar: fr(totNeto),
  })
  totRow.height = 24
  totRow.font = { bold: true, size: 10, name: "Calibri" }
  totRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOT } }
  ;["salarioBase","auxTransporte","devengado","deducciones","netoAPagar"].forEach(k => { totRow.getCell(k).numFmt = CUR })
  ;["hOrd","hNoc","hFest","hNocFest","hExDiurna","hExNoc","hExDFest","hExNFest","totalHoras","totalExtras"].forEach(k => { totRow.getCell(k).numFmt = HRS })
  totRow.getCell("netoAPagar").font = { bold: true, size: 11, color: { argb: "FF16A34A" }, name: "Calibri" }
  totRow.eachCell(cell => { cell.border = { top: { style: "medium", color: { argb: H_BG } } } })

  // ── Sheet 2: Resumen Ejecutivo ─────────────────────────────────────────────
  const ws2 = wb.addWorksheet("Resumen Ejecutivo")

  ws2.mergeCells("A1:D1")
  Object.assign(ws2.getCell("A1"), {
    value: `RESUMEN EJECUTIVO — ${periodo.nombrePeriodo}`,
    font: { bold: true, size: 13, color: { argb: H_FG }, name: "Calibri" },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: H_BG } },
    alignment: { horizontal: "center", vertical: "middle" },
  })
  ws2.getRow(1).height = 32

  ws2.columns = [
    { key: "concepto", width: 30 },
    { key: "valor",    width: 18 },
    { key: "sep",      width: 4  },
    { key: "info",     width: 20 },
  ]

  const resumen = [
    ["EMPLEADOS", ""],
    ["Total empleados en período", resultados.length],
    ["HORAS", ""],
    ["Total horas ordinarias",  fr(totHOrd)],
    ["Total horas nocturnas",   fr(totHNoc)],
    ["Total horas festivas",    fr(totHFest)],
    ["Total horas noct/fest",   fr(totHNF)],
    ["Total horas extra diurna",fr(totHEDi)],
    ["Total horas extra noc.",  fr(totHEN)],
    ["Total horas extra d/fest",fr(totHEDF)],
    ["Total horas extra n/fest",fr(totHENF)],
    ["TOTAL HORAS TRABAJADAS",  fr(totHTot)],
    ["TOTAL HORAS EXTRAS",      fr(totHExt)],
    ["VALORES ($)", ""],
    ["Total salarios base",  fr(totSal)],
    ["Total aux. transporte",fr(totAux)],
    ["TOTAL DEVENGADO",      fr(totDev)],
    ["TOTAL DEDUCCIONES",    fr(totDed)],
    ["NETO TOTAL A PAGAR",   fr(totNeto)],
  ]

  resumen.forEach(([concepto, valor], i) => {
    const isTitle = typeof valor === "string" && valor === ""
    const r2 = ws2.addRow({ concepto, valor: isTitle ? "" : valor })
    r2.height = isTitle ? 22 : 18
    if (isTitle) {
      r2.font = { bold: true, size: 10, color: { argb: H_FG }, name: "Calibri" }
      r2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: H_BG } }
      ws2.mergeCells(`A${r2.number}:D${r2.number}`)
      r2.getCell("concepto").alignment = { horizontal: "left", indent: 1 }
    } else {
      r2.font = { size: 9, name: "Calibri" }
      if (i % 2 === 0) r2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT } }
      const isTotal = (concepto as string).startsWith("TOTAL") || (concepto as string).startsWith("NETO")
      if (isTotal) {
        r2.font = { bold: true, size: 10, name: "Calibri", color: { argb: typeof valor === "number" && valor > 0 ? "FF16A34A" : "FF111827" } }
        r2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOT } }
      }
      const cell = r2.getCell("valor")
      cell.numFmt = typeof valor === "number" && valor > 100 ? CUR : HRS
    }
  })

  const buf = await wb.xlsx.writeBuffer()
  const fname = `Nomina_${periodo.nombrePeriodo.replace(/\s+/g,"_")}.xlsx`
  return new NextResponse(Buffer.from(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fname)}"`,
    },
  })
}
