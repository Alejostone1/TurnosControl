import { prisma } from "@/lib/prisma"

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface ResultadoDia {
  horasOrdinarias: number
  horasNocturnas: number
  horasFestivas: number
  horasNoctFestivas: number
  extrasOrdinarias: number
  extrasNocturnas: number
  extrasDiurnaFest: number
  extrasNoctFest: number
  totalHorasTrabajadas: number
  horasExtrasGeneradas: number
  horasDeuda: number
  horasSemanaAcumuladas: number
  requiereCompensatorio: boolean
  compensatorioAsignado: boolean
  valorHoraUsado: number
  valorTotalDia: number
}

interface ConfiguracionLegal {
  horasSemanalesMaximas: number
  horasDiariasEstandar: number
  porcentajeRecargoNocturno: number
  porcentajeRecargoDomFestivo: number
  porcentajeRecargoNocturnoFestivo: number
  porcentajeExtraDiurna: number
  porcentajeExtraNocturno: number
  porcentajeExtraDiurnaFestiva: number
  porcentajeExtraNocturnaFestiva: number
  horaInicioNocturno: string
  horaFinNocturno: string
  tipoAlmuerzo: string
  duracionAlmuerzaMinutos: number
  horaInicioAlmuerzo: string
  horaFinAlmuerzo: string
  formulaValorHora: string
  tipoCalculoHorasExtras: string
}

interface ConceptoNomina {
  codigo: string
  nombre: string
  categoria: string
  tipoCalculo: string
  horasFijas: number | null
  horaInicioDefecto: string | null
  horaFinDefecto: string | null
  cruzaMedianoche: boolean
  afectaLiquidacion: boolean
  cuentaParaTope: boolean
  requiereJustificacion: boolean
  generaCompenatorio: boolean
}

// ─── Festivos colombianos completos 2025–2027 ─────────────────────────────────
// Incluye fijos + móviles (Ley Emiliani y cálculos de Semana Santa)
const FESTIVOS_CO: Record<number, string[]> = {
  2025: [
    "2025-01-01", // Año Nuevo
    "2025-01-06", // Reyes Magos (móvil — lunes siguiente)
    "2025-03-24", // San José (móvil)
    "2025-04-17", // Jueves Santo
    "2025-04-18", // Viernes Santo
    "2025-05-01", // Día del Trabajo
    "2025-06-02", // Ascensión del Señor (móvil)
    "2025-06-23", // Corpus Christi (móvil)
    "2025-06-30", // Sagrado Corazón (móvil)
    "2025-07-20", // Independencia
    "2025-08-07", // Batalla de Boyacá
    "2025-08-18", // Asunción de la Virgen (móvil)
    "2025-10-13", // Día de la Raza (móvil)
    "2025-11-03", // Todos los Santos (móvil)
    "2025-11-17", // Independencia de Cartagena (móvil)
    "2025-12-08", // Inmaculada Concepción
    "2025-12-25", // Navidad
  ],
  2026: [
    "2026-01-01", // Año Nuevo
    "2026-01-12", // Reyes Magos (móvil)
    "2026-03-23", // San José (móvil)
    "2026-04-02", // Jueves Santo
    "2026-04-03", // Viernes Santo
    "2026-05-01", // Día del Trabajo
    "2026-05-25", // Ascensión del Señor (móvil)
    "2026-06-15", // Corpus Christi (móvil)
    "2026-06-22", // Sagrado Corazón (móvil)
    "2026-06-29", // San Pedro y San Pablo (móvil)
    "2026-07-20", // Independencia
    "2026-08-07", // Batalla de Boyacá
    "2026-08-17", // Asunción de la Virgen (móvil)
    "2026-10-12", // Día de la Raza (móvil)
    "2026-11-02", // Todos los Santos (móvil)
    "2026-11-16", // Independencia de Cartagena (móvil)
    "2026-12-08", // Inmaculada Concepción
    "2026-12-25", // Navidad
  ],
  2027: [
    "2027-01-01",
    "2027-01-11",
    "2027-03-22",
    "2027-03-25",
    "2027-03-26",
    "2027-05-01",
    "2027-05-17",
    "2027-06-07",
    "2027-06-14",
    "2027-06-28",
    "2027-07-20",
    "2027-08-07",
    "2027-08-16",
    "2027-10-18",
    "2027-11-01",
    "2027-11-15",
    "2027-12-08",
    "2027-12-25",
  ],
}

