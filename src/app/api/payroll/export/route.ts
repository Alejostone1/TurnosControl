import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthToken } from "@/lib/getAuthToken"
import ExcelJS from "exceljs"

export const dynamic = "force-dynamic"

// ─── Colombian public holidays 2025-2026 ──────────────────────────────────────

const FESTIVOS_CO = new Set([
  "2025-01-01","2025-01-06","2025-03-24","2025-04-17","2025-04-18",
  "2025-05-01","2025-06-02","2025-06-23","2025-06-30","2025-07-20",
  "2025-08-07","2025-08-18","2025-10-13","2025-11-03","2025-11-17",
  "2025-12-08","2025-12-25",
  "2026-01-01","2026-01-12","2026-03-23","2026-04-02","2026-04-03",
  "2026-05-01","2026-05-18","2026-06-08","2026-06-15","2026-06-29",
  "2026-07-20","2026-08-07","2026-08-17","2026-10-12","2026-11-02",
  "2026-11-16","2026-12-08","2026-12-25",
])

function localKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function isFestivo(d: Date): boolean {
  return FESTIVOS_CO.has(localKey(d)) || d.getDay() === 0
}

// ─── Hour classification (8 buckets, Colombian labor law) ─────────────────────

interface HourClass {
  ordinarias: number; nocturnas: number; festivas: number; nocturnasFestivas: number
  extraDiurna: number; extraNocturna: number; extraFestiva: number; extraNocturnaFestiva: number
  total: number
}

function emptyClass(): HourClass {
  return { ordinarias:0, nocturnas:0, festivas:0, nocturnasFestivas:0,
           extraDiurna:0, extraNocturna:0, extraFestiva:0, extraNocturnaFestiva:0, total:0 }
}

function classifyMinutes(
  startMin: number, endMin: number,
  festDay: boolean, weekRunning: number, tope: number
): HourClass {
  const c = emptyClass()
  let wr = weekRunning
  for (let m = startMin; m < endMin; m += 60) {
    const hour = (m % 1440) / 60
    const isNight = hour >= 21 || hour < 6
    const isExtra = wr >= tope
    wr++
    if (festDay) {
      if (isNight) { if (isExtra) c.extraNocturnaFestiva++; else c.nocturnasFestivas++ }
      else         { if (isExtra) c.extraFestiva++;          else c.festivas++ }
    } else {
      if (isNight) { if (isExtra) c.extraNocturna++;  else c.nocturnas++ }
      else         { if (isExtra) c.extraDiurna++;    else c.ordinarias++ }
    }
  }
  c.total = endMin - startMin > 0 ? (endMin - startMin) / 60 : 0
  return c
}

function classifyAsignacion(
  concepto: any,
  horaInicioP: string | null,
  horaFinP: string | null,
  fecha: Date,
  weekRunning: number,
  tope: number
): HourClass {
  const c = emptyClass()
  if (concepto.tipoImpacto === "NEUTRO") return c

  const festDay = isFestivo(fecha)
  const sign = concepto.tipoImpacto === "RESTA_HORAS" ? -1 : 1

  if (concepto.horasFijas != null && concepto.horasFijas > 0) {
    const h = concepto.horasFijas
    c.total = h * sign
    if (sign === -1) {
      if (festDay) c.festivas = -h; else c.ordinarias = -h
    } else {
      const ordinary = Math.min(h, Math.max(0, tope - weekRunning))
      const extra = h - ordinary
      if (festDay) { c.festivas = ordinary; c.extraFestiva = extra }
      else         { c.ordinarias = ordinary; c.extraDiurna = extra }
    }
    return c
  }

  const startStr = horaInicioP || concepto.horaInicioDefecto
  const endStr   = horaFinP   || concepto.horaFinDefecto
  if (!startStr || !endStr) return c

  const [sh, sm] = startStr.split(":").map(Number)
  const [eh, em] = endStr.split(":").map(Number)
  let startMin = sh * 60 + sm
  let endMin   = eh * 60 + em
  if (concepto.cruzaMedianoche && endMin <= startMin) endMin += 1440

  const res = classifyMinutes(startMin, endMin, festDay, weekRunning, tope)
  if (sign === -1) {
    return {
      ordinarias: -res.ordinarias, nocturnas: -res.nocturnas,
      festivas: -res.festivas, nocturnasFestivas: -res.nocturnasFestivas,
      extraDiurna: -res.extraDiurna, extraNocturna: -res.extraNocturna,
      extraFestiva: -res.extraFestiva, extraNocturnaFestiva: -res.extraNocturnaFestiva,
      total: -res.total,
    }
  }
  return res
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function fmtCOP(n: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)
}

