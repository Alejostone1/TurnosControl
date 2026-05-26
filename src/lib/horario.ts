// ─── FESTIVOS COLOMBIA 2025–2027 ────────────────────────────────────────────
// Fuente: Ley Emiliani + Semana Santa + decretos de salario mínimo

export const FESTIVOS_CO: Record<number, string[]> = {
  2025: [
    "2025-01-01", "2025-01-06", "2025-03-24", "2025-04-17", "2025-04-18",
    "2025-05-01", "2025-06-02", "2025-06-23", "2025-06-30", "2025-07-20",
    "2025-08-07", "2025-08-18", "2025-10-13", "2025-11-03", "2025-11-17",
    "2025-12-08", "2025-12-25",
  ],
  2026: [
    "2026-01-01", "2026-01-12", "2026-03-23", "2026-04-02", "2026-04-03",
    "2026-05-01", "2026-05-25", "2026-06-15", "2026-06-22", "2026-06-29",
    "2026-07-20", "2026-08-07", "2026-08-17", "2026-10-12", "2026-11-02",
    "2026-11-16", "2026-12-08", "2026-12-25",
  ],
  2027: [
    "2027-01-01", "2027-01-11", "2027-03-22", "2027-03-25", "2027-03-26",
    "2027-05-01", "2027-05-17", "2027-06-07", "2027-06-14", "2027-06-28",
    "2027-07-20", "2027-08-07", "2027-08-16", "2027-10-18", "2027-11-01",
    "2027-11-15", "2027-12-08", "2027-12-25",
  ],
}

// ─── Utilidades de tiempo ────────────────────────────────────────────────────

export function horaAMinutos(str: string): number {
  const [h, m] = str.split(":").map(Number)
  return h * 60 + (m || 0)
}

/** YYYY-MM-DD en UTC (para fechas ISO de la base de datos) */
export function fechaKey(date: Date): string {
  return date.toISOString().split("T")[0]
}

/** YYYY-MM-DD en hora local (para uso en el cliente) */
export function fechaKeyLocal(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** Número de semana ISO 8601 */
export function getNumeroSemanaISO(fecha: Date): number {
  const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

// ─── Festivos ────────────────────────────────────────────────────────────────

/** Verdadero si la fecha es domingo o festivo colombiano */
export function isFestivoCO(date: Date, extra?: Set<string>): boolean {
  if (date.getDay() === 0) return true
  const key = fechaKey(date)
  const anio = date.getUTCFullYear()
  const set = new Set(FESTIVOS_CO[anio] ?? [])
  if (set.has(key)) return true
  return extra?.has(key) ?? false
}

// ─── Cadena de prioridad para almuerzo ───────────────────────────────────────
/**
 * Devuelve los minutos efectivos de descanso según la cadena:
 *   AsignacionTurno.minutosAlimentacion
 *     > PeriodoNomina.minutosAlimentacion
 *       > ConfiguracionLegal.duracionAlmuerzaMinutos
 *         > 0
 *
 * null/undefined = heredar del siguiente nivel; 0 = sin descuento.
 */
export function getEffectiveBreakMin(
  asignacionMin: number | null | undefined,
  periodoMin:    number | null | undefined,
  configMin:     number | null | undefined,
): number {
  if (asignacionMin != null) return asignacionMin
  if (periodoMin    != null) return periodoMin
  return configMin ?? 0
}

// ─── Clasificación de horas ──────────────────────────────────────────────────

export interface HourClassification {
  ord:  number   // 010 — Ordinarias diurnas
  noc:  number   // 011 — Nocturnas ordinarias     (+35%)
  fest: number   // 012 — Festivas/dom. diurnas    (+80/90/100%)
  nf:   number   // 013 — Nocturnas festivas/dom.
  exD:  number   // 045 — Extra diurna             (+25%)
  exN:  number   // 046 — Extra nocturna           (+75%)
  exDF: number   // 047 — Extra diurna festiva
  exNF: number   // 048 — Extra nocturna festiva
  totalMin:  number
  extrasMin: number
}

export const EMPTY_CLS: HourClassification = {
  ord: 0, noc: 0, fest: 0, nf: 0,
  exD: 0, exN: 0, exDF: 0, exNF: 0,
  totalMin: 0, extrasMin: 0,
}

/**
 * Clasificación minuto a minuto de un turno.
 *
 * @param inicioStr      "HH:MM" — inicio del turno
 * @param finStr         "HH:MM" — fin del turno (día siguiente si ≤ inicio)
 * @param esFestivo      si la fecha es festivo o domingo
 * @param acumMin        minutos acumulados ANTES de este turno en la semana
 * @param topeMin        tope semanal en minutos (ej. 44×60 = 2 640)
 * @param breakMin       minutos de descanso a saltar desde el INICIO del turno
 * @param nightStartMin  inicio del período nocturno en minutos (def. 19:00 — Ley 2466/2025)
 * @param nightEndMin    fin del período nocturno en minutos (def. 06:00)
 */
export function calcularClasificacion(
  inicioStr:     string,
  finStr:        string,
  esFestivo:     boolean,
  acumMin:       number,
  topeMin:       number,
  breakMin       = 0,
  nightStartMin  = 19 * 60,
  nightEndMin    = 6  * 60,
): HourClassification {
  const ini = horaAMinutos(inicioStr)
  let   fin = horaAMinutos(finStr)
  if (fin <= ini) fin += 1440

  const cls: HourClassification = { ...EMPTY_CLS }
  let capacidadRestante = Math.max(0, topeMin - acumMin)

  // El descanso se descuenta desde el INICIO del turno
  const loopStart = ini + breakMin

  for (let m = loopStart; m < fin; m++) {
    const minOfDay = m % 1440
    // 19:00–06:00 cruza medianoche → usa OR
    const isNight = nightStartMin > nightEndMin
      ? minOfDay >= nightStartMin || minOfDay < nightEndMin
      : minOfDay >= nightStartMin && minOfDay < nightEndMin

    cls.totalMin++

    if (capacidadRestante > 0) {
      capacidadRestante--
      if (esFestivo) { if (isNight) cls.nf++;  else cls.fest++ }
      else           { if (isNight) cls.noc++;  else cls.ord++  }
    } else {
      cls.extrasMin++
      if (esFestivo) { if (isNight) cls.exNF++; else cls.exDF++ }
      else           { if (isNight) cls.exN++;  else cls.exD++  }
    }
  }

  return cls
}

// ─── Horas netas de un concepto ─────────────────────────────────────────────

interface ConceptoMin {
  tipoImpacto?:      string | null
  horasFijas?:       number | null
  horaInicioDefecto?: string | null
  horaFinDefecto?:   string | null
}

/**
 * Horas netas de trabajo para una asignación (sin contexto semanal).
 * Devuelve valor negativo para conceptos de RESTA_HORAS.
 */
export function getConceptoHoras(
  concepto:   ConceptoMin,
  horaInicio: string | null | undefined,
  horaFin:    string | null | undefined,
  breakMin    = 0,
): number {
  if (concepto.tipoImpacto === "NEUTRO") return 0

  const sign = concepto.tipoImpacto === "RESTA_HORAS" ? -1 : 1

  if (concepto.horasFijas != null) return sign * concepto.horasFijas

  const s = horaInicio || concepto.horaInicioDefecto
  const e = horaFin    || concepto.horaFinDefecto
  if (!s || !e) return 0

  let ini = horaAMinutos(s)
  let fin = horaAMinutos(e)
  if (fin <= ini) fin += 1440

  return sign * Math.max(0, fin - ini - breakMin) / 60
}