/**
 * Horas laborales esperadas para un período.
 *
 * Regla: el domingo es día de descanso, no forma parte de la jornada base.
 * Cada semana completa (L–S) = 6 días × 7,33h = 44h.
 * Solo se cuentan semanas ISO completas; la semana parcial sobrante no suma
 * al tope base (no se trabajan domingos en jornada ordinaria).
 *
 *   horas = floor(días / 7) × 44
 *
 * Ejemplos:
 *   30 días → floor(30/7) = 4 semanas → 4 × 44 = 176h
 *   15 días → floor(15/7) = 2 semanas → 2 × 44 =  88h
 *    7 días → floor(7/7)  = 1 semana  → 1 × 44 =  44h
 */
export function calcularHorasEsperadasPeriodo(
  fechaInicio: Date,
  fechaFin: Date,
  horasSemanalesMaximas = 44
): number {
  const diasEnPeriodo =
    Math.round((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const semanasCompletas = Math.floor(diasEnPeriodo / 7)
  return semanasCompletas * horasSemanalesMaximas
}

// ─────────────────────────────────────────────────────────────────────────────

export class CalculationService {

  // ── Festivos ──────────────────────────────────────────────────────────────

  private obtenerFestivosColombia(anio: number): Set<string> {
    const lista = FESTIVOS_CO[anio] ?? []
    return new Set(lista)
  }

  private esFestivo(fecha: Date, festivosColombia: Set<string>): boolean {
    if (fecha.getDay() === 0) return true  // domingo
    const dk = this.toDateKey(fecha)
    return festivosColombia.has(dk)
  }

  private toDateKey(fecha: Date): string {
    return fecha.toISOString().split("T")[0]
  }

  // ── Hora helpers ──────────────────────────────────────────────────────────

  private horaAMinutos(horaStr: string): number {
    const [h, m] = horaStr.split(":").map(Number)
    return h * 60 + m
  }

  private esHoraNocturna(horaMinutos: number, cfg: ConfiguracionLegal): boolean {
    const ini = this.horaAMinutos(cfg.horaInicioNocturno)
    const fin = this.horaAMinutos(cfg.horaFinNocturno)
    if (ini > fin) return horaMinutos >= ini || horaMinutos < fin   // cruza medianoche
    return horaMinutos >= ini && horaMinutos < fin
  }

  // ── Número de semana ISO ──────────────────────────────────────────────────

  private getNumeroSemana(fecha: Date): number {
    const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  }

  // ── Valor hora ───────────────────────────────────────────────────────────

  private calcularValorHora(salarioBase: number, formula: string): number {
    if (formula.includes("220")) return salarioBase / 220
    if (formula.includes("240")) return salarioBase / 240
    return salarioBase / 220
  }

  // ── Horas del turno con descuento de almuerzo ─────────────────────────────

  private calcularHorasTurno(
    inicioStr: string,
    finStr: string,
    cfg: ConfiguracionLegal,
    esTurno24T = false
  ): number {
    let ini = this.horaAMinutos(inicioStr)
    let fin = this.horaAMinutos(finStr)
    if (fin <= ini) fin += 24 * 60  // cruza medianoche

    let horas = (fin - ini) / 60

    if (cfg.tipoAlmuerzo !== "NINGUNO" && !esTurno24T) {
      if (cfg.tipoAlmuerzo === "PREDEFINIDO") {
        horas -= cfg.duracionAlmuerzaMinutos / 60
      } else if (cfg.tipoAlmuerzo === "PERSONALIZADO" && cfg.horaInicioAlmuerzo && cfg.horaFinAlmuerzo) {
        const aIni = this.horaAMinutos(cfg.horaInicioAlmuerzo)
        const aFin = this.horaAMinutos(cfg.horaFinAlmuerzo)
        if (ini <= aIni && fin >= aFin) {
          horas -= (aFin - aIni) / 60
        }
      }
    }

    return Math.max(0, horas)
  }

  // ── Distribución minuto a minuto ──────────────────────────────────────────
  /**
   * Recorre el turno minuto a minuto para asignar cada minuto al cubo correcto:
   * - Si hay capacidad semanal/diaria restante → horas ordinarias (con su recargo)
   * - Si se superó el tope → horas extra (con su recargo)
   *
   * Esta es la única forma correcta de manejar turnos que cruzan la medianoche
   * o que mezclan horas diurnas y nocturnas.
   */
  private distribuirMinutoAMinuto(
    resultado: ResultadoDia,
    inicioStr: string,
    finStr: string,
    esDiaFestivo: boolean,
    horasAcumuladas: number,   // horas acumuladas ANTES de este turno (semana o día)
    horasMaximas: number,      // tope semanal (44) o diario (7.33)
    cfg: ConfiguracionLegal,
    festivosColombia: Set<string>,
    fecha: Date
  ): void {
    let ini = this.horaAMinutos(inicioStr)
    let fin = this.horaAMinutos(finStr)
    if (fin <= ini) fin += 24 * 60

    let capacidadRestante = Math.max(0, (horasMaximas - horasAcumuladas) * 60)  // en minutos

    for (let minuto = ini; minuto < fin; minuto++) {
      const horaActual = minuto % (24 * 60)

      // Determinar si este minuto cae en día siguiente (para turnos que cruzan medianoche)
      const minutosDesdeIni = minuto - ini
      const fechaDelMinuto  = minutosDesdeIni < (24 * 60 - ini)
        ? fecha
        : new Date(fecha.getTime() + 86_400_000)

      const esFest = esDiaFestivo || this.esFestivo(fechaDelMinuto, festivosColombia)
      const esNoc  = this.esHoraNocturna(horaActual, cfg)

      if (capacidadRestante > 0) {
        // Minuto ordinario (con su recargo si aplica)
        if (esNoc && esFest)      resultado.horasNoctFestivas += 1 / 60
        else if (esNoc)           resultado.horasNocturnas    += 1 / 60
        else if (esFest)          resultado.horasFestivas     += 1 / 60
        else                      resultado.horasOrdinarias   += 1 / 60
        capacidadRestante--
      } else {
        // Minuto extra
        if (esNoc && esFest)      resultado.extrasNoctFest    += 1 / 60
        else if (esNoc)           resultado.extrasNocturnas   += 1 / 60
        else if (esFest)          resultado.extrasDiurnaFest  += 1 / 60
        else                      resultado.extrasOrdinarias  += 1 / 60
        resultado.horasExtrasGeneradas += 1 / 60
      }
    }

    const horasTotales = (fin - ini) / 60
    resultado.totalHorasTrabajadas = horasTotales
  }

  // ── Semana ────────────────────────────────────────────────────────────────
  /**
   * Calcula una semana ISO para un empleado.
   *
   * REGLA CLAVE: horasAcumuladasAnteriores SIEMPRE se pasa como 0 para
   * cálculo SEMANAL, porque el tope de 44h es POR semana, no acumulativo.
   */
  private async calcularSemana(
    empleado: any,
    asignaciones: any[],
    configLegal: ConfiguracionLegal,
    conceptosMap: Map<string, ConceptoNomina>,
    festivosColombia: Set<string>,
    periodoId: string           // ← fix: recibimos el periodoId del contexto externo
  ): Promise<any> {
    const resultado = {
      horasOrdinarias:  0,
      horasNocturnas:   0,
      horasFestivas:    0,
      horasNoctFestivas: 0,
      extrasOrdinarias: 0,
      extrasNocturnas:  0,
      extrasDiurnaFest: 0,
      extrasNoctFest:   0,
      totalHorasTrabajadas: 0,
      registrosDiarios: [] as any[],
    }

    // CORRECCIÓN: el tope de 44h aplica POR semana → siempre arranca en 0
    let horasAcumSemana = 0
    const topeSemanal   = configLegal.horasSemanalesMaximas  // 44

    // Ordenar asignaciones por fecha para acumular en orden cronológico
    const sorted = [...asignaciones].sort(
      (a, b) => new Date(a.fechaTurno).getTime() - new Date(b.fechaTurno).getTime()
    )

    for (const asignacion of sorted) {
      const concepto = conceptosMap.get(asignacion.concepto.codigo) as ConceptoNomina | undefined
      if (!concepto || !concepto.afectaLiquidacion) continue

      // Determinar horarios (personalizado > defecto del concepto)
      const inicioStr = asignacion.horaInicioPersonalizada ?? concepto.horaInicioDefecto
      const finStr    = asignacion.horaFinPersonalizada    ?? concepto.horaFinDefecto
      if (!inicioStr || !finStr) continue

      const fecha     = new Date(asignacion.fechaTurno)
      const esDomingo = fecha.getDay() === 0
      const esFestivo = this.esFestivo(fecha, festivosColombia)
      const esTurno24T = concepto.codigo === "24T"
      const valorHora  = this.calcularValorHora(empleado.salarioBase, configLegal.formulaValorHora)

      const resultadoDia: ResultadoDia = {
        horasOrdinarias: 0, horasNocturnas: 0, horasFestivas: 0, horasNoctFestivas: 0,
        extrasOrdinarias: 0, extrasNocturnas: 0, extrasDiurnaFest: 0, extrasNoctFest: 0,
        totalHorasTrabajadas: 0, horasExtrasGeneradas: 0, horasDeuda: 0,
        horasSemanaAcumuladas: horasAcumSemana,
        requiereCompensatorio: false, compensatorioAsignado: false,
        valorHoraUsado: valorHora, valorTotalDia: 0,
      }

      // Determinar tope aplicable según configuración
      const [horasAcum, horasMax] = configLegal.tipoCalculoHorasExtras === "DIARIO"
        ? [0, configLegal.horasDiariasEstandar]   // tope diario (7.33h)
        : [horasAcumSemana, topeSemanal]           // tope semanal (44h)

      // Calcular horas netas (con descuento de almuerzo si aplica)
      const horasTurno = this.calcularHorasTurno(inicioStr, finStr, configLegal, esTurno24T)

      // Distribuir minuto a minuto según nocturnidad y tope disponible
      this.distribuirMinutoAMinuto(
        resultadoDia,
        inicioStr, finStr,
        esFestivo,
        horasAcum, horasMax,
        configLegal,
        festivosColombia,
        fecha
      )

      // Compensatorio: domingo trabajado (no festivo legal)
      if (esDomingo && !festivosColombia.has(this.toDateKey(fecha))) {
        resultadoDia.requiereCompensatorio = true
      }

      // Acumular semana
      horasAcumSemana += resultadoDia.totalHorasTrabajadas

      // Valor del día
      resultadoDia.valorTotalDia =
        resultadoDia.horasOrdinarias   * valorHora +
        resultadoDia.horasNocturnas    * valorHora * (1 + configLegal.porcentajeRecargoNocturno / 100) +
        resultadoDia.horasFestivas     * valorHora * (1 + configLegal.porcentajeRecargoDomFestivo / 100) +
        resultadoDia.horasNoctFestivas * valorHora * (1 + configLegal.porcentajeRecargoNocturnoFestivo / 100) +
        resultadoDia.extrasOrdinarias  * valorHora * (1 + configLegal.porcentajeExtraDiurna / 100) +
        resultadoDia.extrasNocturnas   * valorHora * (1 + configLegal.porcentajeExtraNocturno / 100) +
        resultadoDia.extrasDiurnaFest  * valorHora * (1 + configLegal.porcentajeExtraDiurnaFestiva / 100) +
        resultadoDia.extrasNoctFest    * valorHora * (1 + configLegal.porcentajeExtraNocturnaFestiva / 100)

      // Acumular al resultado semanal
      resultado.horasOrdinarias    += resultadoDia.horasOrdinarias
      resultado.horasNocturnas     += resultadoDia.horasNocturnas
      resultado.horasFestivas      += resultadoDia.horasFestivas
      resultado.horasNoctFestivas  += resultadoDia.horasNoctFestivas
      resultado.extrasOrdinarias   += resultadoDia.extrasOrdinarias
      resultado.extrasNocturnas    += resultadoDia.extrasNocturnas
      resultado.extrasDiurnaFest   += resultadoDia.extrasDiurnaFest
      resultado.extrasNoctFest     += resultadoDia.extrasNoctFest
      resultado.totalHorasTrabajadas += resultadoDia.totalHorasTrabajadas

      resultado.registrosDiarios.push({
        asignacionId:        asignacion.id,
        fechaDia:            fecha,
        numeroSemana:        this.getNumeroSemana(fecha),
        esFestivo,
        esDomingo,
        cruzaMedianoche:     concepto.cruzaMedianoche,
        horasOrdinarias:     resultadoDia.horasOrdinarias,
        horasNocturnas:      resultadoDia.horasNocturnas,
        horasFestivas:       resultadoDia.horasFestivas,
        horasNoctFestivas:   resultadoDia.horasNoctFestivas,
        horasExtraDiurna:    resultadoDia.extrasOrdinarias,
        horasExtraNocturna:  resultadoDia.extrasNocturnas,
        horasExtraDiurnaFest: resultadoDia.extrasDiurnaFest,
        horasExtraNoctFest:  resultadoDia.extrasNoctFest,
        totalHorasTrabajadas: resultadoDia.totalHorasTrabajadas,
        horasExtrasGeneradas: resultadoDia.horasExtrasGeneradas,
        horasDeuda:          resultadoDia.horasDeuda,
        horasSemanaAcumuladas: horasAcumSemana,
        requiereCompensatorio: resultadoDia.requiereCompensatorio,
        compensatorioAsignado: false,
        valorHoraUsado:      valorHora,
        valorTotalDia:       resultadoDia.valorTotalDia,
        // periodoId viene del contexto externo → se añade en calcularEmpleadoPeriodo
        periodoId,           // ← fix: ya no es asignacion.periodoId (que no existe)
      })
    }

    return resultado
  }

  // ── Empleado ─────────────────────────────────────────────────────────────

  private agruparPorSemanas(asignaciones: any[]): Map<number, any[]> {
    const semanas = new Map<number, any[]>()
    for (const a of asignaciones) {
      const sem = this.getNumeroSemana(new Date(a.fechaTurno))
      if (!semanas.has(sem)) semanas.set(sem, [])
      semanas.get(sem)!.push(a)
    }
    return semanas
  }

  private async calcularEmpleadoPeriodo(
    empleado: any,
    periodo: any,
    asignaciones: any[],
    festivosColombia: Set<string>
  ): Promise<void> {
    const configLegal  = periodo.configuracionLegal as ConfiguracionLegal
    const conceptosMap = new Map<string, ConceptoNomina>(
      periodo.empresa.conceptosNomina.map((c: any) => [c.codigo, c as ConceptoNomina])
    )

    // Agrupar por semana ISO
    const semanas = this.agruparPorSemanas(asignaciones)

    let totOrd = 0, totNoc = 0, totFest = 0, totNF = 0
    let totEDi = 0, totEN = 0, totEDF = 0, totENF = 0
    let totHoras = 0, totExtras = 0

    for (const [, asignacionesSemana] of Array.from(semanas.entries())) {
      // CORRECCIÓN CRÍTICA: para cálculo SEMANAL el tope siempre reinicia en 0.
      // Cada semana ISO tiene su propio tope de 44h independiente.
      const resultadoSemana = await this.calcularSemana(
        empleado,
        asignacionesSemana,
        configLegal,
        conceptosMap,
        festivosColombia,
        periodo.id   // ← pasar periodoId correctamente
      )

      totOrd   += resultadoSemana.horasOrdinarias
      totNoc   += resultadoSemana.horasNocturnas
      totFest  += resultadoSemana.horasFestivas
      totNF    += resultadoSemana.horasNoctFestivas
      totEDi   += resultadoSemana.extrasOrdinarias
      totEN    += resultadoSemana.extrasNocturnas
      totEDF   += resultadoSemana.extrasDiurnaFest
      totENF   += resultadoSemana.extrasNoctFest
      totHoras += resultadoSemana.totalHorasTrabajadas
      totExtras += (resultadoSemana.extrasOrdinarias + resultadoSemana.extrasNocturnas +
                    resultadoSemana.extrasDiurnaFest + resultadoSemana.extrasNoctFest)

      // Guardar registros diarios
      for (const reg of resultadoSemana.registrosDiarios) {
        await prisma.registroDiaTrabajado.upsert({
          where: { asignacionId: reg.asignacionId },
          update: reg,
          create: {
            empresaId:  empleado.empresaId,
            empleadoId: empleado.id,
            periodoId:  periodo.id,
            ...reg,
          },
        })
      }
    }

    // ── Valores monetarios ──────────────────────────────────────────────────
    const vH = this.calcularValorHora(empleado.salarioBase, configLegal.formulaValorHora)

    // Recargos: porcentaje ADICIONAL sobre el valor hora (no incluye la hora base)
    const vRecNoc    = totNoc  * vH * (configLegal.porcentajeRecargoNocturno / 100)
    const vRecFest   = totFest * vH * (configLegal.porcentajeRecargoDomFestivo / 100)
    const vRecNF     = totNF   * vH * (configLegal.porcentajeRecargoNocturnoFestivo / 100)
    const vExDi      = totEDi  * vH * ((100 + configLegal.porcentajeExtraDiurna) / 100)
    const vExNoc     = totEN   * vH * ((100 + configLegal.porcentajeExtraNocturno) / 100)
    const vExDiF     = totEDF  * vH * ((100 + configLegal.porcentajeExtraDiurnaFestiva) / 100)
    const vExNF      = totENF  * vH * ((100 + configLegal.porcentajeExtraNocturnaFestiva) / 100)

    const auxilioTransporte = empleado.tieneAuxilioTransporte ? 200_000 : 0  // 2026

    const totalDevengado =
      empleado.salarioBase + auxilioTransporte +
      vRecNoc + vRecFest + vRecNF +
      vExDi + vExNoc + vExDiF + vExNF

    // Deducciones obligatorias: salud 4% + pensión 4% sobre salario base
    const totalDeducciones = empleado.salarioBase * 0.08
    const netoAPagar = totalDevengado - totalDeducciones

    // Horas esperadas para el período (fórmula proporcional 44h/semana)
    const horasEsperadas = calcularHorasEsperadasPeriodo(
      new Date(periodo.fechaInicio),
      new Date(periodo.fechaFin),
      configLegal.horasSemanalesMaximas
    )
    const totalHorasDeuda = Math.max(0, horasEsperadas - totHoras)

    await prisma.resultadoNomina.upsert({
      where: {
        empresaId_empleadoId_periodoId: {
          empresaId:  empleado.empresaId,
          empleadoId: empleado.id,
          periodoId:  periodo.id,
        },
      },
      update: {
        totalHorasOrdinarias:   totOrd,
        totalHorasNocturnas:    totNoc,
        totalHorasFestivas:     totFest,
        totalHorasNoctFestivas: totNF,
        totalExtraDiurna:       totEDi,
        totalExtraNocturna:     totEN,
        totalExtraDiurnaFest:   totEDF,
        totalExtraNoctFest:     totENF,
        totalHorasTrabajadas:   totHoras,
        totalHorasExtras:       totExtras,
        totalHorasDeuda,
        salarioBase:            empleado.salarioBase,
        auxilioTransporte,
        valorHorasOrdinarias:   (totOrd + totNoc + totFest + totNF) * vH,
        valorRecargoNocturno:   vRecNoc,
        valorRecargoFestivo:    vRecFest,
        valorRecargoNoctFestivo: vRecNF,
        valorExtraDiurna:       vExDi,
        valorExtraNocturna:     vExNoc,
        valorExtraDiurnaFest:   vExDiF,
        valorExtraNoctFest:     vExNF,
        totalDevengado,
        totalDeducciones,
        netoAPagar,
        calculadoEn:  new Date(),
        calculadoPor: "sistema",
      },
      create: {
        empresaId:              empleado.empresaId,
        empleadoId:             empleado.id,
        periodoId:              periodo.id,
        totalHorasOrdinarias:   totOrd,
        totalHorasNocturnas:    totNoc,
        totalHorasFestivas:     totFest,
        totalHorasNoctFestivas: totNF,
        totalExtraDiurna:       totEDi,
        totalExtraNocturna:     totEN,
        totalExtraDiurnaFest:   totEDF,
        totalExtraNoctFest:     totENF,
        totalHorasTrabajadas:   totHoras,
        totalHorasExtras:       totExtras,
        totalHorasDeuda,
        salarioBase:            empleado.salarioBase,
        auxilioTransporte,
        valorHorasOrdinarias:   (totOrd + totNoc + totFest + totNF) * vH,
        valorRecargoNocturno:   vRecNoc,
        valorRecargoFestivo:    vRecFest,
        valorRecargoNoctFestivo: vRecNF,
        valorExtraDiurna:       vExDi,
        valorExtraNocturna:     vExNoc,
        valorExtraDiurnaFest:   vExDiF,
        valorExtraNoctFest:     vExNF,
        totalDevengado,
        totalDeducciones,
        netoAPagar,
        calculadoEn:  new Date(),
        calculadoPor: "sistema",
      },
    })
  }

  // ── Entrada pública ───────────────────────────────────────────────────────

  async calcularPeriodo(periodoId: string): Promise<void> {
    const periodo = await prisma.periodoNomina.findUnique({
      where: { id: periodoId },
      include: {
        configuracionLegal: true,
        empresa: { include: { conceptosNomina: true } },
      },
    })
    if (!periodo) throw new Error("Período no encontrado")

    // Construir set de festivos para todos los años que toca el período
    const anioInicio = new Date(periodo.fechaInicio).getFullYear()
    const anioFin    = new Date(periodo.fechaFin).getFullYear()
    const festivosColombia = new Set<string>()
    for (let y = anioInicio; y <= anioFin; y++) {
      this.obtenerFestivosColombia(y).forEach(f => festivosColombia.add(f))
    }

    // Obtener empleados asignados al período (solo los del EmpleadoPeriodo activos)
    const asignados = await prisma.empleadoPeriodo.findMany({
      where: { periodoId, estadoAsignacion: "ACTIVO" },
      include: { empleado: true },
    })
    const empleados = asignados.map(a => a.empleado)

    if (empleados.length === 0) throw new Error("No hay empleados asignados al período")

    // Obtener todas las asignaciones del período
    const asignaciones = await prisma.asignacionTurno.findMany({
      where: {
        empresaId: periodo.empresaId,
        fechaTurno: { gte: periodo.fechaInicio, lte: periodo.fechaFin },
      },
      include: { concepto: true, empleado: true },
    })

    // Calcular por empleado
    for (const empleado of empleados) {
      await this.calcularEmpleadoPeriodo(
        empleado,
        periodo,
        asignaciones.filter(a => a.empleadoId === empleado.id),
        festivosColombia
      )
    }

    // Marcar período como calculado
    await prisma.periodoNomina.update({
      where: { id: periodoId },
      data: { estadoPeriodo: "CALCULADO", calculadoEn: new Date(), calculadoPor: "sistema" },
    })
  }
}
