import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getToken } from "next-auth/jwt"
import ExcelJS from "exceljs"
import {
  horaAMinutos,
  isFestivoCO,
  getEffectiveBreakMin,
  calcularClasificacion,
  getNumeroSemanaISO,
  EMPTY_CLS,
  type HourClassification,
} from "@/lib/horario"

export const dynamic = "force-dynamic"

// ─── Colores ─────────────────────────────────────────────────────────────────

const C = {
  TITLE_BG:    "FF1B5E20",   // verde oscuro
  TITLE_FG:    "FFFFFFFF",
  SUB_BG:      "FFE8F5E9",   // verde muy claro
  SUB_FG:      "FF1B5E20",
  INFO_BG:     "FFFAFAFA",
  INFO_FG:     "FF424242",
  DATOS_BG:    "FF37474F",   // gris azulado oscuro
  DATOS_FG:    "FFFFFFFF",
  RECARGO_BG:  "FF00695C",   // verde teal oscuro — RECARGOS
  RECARGO_FG:  "FFFFFFFF",
  EXTRA_BG:    "FFE65100",   // naranja oscuro — HORAS EXTRAS
  EXTRA_FG:    "FFFFFFFF",
  TOTAL_BG:    "FF37474F",
  TOTAL_FG:    "FFFFFFFF",
  ROW_ALT:     "FFF1F8E9",   // verde muy claro alternado
  ROW_FEST:    "FFFFF8E1",   // amarillo claro para festivos
  TOTALES_BG:  "FF263238",
  TOTALES_FG:  "FFFFFFFF",
}

const DIAS_LARGO = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
const DIAS_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

function fmtDate(d: Date) {
  const dd = String(d.getUTCDate()).padStart(2, "0")
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const yy = d.getUTCFullYear()
  return `${dd}/${mm}/${yy}`
}