function diaSemana(d: Date): string {
  return ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"][new Date(d).getDay()]
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function horaDisplay(concepto: any, horaP: string | null, tipo: "inicio" | "fin"): string {
  if (horaP) return horaP
  if (concepto.horasFijas != null) return tipo === "inicio" ? "—" : `${concepto.horasFijas}h fijas`
  return tipo === "inicio"
    ? (concepto.horaInicioDefecto ?? "")
    : (concepto.horaFinDefecto ?? "")
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const headerFill: ExcelJS.FillPattern = { type:"pattern", pattern:"solid", fgColor:{argb:"FF1F3864"} }
const subFill:    ExcelJS.FillPattern = { type:"pattern", pattern:"solid", fgColor:{argb:"FF2F5496"} }
const totalFill:  ExcelJS.FillPattern = { type:"pattern", pattern:"solid", fgColor:{argb:"FFD9E1F2"} }
const empFill:    ExcelJS.FillPattern = { type:"pattern", pattern:"solid", fgColor:{argb:"FFE2EFDA"} }
const altFill:    ExcelJS.FillPattern = { type:"pattern", pattern:"solid", fgColor:{argb:"FFF5F5F5"} }

const hFont   = (size=10): Partial<ExcelJS.Font> => ({ bold:true, color:{argb:"FFFFFFFF"}, size, name:"Calibri" })
const boldF   = (size=10): Partial<ExcelJS.Font> => ({ bold:true, size, name:"Calibri" })
const normF   = (size=10): Partial<ExcelJS.Font> => ({ size, name:"Calibri" })
const totalF  = (size=10): Partial<ExcelJS.Font> => ({ bold:true, size, color:{argb:"FF1F3864"}, name:"Calibri" })

const thinBorder: Partial<ExcelJS.Borders> = {
  top:{style:"thin",color:{argb:"FFBFBFBF"}}, left:{style:"thin",color:{argb:"FFBFBFBF"}},
  bottom:{style:"thin",color:{argb:"FFBFBFBF"}}, right:{style:"thin",color:{argb:"FFBFBFBF"}},
}

function styleRow(row: ExcelJS.Row, fill?: ExcelJS.FillPattern, font?: Partial<ExcelJS.Font>, h=18) {
  row.height = h
  row.eachCell({ includeEmpty: true }, cell => {
    if (fill) cell.fill = fill
    if (font) cell.font = font
    cell.alignment = { horizontal:"center", vertical:"middle", wrapText: true }
    cell.border = thinBorder
  })
}

function addTitle(ws: ExcelJS.Worksheet, title: string, lastCol: string) {
  const r = ws.addRow([title])
  ws.mergeCells(`A${r.number}:${lastCol}${r.number}`)
  r.getCell(1).fill  = headerFill
  r.getCell(1).font  = hFont(12)
  r.getCell(1).alignment = { horizontal:"center", vertical:"middle" }
  r.getCell(1).border = thinBorder
  r.height = 36
}

// ─── Sheet 1: Informe Horas Extras (built from AsignacionTurno) ───────────────

function buildHorasExtrasSheet(wb: ExcelJS.Workbook, periodo: any, asignaciones: any[], tope: number) {
  const ws = wb.addWorksheet("Informe Horas Extras")
  ws.pageSetup = {
    margins:{left:0.7,right:0.7,top:0.75,bottom:0.75,header:0.3,footer:0.3},
    orientation:"landscape", fitToPage:true, fitToWidth:1, fitToHeight:0,
  }
  ws.columns = [
    {key:"doc",      width:15}, {key:"nombre",  width:28}, {key:"fecha",    width:12},
    {key:"turno",    width:20}, {key:"entrada",  width:10}, {key:"salida",   width:10},
    {key:"hTrab",    width:10}, {key:"extD",     width:11}, {key:"extN",     width:11},
    {key:"recFest",  width:11}, {key:"recNF",    width:11}, {key:"extFest",  width:11},
    {key:"extNF",    width:11}, {key:"recNoc",   width:11}, {key:"dia",      width:12},
  ]

  addTitle(ws,
    `INFORME DE HORAS EXTRAS — ${periodo.nombrePeriodo} | ${fmtDate(periodo.fechaInicio)} - ${fmtDate(periodo.fechaFin)}`,
    "O"
  )

  // Info row
  const infoRow = ws.addRow(["Generado:", new Date().toLocaleDateString("es-CO"), "", "Período:", `${fmtDate(periodo.fechaInicio)} al ${fmtDate(periodo.fechaFin)}`])
  ws.mergeCells(`B${infoRow.number}:C${infoRow.number}`)
  ws.mergeCells(`E${infoRow.number}:O${infoRow.number}`)
  infoRow.eachCell({ includeEmpty:false }, cell => { cell.font = boldF(); cell.alignment={vertical:"middle"}; cell.border=thinBorder })
  infoRow.height = 18

  const hdrs = [
    "Usuario Nro#","Nombre","Fecha","Tipo de Turno","H. Entrada","H. Salida","H. Trabajadas",
    "Ext. Diurna\n[045]","Ext. Noct.\n[046]","Rec. Fest.\n[011]","Rec. NF.\n[012]",
    "Ext. Fest.\n[047]","Ext. NF.\n[048]","Rec. Noct.\n[010]","Día",
  ]
  const hRow = ws.addRow(hdrs)
  styleRow(hRow, headerFill, hFont(), 30)

  // Group by employee then sort by date for weekly accumulation
  const empMap = new Map<string, any[]>()
  for (const a of asignaciones) {
    if (!empMap.has(a.empleadoId)) empMap.set(a.empleadoId, [])
    empMap.get(a.empleadoId)!.push(a)
  }

  let rowIdx = 0
  for (const [, empAsigs] of Array.from(empMap)) {
    const sorted = empAsigs.sort((a: any, b: any) => new Date(a.fechaTurno).getTime() - new Date(b.fechaTurno).getTime())
    const empleado = sorted[0].empleado

    // Weekly accumulation: track week number → hoursInWeek
    const weekAccum = new Map<number, number>()

    for (const asig of sorted) {
      const fecha = new Date(asig.fechaTurno)
      const week  = getISOWeek(fecha)
      const weekSoFar = weekAccum.get(week) ?? 0

      const cls = classifyAsignacion(
        asig.concepto, asig.horaInicioPersonalizada, asig.horaFinPersonalizada,
        fecha, weekSoFar, tope
      )

      // Advance weekly accumulator
      const horasPositivas = Math.max(0, cls.total)
      weekAccum.set(week, weekSoFar + horasPositivas)

      const hInicio = horaDisplay(asig.concepto, asig.horaInicioPersonalizada, "inicio")
      const hFin    = horaDisplay(asig.concepto, asig.horaFinPersonalizada, "fin")

      const row = ws.addRow([
        empleado?.numeroDocumento ?? "",
        `${empleado?.nombres ?? ""} ${empleado?.apellidos ?? ""}`.trim(),
        fmtDate(fecha),
        // Show concept code + name
        `[${asig.concepto.codigo}] ${asig.concepto.nombre}`,
        hInicio,
        hFin,
        cls.total !== 0 ? parseFloat(Math.abs(cls.total).toFixed(2)) : "",
        cls.extraDiurna      !== 0 ? parseFloat(cls.extraDiurna.toFixed(2))      : "",
        cls.extraNocturna    !== 0 ? parseFloat(cls.extraNocturna.toFixed(2))    : "",
        cls.festivas         !== 0 ? parseFloat(cls.festivas.toFixed(2))         : "",
        cls.nocturnasFestivas!== 0 ? parseFloat(cls.nocturnasFestivas.toFixed(2)): "",
        cls.extraFestiva     !== 0 ? parseFloat(cls.extraFestiva.toFixed(2))     : "",
        cls.extraNocturnaFestiva!==0? parseFloat(cls.extraNocturnaFestiva.toFixed(2)):"",
        cls.nocturnas        !== 0 ? parseFloat(cls.nocturnas.toFixed(2))        : "",
        diaSemana(fecha),
      ])
      styleRow(row, rowIdx % 2 === 1 ? altFill : undefined, normF())
      rowIdx++
    }
  }

  ws.autoFilter = { from:{row:3,column:1}, to:{row:3,column:15} }
}

// ─── Sheet 2: Liquidación de Pago (from ResultadoNomina) ─────────────────────

function buildLiquidacionSheet(wb: ExcelJS.Workbook, periodo: any, resultados: any[], configLegal: any) {
  const ws = wb.addWorksheet("Liquidación de Pago")
  ws.pageSetup = {
    margins:{left:0.7,right:0.7,top:0.75,bottom:0.75,header:0.3,footer:0.3},
    orientation:"landscape", fitToPage:true, fitToWidth:1, fitToHeight:0,
  }
  ws.columns = [
    {key:"empleado",width:30},{key:"documento",width:15},{key:"concepto",width:35},
    {key:"cantHoras",width:15},{key:"valorUnit",width:20},{key:"subtotal",width:20},
  ]

  addTitle(ws, `LIQUIDACIÓN DE PAGO — ${periodo.nombrePeriodo}`, "F")
  const hRow = ws.addRow(["Empleado","Documento","Concepto","Cantidad Horas","Valor Unitario","Subtotal"])
  styleRow(hRow, headerFill, hFont(), 30)

  const pctNoc          = configLegal?.porcentajeRecargoNocturno ?? 35
  const pctFest         = configLegal?.porcentajeRecargoDomFestivo ?? 75
  const pctNocFest      = configLegal?.porcentajeRecargoNocturnoFestivo ?? 110
  const pctExtraDiurna  = configLegal?.porcentajeExtraDiurna ?? 25
  const pctExtraNoc     = configLegal?.porcentajeExtraNocturna ?? 75
  const pctExtraFestD   = configLegal?.porcentajeExtraDiurnaFestiva ?? 100
  const pctExtraFestN   = configLegal?.porcentajeExtraNocturnaFestiva ?? 150

  for (const res of resultados) {
    const nombreEmp = `${res.empleado?.nombres ?? ""} ${res.empleado?.apellidos ?? ""}`.trim()
    const doc = res.empleado?.numeroDocumento ?? ""

    type CR = { concepto: string; horas: number; valor: number }
    const rows: CR[] = []

    if (res.totalHorasOrdinarias   > 0) rows.push({ concepto:"Horas Ordinarias",                   horas:res.totalHorasOrdinarias,  valor:res.valorHorasOrdinarias })
    if (res.totalHorasNocturnas    > 0) rows.push({ concepto:`Recargo Nocturno (${pctNoc}%)`,       horas:res.totalHorasNocturnas,   valor:res.valorRecargoNocturno })
    if (res.totalHorasFestivas     > 0) rows.push({ concepto:`Recargo Festivo (${pctFest}%)`,       horas:res.totalHorasFestivas,    valor:res.valorRecargoFestivo })
    if (res.totalHorasNoctFestivas > 0) rows.push({ concepto:`Rec. Noc. Festivo (${pctNocFest}%)`, horas:res.totalHorasNoctFestivas,valor:res.valorRecargoNoctFestivo })
    if (res.totalExtraDiurna       > 0) rows.push({ concepto:`Extra Diurna (${pctExtraDiurna}%)`,  horas:res.totalExtraDiurna,      valor:res.valorExtraDiurna })
    if (res.totalExtraNocturna     > 0) rows.push({ concepto:`Extra Nocturna (${pctExtraNoc}%)`,   horas:res.totalExtraNocturna,    valor:res.valorExtraNocturna })
    if (res.totalExtraDiurnaFest   > 0) rows.push({ concepto:`Extra Festiva (${pctExtraFestD}%)`,  horas:res.totalExtraDiurnaFest,  valor:res.valorExtraDiurnaFest })
    if (res.totalExtraNoctFest     > 0) rows.push({ concepto:`Extra Noc. Festiva (${pctExtraFestN}%)`, horas:res.totalExtraNoctFest, valor:res.valorExtraNoctFest })
    if (res.auxilioTransporte      > 0) rows.push({ concepto:"Auxilio de Transporte",               horas:0,                         valor:res.auxilioTransporte })

    if (rows.length === 0) rows.push({ concepto:"Sin conceptos", horas:0, valor:0 })

    rows.forEach((cr, idx) => {
      const valorUnit = cr.horas > 0 ? cr.valor / cr.horas : cr.valor
      const row = ws.addRow([
        idx === 0 ? nombreEmp : "",
        idx === 0 ? doc : "",
        cr.concepto,
        cr.horas > 0 ? parseFloat(cr.horas.toFixed(2)) : "",
        cr.horas > 0 ? parseFloat(valorUnit.toFixed(2)) : "",
        cr.valor > 0 ? parseFloat(cr.valor.toFixed(2)) : "",
      ])
      styleRow(row, idx === 0 ? empFill : (idx % 2 === 1 ? altFill : undefined), idx === 0 ? boldF() : normF())
    })

    const totRow = ws.addRow(["","","TOTAL DEVENGADO",parseFloat(res.totalHorasTrabajadas.toFixed(2)),"",parseFloat(res.totalDevengado.toFixed(2))])
    styleRow(totRow, totalFill, totalF(), 20)

    const netRow = ws.addRow(["","","NETO A PAGAR (después de deducciones)","",`- ${fmtCOP(res.totalDeducciones)}`,parseFloat(res.netoAPagar.toFixed(2))])
    styleRow(netRow, {type:"pattern",pattern:"solid",fgColor:{argb:"FFE2EFDA"}}, {bold:true,size:10,color:{argb:"FF375623"},name:"Calibri"}, 20)

    ws.addRow([])
  }
}

// ─── Sheet 3: Resumen Total Horas ─────────────────────────────────────────────

function buildResumenSheet(wb: ExcelJS.Workbook, periodo: any, resultados: any[], configLegal: any) {
  const ws = wb.addWorksheet("Resumen Total Horas")
  ws.pageSetup = {
    margins:{left:0.7,right:0.7,top:0.75,bottom:0.75,header:0.3,footer:0.3},
    orientation:"portrait", fitToPage:true, fitToWidth:1, fitToHeight:0,
  }
  ws.columns = [
    {key:"empleado",width:30},{key:"documento",width:15},{key:"concepto",width:38},{key:"totalHoras",width:15},
  ]

  addTitle(ws, `RESUMEN TOTAL DE HORAS — ${periodo.nombrePeriodo}`, "D")
  const hRow = ws.addRow(["Empleado","Documento","Concepto","Total Horas"])
  styleRow(hRow, headerFill, hFont(), 30)

  const pctNoc         = configLegal?.porcentajeRecargoNocturno ?? 35
  const pctFest        = configLegal?.porcentajeRecargoDomFestivo ?? 75
  const pctNocFest     = configLegal?.porcentajeRecargoNocturnoFestivo ?? 110
  const pctExtraDiurna = configLegal?.porcentajeExtraDiurna ?? 25
  const pctExtraNoc    = configLegal?.porcentajeExtraNocturna ?? 75
  const pctExtraFestD  = configLegal?.porcentajeExtraDiurnaFestiva ?? 100
  const pctExtraFestN  = configLegal?.porcentajeExtraNocturnaFestiva ?? 150

  for (const res of resultados) {
    const nombreEmp = `${res.empleado?.nombres ?? ""} ${res.empleado?.apellidos ?? ""}`.trim()
    const doc = res.empleado?.numeroDocumento ?? ""

    const horasRows = [
      { concepto:"Horas Ordinarias",                      horas:res.totalHorasOrdinarias },
      { concepto:`Recargo Nocturno (${pctNoc}%)`,          horas:res.totalHorasNocturnas },
      { concepto:`Recargo Festivo (${pctFest}%)`,          horas:res.totalHorasFestivas },
      { concepto:`Recargo Noc. Festivo (${pctNocFest}%)`,  horas:res.totalHorasNoctFestivas },
      { concepto:`Extra Ordinaria (${pctExtraDiurna}%)`,   horas:res.totalExtraDiurna },
      { concepto:`Extra Nocturna (${pctExtraNoc}%)`,       horas:res.totalExtraNocturna },
      { concepto:`Extra Festiva (${pctExtraFestD}%)`,      horas:res.totalExtraDiurnaFest },
      { concepto:`Extra Noc. Festiva (${pctExtraFestN}%)`, horas:res.totalExtraNoctFest },
    ]

    horasRows.forEach((hr, idx) => {
      const row = ws.addRow([idx===0 ? nombreEmp:"", idx===0 ? doc:"", hr.concepto, parseFloat(hr.horas.toFixed(2))])
      styleRow(row, idx===0 ? empFill : (idx%2===1?altFill:undefined), idx===0?boldF():normF())
    })

    const totRow = ws.addRow(["","","TOTAL HORAS TRABAJADAS",parseFloat(res.totalHorasTrabajadas.toFixed(2))])
    styleRow(totRow, totalFill, totalF(), 20)

    ws.addRow([])
  }
}

// ─── Sheet 4+: Weekly sheets (built from AsignacionTurno) ────────────────────

function buildWeeklySheets(wb: ExcelJS.Workbook, periodo: any, asignaciones: any[], tope: number) {
  // Group by ISO week
  const weekMap = new Map<number, any[]>()
  for (const a of asignaciones) {
    const week = getISOWeek(new Date(a.fechaTurno))
    if (!weekMap.has(week)) weekMap.set(week, [])
    weekMap.get(week)!.push(a)
  }

  for (const [weekNum, weekAsigs] of Array.from(weekMap.entries()).sort(([a],[b])=>a-b)) {
    const dates  = weekAsigs.map((a: any) => new Date(a.fechaTurno))
    const minD   = new Date(Math.min(...dates.map((d: Date)=>d.getTime())))
    const maxD   = new Date(Math.max(...dates.map((d: Date)=>d.getTime())))

    const fmtShort = (d: Date) => `${d.getDate()}.${d.getMonth()+1}`
    const rawName = `Sem${weekNum} ${fmtShort(minD)}-${fmtShort(maxD)}`
    const sheetName = rawName.replace(/[*?:\\/\[\]]/g, "-").slice(0, 31)
    const ws = wb.addWorksheet(sheetName)

    ws.pageSetup = {
      margins:{left:0.7,right:0.7,top:0.75,bottom:0.75,header:0.3,footer:0.3},
      orientation:"landscape", fitToPage:true, fitToWidth:1, fitToHeight:0,
    }
    ws.columns = [
      {key:"empleado",width:30},{key:"dia",width:12},{key:"fecha",width:12},{key:"turno",width:22},
      {key:"entrada",width:10},{key:"salida",width:10},{key:"hOrd",width:10},
      {key:"hNoc",width:10},{key:"hFest",width:10},{key:"hNF",width:10},
      {key:"eOrd",width:10},{key:"eNoc",width:10},{key:"eFest",width:10},{key:"eNF",width:10},
      {key:"hxT",width:12},
    ]

    addTitle(ws, `SEMANA ${weekNum} — ${periodo.nombrePeriodo} | ${fmtDate(minD)} - ${fmtDate(maxD)}`, "O")
    const hdrs = ws.addRow([
      "Empleado","Día","Fecha","Turno","H. Entrada","H. Salida",
      "H. Ord.","H. Noc.","H. Fest.","H. N.F.",
      "E. Ord.","E. Noc.","E. Fest.","E. N.F.","H. x Turno",
    ])
    styleRow(hdrs, headerFill, hFont(), 30)

    // Group by employee
    const empMap = new Map<string, any[]>()
    for (const a of weekAsigs) {
      if (!empMap.has(a.empleadoId)) empMap.set(a.empleadoId, [])
      empMap.get(a.empleadoId)!.push(a)
    }

    for (const [, empAsigs] of Array.from(empMap)) {
      const sorted = empAsigs.sort((a: any,b: any)=>new Date(a.fechaTurno).getTime()-new Date(b.fechaTurno).getTime())
      const empleado = sorted[0].empleado
      const nombreEmp = `${empleado?.nombres??""} ${empleado?.apellidos??""}`.trim()

      let weekRunning = 0
      let totOrd=0,totNoc=0,totFest=0,totNF=0,totEOrd=0,totENoc=0,totEFest=0,totENF=0,totHxT=0

      sorted.forEach((a: any, idx: number) => {
        const fecha = new Date(a.fechaTurno)
        const cls = classifyAsignacion(a.concepto, a.horaInicioPersonalizada, a.horaFinPersonalizada, fecha, weekRunning, tope)
        weekRunning += Math.max(0, cls.total)

        totOrd  += cls.ordinarias;    totNoc  += cls.nocturnas
        totFest += cls.festivas;      totNF   += cls.nocturnasFestivas
        totEOrd += cls.extraDiurna;   totENoc += cls.extraNocturna
        totEFest+= cls.extraFestiva;  totENF  += cls.extraNocturnaFestiva
        totHxT  += Math.abs(cls.total)

        const hIn  = horaDisplay(a.concepto, a.horaInicioPersonalizada, "inicio")
        const hFin = horaDisplay(a.concepto, a.horaFinPersonalizada, "fin")

        const row = ws.addRow([
          idx===0 ? nombreEmp:"",
          diaSemana(fecha), fmtDate(fecha),
          `[${a.concepto.codigo}] ${a.concepto.nombre}`,
          hIn, hFin,
          cls.ordinarias!==0     ? parseFloat(cls.ordinarias.toFixed(2))    :"",
          cls.nocturnas!==0      ? parseFloat(cls.nocturnas.toFixed(2))     :"",
          cls.festivas!==0       ? parseFloat(cls.festivas.toFixed(2))      :"",
          cls.nocturnasFestivas!==0?parseFloat(cls.nocturnasFestivas.toFixed(2)):"",
          cls.extraDiurna!==0    ? parseFloat(cls.extraDiurna.toFixed(2))   :"",
          cls.extraNocturna!==0  ? parseFloat(cls.extraNocturna.toFixed(2)) :"",
          cls.extraFestiva!==0   ? parseFloat(cls.extraFestiva.toFixed(2))  :"",
          cls.extraNocturnaFestiva!==0?parseFloat(cls.extraNocturnaFestiva.toFixed(2)):"",
          cls.total!==0 ? parseFloat(Math.abs(cls.total).toFixed(2)) :"",
        ])
        styleRow(row, idx===0?empFill:(idx%2===1?altFill:undefined), idx===0?boldF():normF())
      })

      const tot = ws.addRow([
        "TOTAL","","","","","",
        totOrd>0?parseFloat(totOrd.toFixed(2)):"",
        totNoc>0?parseFloat(totNoc.toFixed(2)):"",
        totFest>0?parseFloat(totFest.toFixed(2)):"",
        totNF>0?parseFloat(totNF.toFixed(2)):"",
        totEOrd>0?parseFloat(totEOrd.toFixed(2)):"",
        totENoc>0?parseFloat(totENoc.toFixed(2)):"",
        totEFest>0?parseFloat(totEFest.toFixed(2)):"",
        totENF>0?parseFloat(totENF.toFixed(2)):"",
        parseFloat(totHxT.toFixed(2)),
      ])
      styleRow(tot, totalFill, totalF(), 20)
    }

    ws.autoFilter = { from:{row:2,column:1}, to:{row:2,column:15} }
  }
}

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const token = await getAuthToken(request)
    if (!token) return NextResponse.json({ error:"No autorizado" }, { status:401 })

    const empresaId = (token as any)?.empresaId
    if (!empresaId) return NextResponse.json({ error:"Empresa no encontrada" }, { status:400 })

    const { searchParams } = new URL(request.url)
    const periodoId   = searchParams.get("periodoId")
    const empleadoId  = searchParams.get("empleadoId") ?? undefined
    const centroCosto = searchParams.get("centroCosto") ?? undefined
    const programa    = searchParams.get("programa") ?? undefined
    const modalidad   = searchParams.get("modalidad") ?? undefined

    if (!periodoId) return NextResponse.json({ error:"periodoId requerido" }, { status:400 })

    const periodo = await prisma.periodoNomina.findFirst({
      where: { id:periodoId, empresaId },
      include: { configuracionLegal:true },
    })
    if (!periodo) return NextResponse.json({ error:"Período no encontrado" }, { status:404 })

    const tope = (periodo as any).configuracionLegal?.horasSemanalesMaximas ?? 44

    const empleadoWhere: any = { empresaId, estaActivo:true }
    if (empleadoId)  empleadoWhere.id          = empleadoId
    if (centroCosto) empleadoWhere.centroCosto = centroCosto
    if (programa)    empleadoWhere.programa    = programa
    if (modalidad)   empleadoWhere.modalidad   = modalidad

    const empleados = await prisma.empleado.findMany({
      where: empleadoWhere, orderBy:{ apellidos:"asc" },
    })
    const empleadoIds = empleados.map((e: any) => e.id)

    // Resultados (for Liquidación + Resumen sheets)
    const resultados = await prisma.resultadoNomina.findMany({
      where: { periodoId, empresaId, empleadoId:{ in:empleadoIds } },
      include: { empleado:true },
      orderBy: { empleado:{ apellidos:"asc" } },
    })

    // Asignaciones (for Informe Horas Extras + Weekly sheets)
    const asignaciones = await prisma.asignacionTurno.findMany({
      where: {
        empresaId,
        empleadoId: { in: empleadoIds },
        fechaTurno: { gte: periodo.fechaInicio, lte: periodo.fechaFin },
      },
      include: {
        concepto: true,
        novedad:  true,
        empleado: true,
      },
      orderBy: [{ empleadoId:"asc" }, { fechaTurno:"asc" }],
    })

    const wb = new ExcelJS.Workbook()
    wb.creator  = "TurnosControl"
    wb.created  = new Date()
    wb.modified = new Date()

    const configLegal = (periodo as any).configuracionLegal

    buildHorasExtrasSheet(wb, periodo, asignaciones, tope)
    buildLiquidacionSheet(wb, periodo, resultados, configLegal)
    buildResumenSheet(wb, periodo, resultados, configLegal)
    buildWeeklySheets(wb, periodo, asignaciones, tope)

    const arrayBuffer = await wb.xlsx.writeBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const safeName = encodeURIComponent(`Nomina_${periodo.nombrePeriodo}`)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safeName}.xlsx"`,
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    console.error("Error al generar Excel:", error)
    return NextResponse.json({ error:"Error al generar el reporte" }, { status:500 })
  }
}