function fmtHoras(min: number): string {
  if (min === 0) return ""
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}:00` : `${h}:${String(m).padStart(2, "0")}`
}

function applyBorder(cell: ExcelJS.Cell, color = "FFB0BEC5") {
  const s = { style: "thin" as const, color: { argb: color } }
  cell.border = { top: s, left: s, bottom: s, right: s }
}

function styleSection(
  ws: ExcelJS.Worksheet,
  rowNum: number,
  colStart: number,
  colEnd: number,
  bgColor: string,
  fgColor: string,
  label: string,
  fontSize = 9,
) {
  ws.mergeCells(rowNum, colStart, rowNum, colEnd)
  const cell = ws.getCell(rowNum, colStart)
  cell.value = label
  cell.font  = { bold: true, color: { argb: fgColor }, size: fontSize, name: "Calibri" }
  cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } }
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
  for (let c = colStart; c <= colEnd; c++) {
    const cc = ws.getCell(rowNum, c)
    cc.border = {
      top:    { style: "medium", color: { argb: bgColor } },
      bottom: { style: "medium", color: { argb: bgColor } },
      left:   { style: "thin",   color: { argb: fgColor + "44" } },
      right:  { style: "thin",   color: { argb: fgColor + "44" } },
    }
  }
}

// ─── Columnas ─────────────────────────────────────────────────────────────────
// A=1…U=21
const COL = {
  EMPLEADO:   1,   // A
  DOCUMENTO:  2,   // B
  CC:         3,   // C
  PROGRAMA:   4,   // D
  FECHA:      5,   // E
  DIA:        6,   // F
  FDOM:       7,   // G — F/Dom indicator
  TURNO:      8,   // H
  NOVEDAD:    9,   // I
  C010:       10,  // J — Ordinarias
  C011:       11,  // K — Nocturnas
  C012:       12,  // L — Festivas
  C013:       13,  // M — Noct. Festivas
  C045:       14,  // N — Extra diurna
  C046:       15,  // O — Extra nocturna
  C047:       16,  // P — Extra diurna festiva
  C048:       17,  // Q — Extra noct. festiva
  TOTAL_DIA:  18,  // R
  HRS_EXTRA:  19,  // S
  ACUM_SEM:   20,  // T
  NRO_SEM:    21,  // U
}
const TOTAL_COLS = 21

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const empresaId = (token as any)?.empresaId
    if (!empresaId) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 })

    const sp          = request.nextUrl.searchParams
    const startDate   = sp.get("startDate")
    const endDate     = sp.get("endDate")
    const empleadoId  = sp.get("empleadoId")
    const centroCosto = sp.get("centroCosto")
    const programa    = sp.get("programa")
    const modalidad   = sp.get("modalidad")
    const search      = sp.get("search")

    // Configuración legal de la empresa (para nocturno y descanso)
    const configLegal = await prisma.configuracionLegal.findFirst({
      where: { empresaId },
      orderBy: { creadoEn: "desc" },
    })
    const nightStartMin = configLegal?.horaInicioNocturno
      ? horaAMinutos(configLegal.horaInicioNocturno)
      : 19 * 60
    const nightEndMin = configLegal?.horaFinNocturno
      ? horaAMinutos(configLegal.horaFinNocturno)
      : 6 * 60
    const defaultBreakMin = configLegal?.duracionAlmuerzaMinutos ?? 30
    const topeMin = (configLegal?.horasSemanalesMaximas ?? 44) * 60

    // Filtros de asignaciones
    const whereClause: any = { empresaId }
    if (startDate && endDate) {
      whereClause.fechaTurno = {
        gte: new Date(startDate + "T00:00:00Z"),
        lte: new Date(endDate   + "T23:59:59Z"),
      }
    }
    if (empleadoId) whereClause.empleadoId = empleadoId

    const empWhere: any = {}
    if (centroCosto) empWhere.centroCosto = centroCosto
    if (programa)    empWhere.programa    = programa
    if (modalidad)   empWhere.modalidad   = modalidad
    if (search) empWhere.OR = [
      { nombres:  { contains: search, mode: "insensitive" } },
      { apellidos: { contains: search, mode: "insensitive" } },
    ]
    if (Object.keys(empWhere).length > 0) whereClause.empleado = empWhere

    const asignaciones = await prisma.asignacionTurno.findMany({
      where: whereClause,
      include: {
        concepto: true,
        novedad:  true,
        empleado: {
          select: {
            id: true, nombres: true, apellidos: true,
            numeroDocumento: true, centroCosto: true, programa: true, modalidad: true,
          },
        },
      },
      orderBy: [
        { empleadoId: "asc" },
        { fechaTurno: "asc" },
      ],
    })

    // ─── Acumulados semanales por empleado ────────────────────────────────────
    // key: `${empleadoId}_W${semana}` → minutos acumulados hasta ANTES de la fila actual
    const weekRunning = new Map<string, number>()

    // ─── Workbook ─────────────────────────────────────────────────────────────

    const wb = new ExcelJS.Workbook()
    wb.creator = "Sistema de Turnos"
    wb.created  = new Date()

    const ws = wb.addWorksheet("Historial de Programaciones", {
      views: [{ state: "frozen", ySplit: 5 }],
    })

    // Anchos de columna
    ws.getColumn(COL.EMPLEADO).width  = 26
    ws.getColumn(COL.DOCUMENTO).width = 13
    ws.getColumn(COL.CC).width        = 13
    ws.getColumn(COL.PROGRAMA).width  = 14
    ws.getColumn(COL.FECHA).width     = 11
    ws.getColumn(COL.DIA).width       = 6
    ws.getColumn(COL.FDOM).width      = 6
    ws.getColumn(COL.TURNO).width     = 12
    ws.getColumn(COL.NOVEDAD).width   = 10
    for (let c = COL.C010; c <= COL.C048; c++) ws.getColumn(c).width = 8
    ws.getColumn(COL.TOTAL_DIA).width = 9
    ws.getColumn(COL.HRS_EXTRA).width = 9
    ws.getColumn(COL.ACUM_SEM).width  = 9
    ws.getColumn(COL.NRO_SEM).width   = 7

    // ── Fila 1: Título ────────────────────────────────────────────────────────
    ws.getRow(1).height = 36
    ws.mergeCells(1, 1, 1, TOTAL_COLS)
    const titleCell = ws.getCell(1, 1)
    titleCell.value = "HISTORIAL DE PROGRAMACIONES"
    titleCell.font  = { bold: true, size: 16, color: { argb: C.TITLE_FG }, name: "Calibri" }
    titleCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: C.TITLE_BG } }
    titleCell.alignment = { horizontal: "center", vertical: "middle" }

    // ── Fila 2: Info filtros ──────────────────────────────────────────────────
    ws.getRow(2).height = 18
    ws.mergeCells(2, 1, 2, TOTAL_COLS)
    const infoStr = [
      startDate && endDate ? `Período: ${startDate} → ${endDate}` : "",
      centroCosto ? `CC: ${centroCosto}` : "",
      programa    ? `Programa: ${programa}` : "",
      `Total registros: ${asignaciones.length}`,
      `Generado: ${new Date().toLocaleString("es-CO")}`,
    ].filter(Boolean).join("   |   ")
    const infoCell = ws.getCell(2, 1)
    infoCell.value = infoStr
    infoCell.font  = { size: 8, italic: true, color: { argb: C.SUB_FG }, name: "Calibri" }
    infoCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: C.SUB_BG } }
    infoCell.alignment = { horizontal: "center", vertical: "middle" }

    // ── Fila 3: Spacer ────────────────────────────────────────────────────────
    ws.getRow(3).height = 5
    ws.mergeCells(3, 1, 3, TOTAL_COLS)
    ws.getCell(3, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F5E9" } }

    // ── Fila 4: Cabeceras de sección ─────────────────────────────────────────
    ws.getRow(4).height = 22

    styleSection(ws, 4, COL.EMPLEADO, COL.NOVEDAD,  C.DATOS_BG,   C.DATOS_FG,   "DATOS DEL EMPLEADO / TURNO", 9)
    styleSection(ws, 4, COL.C010,     COL.C013,      C.RECARGO_BG, C.RECARGO_FG, "RECARGOS", 9)
    styleSection(ws, 4, COL.C045,     COL.C048,      C.EXTRA_BG,   C.EXTRA_FG,   "HORAS EXTRAS", 9)
    styleSection(ws, 4, COL.TOTAL_DIA, COL.NRO_SEM,  C.TOTAL_BG,   C.TOTAL_FG,   "TOTALES / SEMANA", 9)

    // ── Fila 5: Nombres de columna ────────────────────────────────────────────
    ws.getRow(5).height = 30
    const headers: Record<number, string> = {
      [COL.EMPLEADO]:  "Empleado",
      [COL.DOCUMENTO]: "Documento",
      [COL.CC]:        "Cto. Costo",
      [COL.PROGRAMA]:  "Programa",
      [COL.FECHA]:     "Fecha",
      [COL.DIA]:       "Día",
      [COL.FDOM]:      "F/Dom",
      [COL.TURNO]:     "Turno",
      [COL.NOVEDAD]:   "Novedad",
      [COL.C010]:      "010\nOrdinarias",
      [COL.C011]:      "011\nNocturnas",
      [COL.C012]:      "012\nFestivas",
      [COL.C013]:      "013\nNoct/Fest",
      [COL.C045]:      "045\nEx. Diurna",
      [COL.C046]:      "046\nEx. Noct.",
      [COL.C047]:      "047\nEx. D/Fest",
      [COL.C048]:      "048\nEx. N/Fest",
      [COL.TOTAL_DIA]: "Total\nDía",
      [COL.HRS_EXTRA]: "Hrs.\nExtra",
      [COL.ACUM_SEM]:  "Acum.\nSemana",
      [COL.NRO_SEM]:   "Nro.\nSem.",
    }
    for (let c = 1; c <= TOTAL_COLS; c++) {
      const cell = ws.getCell(5, c)
      const isRecargo = c >= COL.C010 && c <= COL.C013
      const isExtra   = c >= COL.C045 && c <= COL.C048
      const isTotals  = c >= COL.TOTAL_DIA
      const bg = isRecargo ? C.RECARGO_BG : isExtra ? C.EXTRA_BG : isTotals ? C.TOTAL_BG : C.DATOS_BG
      const fg = C.TITLE_FG

      cell.value = headers[c] ?? ""
      cell.font  = { bold: true, size: 8, color: { argb: fg }, name: "Calibri" }
      cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: bg } }
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
      cell.border = {
        top:    { style: "medium", color: { argb: bg } },
        bottom: { style: "medium", color: { argb: "FFFFFFFF" } },
        left:   { style: "thin",   color: { argb: "FFFFFFFF" + "33" } },
        right:  { style: "thin",   color: { argb: "FFFFFFFF" + "33" } },
      }
    }

    // ─── Acumuladores para TOTALES ────────────────────────────────────────────
    const sumCols: Record<number, number> = {
      [COL.C010]: 0, [COL.C011]: 0, [COL.C012]: 0, [COL.C013]: 0,
      [COL.C045]: 0, [COL.C046]: 0, [COL.C047]: 0, [COL.C048]: 0,
      [COL.TOTAL_DIA]: 0, [COL.HRS_EXTRA]: 0,
    }

    // ─── Filas de datos ───────────────────────────────────────────────────────
    asignaciones.forEach((a: any, idx: number) => {
      const fecha    = new Date(a.fechaTurno)
      const semana   = getNumeroSemanaISO(fecha)
      const weekKey  = `${a.empleadoId}_W${semana}`
      const acumMin  = weekRunning.get(weekKey) ?? 0
      const esFest   = isFestivoCO(fecha)
      const diaSem   = fecha.getUTCDay()

      const inicioStr = a.horaInicioPersonalizada ?? a.concepto.horaInicioDefecto ?? null
      const finStr    = a.horaFinPersonalizada    ?? a.concepto.horaFinDefecto    ?? null

      let cls: HourClassification = { ...EMPTY_CLS }
      let breakMin = 0

      if (inicioStr && finStr && a.concepto.tipoImpacto !== "NEUTRO" && a.concepto.afectaLiquidacion) {
        breakMin = getEffectiveBreakMin(a.minutosAlimentacion, null, defaultBreakMin)
        cls = calcularClasificacion(
          inicioStr, finStr, esFest,
          acumMin, topeMin,
          breakMin,
          nightStartMin, nightEndMin,
        )
      }

      // Actualizar acumulado semanal DESPUÉS de usar el valor anterior
      weekRunning.set(weekKey, acumMin + cls.totalMin)
      const acumDespues = acumMin + cls.totalMin

      const turnoStr = inicioStr && finStr ? `${inicioStr}–${finStr}` : ""
      const fdomStr  = esFest ? (fecha.getUTCDay() === 0 ? "Dom" : "Fest") : ""

      const totalDiaMin = cls.totalMin
      const extraMin    = cls.extrasMin

      // Acumular totales
      sumCols[COL.C010] += cls.ord;  sumCols[COL.C011] += cls.noc
      sumCols[COL.C012] += cls.fest; sumCols[COL.C013] += cls.nf
      sumCols[COL.C045] += cls.exD;  sumCols[COL.C046] += cls.exN
      sumCols[COL.C047] += cls.exDF; sumCols[COL.C048] += cls.exNF
      sumCols[COL.TOTAL_DIA] += totalDiaMin
      sumCols[COL.HRS_EXTRA] += extraMin

      const rowNum = idx + 6
      const row = ws.getRow(rowNum)
      row.height = 17

      const setBg = esFest ? C.ROW_FEST : idx % 2 === 1 ? C.ROW_ALT : "FFFFFFFF"

      const setVal = (col: number, val: any, fmt?: string) => {
        const cell = ws.getCell(rowNum, col)
        cell.value = val
        cell.font  = { size: 8, name: "Calibri" }
        cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: setBg } }
        cell.alignment = { vertical: "middle", horizontal: "center" }
        applyBorder(cell)
        if (fmt) cell.numFmt = fmt
      }

      setVal(COL.EMPLEADO,  `${a.empleado.apellidos}, ${a.empleado.nombres}`)
      setVal(COL.DOCUMENTO, a.empleado.numeroDocumento)
      setVal(COL.CC,        a.empleado.centroCosto ?? "")
      setVal(COL.PROGRAMA,  a.empleado.programa    ?? "")
      setVal(COL.FECHA,     fmtDate(fecha))
      setVal(COL.DIA,       DIAS_CORTO[diaSem])
      setVal(COL.FDOM,      fdomStr)
      setVal(COL.TURNO,     turnoStr)
      setVal(COL.NOVEDAD,   a.novedad?.codigo ?? "")

      // Horas clasificadas (mostrar vacío si 0)
      const setHrs = (col: number, min: number, bg: string) => {
        const cell = ws.getCell(rowNum, col)
        cell.value = min > 0 ? min / 60 : null
        cell.font  = { size: 8, name: "Calibri", bold: min > 0 }
        cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: min > 0 ? bg + "22" : setBg } }
        cell.alignment = { vertical: "middle", horizontal: "center" }
        cell.numFmt = min > 0 ? "#,##0.00" : ""
        applyBorder(cell)
      }

      setHrs(COL.C010, cls.ord,  "00695C")
      setHrs(COL.C011, cls.noc,  "00695C")
      setHrs(COL.C012, cls.fest, "00695C")
      setHrs(COL.C013, cls.nf,   "00695C")
      setHrs(COL.C045, cls.exD,  "E65100")
      setHrs(COL.C046, cls.exN,  "E65100")
      setHrs(COL.C047, cls.exDF, "E65100")
      setHrs(COL.C048, cls.exNF, "E65100")

      // Total día
      const totalCell = ws.getCell(rowNum, COL.TOTAL_DIA)
      totalCell.value  = totalDiaMin > 0 ? totalDiaMin / 60 : null
      totalCell.font   = { size: 8, bold: true, name: "Calibri" }
      totalCell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: setBg } }
      totalCell.alignment = { vertical: "middle", horizontal: "center" }
      totalCell.numFmt = "#,##0.00"
      applyBorder(totalCell)

      // Horas extra del día
      const extraCell = ws.getCell(rowNum, COL.HRS_EXTRA)
      extraCell.value  = extraMin > 0 ? extraMin / 60 : null
      extraCell.font   = { size: 8, bold: extraMin > 0, color: { argb: extraMin > 0 ? "FFE65100" : "FF424242" }, name: "Calibri" }
      extraCell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: setBg } }
      extraCell.alignment = { vertical: "middle", horizontal: "center" }
      extraCell.numFmt = "#,##0.00"
      applyBorder(extraCell)

      // Acum semana
      const acumCell = ws.getCell(rowNum, COL.ACUM_SEM)
      acumCell.value = acumDespues / 60
      acumCell.font  = { size: 8, name: "Calibri" }
      acumCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: setBg } }
      acumCell.alignment = { vertical: "middle", horizontal: "center" }
      acumCell.numFmt = "#,##0.00"
      applyBorder(acumCell)

      // Nro semana
      const semCell = ws.getCell(rowNum, COL.NRO_SEM)
      semCell.value = semana
      semCell.font  = { size: 8, name: "Calibri" }
      semCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: setBg } }
      semCell.alignment = { vertical: "middle", horizontal: "center" }
      applyBorder(semCell)

      // Alinear texto en columnas de descripción a la izquierda
      ws.getCell(rowNum, COL.EMPLEADO).alignment  = { vertical: "middle", horizontal: "left" }
      ws.getCell(rowNum, COL.PROGRAMA).alignment  = { vertical: "middle", horizontal: "left" }
    })

    // ─── Fila TOTALES ─────────────────────────────────────────────────────────
    const totRowNum = asignaciones.length + 6
    ws.getRow(totRowNum).height = 20

    for (let c = 1; c <= TOTAL_COLS; c++) {
      const cell = ws.getCell(totRowNum, c)
      cell.font  = { bold: true, size: 9, color: { argb: C.TOTALES_FG }, name: "Calibri" }
      cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: C.TOTALES_BG } }
      cell.alignment = { vertical: "middle", horizontal: "center" }
      applyBorder(cell, "FF000000")
    }

    ws.getCell(totRowNum, COL.EMPLEADO).value = "TOTALES"
    ws.getCell(totRowNum, COL.EMPLEADO).alignment = { vertical: "middle", horizontal: "left" }

    const totHrsCols = [COL.C010, COL.C011, COL.C012, COL.C013, COL.C045, COL.C046, COL.C047, COL.C048, COL.TOTAL_DIA, COL.HRS_EXTRA]
    for (const col of totHrsCols) {
      const cell = ws.getCell(totRowNum, col)
      cell.value  = sumCols[col] > 0 ? sumCols[col] / 60 : null
      cell.numFmt = "#,##0.00"
    }
    ws.getCell(totRowNum, COL.NRO_SEM).value = asignaciones.length

    // ─── Salida ───────────────────────────────────────────────────────────────
    const buf = await wb.xlsx.writeBuffer()
    const label = startDate && endDate ? `${startDate}_${endDate}` : new Date().toISOString().slice(0, 10)

    return new NextResponse(Buffer.from(buf as ArrayBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Historial_Programaciones_${label}.xlsx"`,
      },
    })
  } catch (error) {
    console.error("Error exportando historial:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
