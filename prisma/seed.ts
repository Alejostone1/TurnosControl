/**
 * SEED — Sistema de Nómina y Control de Turnos
 * Cubre todos los modelos del schema: Empresa, Usuario, Auxiliar,
 * ConfiguracionLegal, ConceptoNomina, Empleado, ConfiguracionEmpleado,
 * RegistroAuditoria.
 *
 * Datos generados:
 *  - 4 usuarios (2 ADMINISTRADOR + 1 LIQUIDADOR + 1 VISUALIZADOR)
 *  - 4 auxiliares (2 por cada administrador)
 *  - 12 empleados (3 por cada auxiliar)
 *  - Configuraciones personalizadas para 3 empleados
 *  - Sin períodos de nómina ni programaciones de turnos
 *  - 3 registros de auditoría representativos
 */

import {
  PrismaClient,
  EstadoEmpresa,
  RolUsuario,
  TipoAlmuerzo,
  TipoCalculoHorasExtras,
  CategoriaConcepto,
  TipoCalculo,
  TipoImpacto,
  TipoDocumento,
  TipoVinculacion,
  TipoContrato,
  TipoPeriodo,
  EstadoPeriodo,
  EstadoAsignacion,
  EstadoTurno,
  AccionAuditoria,
  SeveridadAuditoria,
} from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

const SMMLV         = 1_750_905
const AUX_TRANSPORTE = 249_000
const TOPE_SEMANAL  = 44

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE FECHA
// ─────────────────────────────────────────────────────────────────────────────

/** Crea una Date al mediodía UTC para evitar desfases de zona horaria */
function dt(yyyy: number, mm: number, dd: number): Date {
  return new Date(
    `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}T12:00:00Z`
  )
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Número de semana ISO (para agrupar por tope semanal) */
function isoWeek(date: Date): number {
  const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  return Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7)
}

// ─────────────────────────────────────────────────────────────────────────────
// FESTIVOS COLOMBIA 2026
// ─────────────────────────────────────────────────────────────────────────────

const FESTIVOS_2026 = new Set([
  '2026-01-01', // Año Nuevo
  '2026-01-12', // Reyes Magos (trasladado)
  '2026-03-23', // San José (trasladado)
  '2026-04-02', // Jueves Santo
  '2026-04-03', // Viernes Santo
  '2026-05-01', // Día del Trabajo
  '2026-05-25', // Ascensión del Señor (trasladado)
  '2026-06-15', // Corpus Christi (trasladado)
  '2026-06-22', // Sagrado Corazón (trasladado)
  '2026-06-29', // San Pedro y San Pablo (trasladado)
  '2026-07-13', // día virge chinquinquirá
  '2026-07-20', // Independencia de Colombia
  '2026-08-07', // Batalla de Boyacá
  '2026-08-17', // Asunción de la Virgen (trasladado)
  '2026-10-12', // Día de la Raza (trasladado)
  '2026-11-02', // Todos los Santos (trasladado)
  '2026-11-16', // Independencia de Cartagena (trasladado)
  '2026-12-08', // Inmaculada Concepción
  '2026-12-25', // Navidad
])

function esFestivo(date: Date): boolean {
  return date.getUTCDay() === 0 || FESTIVOS_2026.has(dateKey(date))
}
function esDomingo(date: Date): boolean {
  return date.getUTCDay() === 0
}
function dowUTC(date: Date): number {
  return date.getUTCDay() // 0=Dom, 1=Lun, ..., 6=Sáb
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILDER: RegistroDiaTrabajado
// ─────────────────────────────────────────────────────────────────────────────

interface DayParams {
  empresaId:   string
  empleadoId:  string
  periodoId:   string
  asignacionId: string
  fecha:        Date
  codigo:       string   // 'D' | 'N' | '24T'
  salarioBase:  number
  acumSemana:   number   // horas ya acumuladas esta semana ISO
}

function buildDayRecord(p: DayParams): { record: any; horasGeneradas: number } {
  const vh      = p.salarioBase / 220
  const festivo = esFestivo(p.fecha)
  const domingo = esDomingo(p.fecha)
  const horas   = p.codigo === 'D' ? 11.5 : p.codigo === 'N' ? 12 : p.codigo === '24T' ? 24 : 7.33
  const disp    = Math.max(0, TOPE_SEMANAL - p.acumSemana)
  const enTope  = Math.min(horas, disp)
  const extra   = Math.max(0, horas - disp)
  const cruza   = p.codigo === 'N' || p.codigo === '24T'

  let hO=0, hN=0, hF=0, hNF=0, heD=0, heN=0, heDf=0, heNf=0
  let requiereComp = false

  if (festivo) {
    switch (p.codigo) {
      case 'D':
        hF   = enTope; heDf = extra
        break
      case 'N':
        hNF  = enTope; heNf = extra
        break
      case '24T': {
        const dn = Math.min(12, enTope)
        const nn = enTope - dn
        hF = dn; hNF = nn
        const xd = Math.min(extra, 12 - dn)
        heDf = xd; heNf = extra - xd
        break
      }
      default:
        hF = enTope
    }
    if (domingo) requiereComp = true
  } else {
    switch (p.codigo) {
      case 'D':
        hO  = enTope; heD = extra
        break
      case 'N':
        hN  = enTope; heN = extra
        break
      case '24T': {
        const dn = Math.min(12, enTope)
        const nn = enTope - dn
        hO = dn; hN = nn
        const xd = Math.min(extra, 12 - dn)
        heD = xd; heN = extra - xd
        break
      }
      default:
        hO = enTope
    }
  }

  const totalExtras = heD + heN + heDf + heNf
  const valorDia = Math.round(
    hO   * vh        +
    hN   * vh * 1.35 +
    hF   * vh * 1.75 +
    hNF  * vh * 2.10 +
    heD  * vh * 1.25 +
    heN  * vh * 1.75 +
    heDf * vh * 2.00 +
    heNf * vh * 2.50
  )

  return {
    record: {
      empresaId:    p.empresaId,
      empleadoId:   p.empleadoId,
      periodoId:    p.periodoId,
      asignacionId: p.asignacionId,
      fechaDia:     p.fecha,
      numeroSemana: isoWeek(p.fecha),
      esFestivo:    festivo,
      esDomingo:    domingo,
      cruzaMedianoche: cruza,
      horasOrdinarias:    hO,
      horasNocturnas:     hN,
      horasFestivas:      hF,
      horasNoctFestivas:  hNF,
      horasExtraDiurna:      heD,
      horasExtraNocturna:    heN,
      horasExtraDiurnaFest:  heDf,
      horasExtraNoctFest:    heNf,
      totalHorasTrabajadas: horas,
      horasExtrasGeneradas: totalExtras,
      horasDeuda:           0,
      horasSemanaAcumuladas: p.acumSemana + horas,
      requiereCompensatorio: requiereComp,
      compensatorioAsignado: false,
      valorHoraUsado: vh,
      valorTotalDia:  valorDia,
      calculadoPor:   'sistema',
      version:        1,
    },
    horasGeneradas: horas,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACUMULADOR PARA ResultadoNomina
// ─────────────────────────────────────────────────────────────────────────────

interface RAccum {
  tO:0|number; tN:0|number; tF:0|number; tNF:0|number
  teD:0|number; teN:0|number; teDf:0|number; teNf:0|number
  totalHoras:0|number; totalExtras:0|number
}
function newAccum(): RAccum {
  return { tO:0, tN:0, tF:0, tNF:0, teD:0, teN:0, teDf:0, teNf:0, totalHoras:0, totalExtras:0 }
}
function addToAccum(a: RAccum, r: any) {
  a.tO  += r.horasOrdinarias;   a.tN   += r.horasNocturnas
  a.tF  += r.horasFestivas;     a.tNF  += r.horasNoctFestivas
  a.teD += r.horasExtraDiurna;  a.teN  += r.horasExtraNocturna
  a.teDf += r.horasExtraDiurnaFest; a.teNf += r.horasExtraNoctFest
  a.totalHoras  += r.totalHorasTrabajadas
  a.totalExtras += r.horasExtrasGeneradas
}

function buildResultado(
  empresaId:    string,
  empleadoId:   string,
  periodoId:    string,
  salarioBase:  number,
  tieneAuxilio: boolean,
  calculadoPorId: string,
  acum:         RAccum
) {
  const vh      = salarioBase / 220
  const auxilio = tieneAuxilio && salarioBase <= 2 * SMMLV ? AUX_TRANSPORTE : 0

  // Solo el recargo adicional (no la hora base, que ya está en salarioBase)
  const vN   = Math.round(acum.tN   * vh * 0.35)
  const vF   = Math.round(acum.tF   * vh * 0.75)
  const vNF  = Math.round(acum.tNF  * vh * 1.10)
  const veD  = Math.round(acum.teD  * vh * 0.25)
  const veN  = Math.round(acum.teN  * vh * 0.75)
  const veDf = Math.round(acum.teDf * vh * 1.00)
  const veNf = Math.round(acum.teNf * vh * 1.50)
  const vO   = Math.round(acum.tO   * vh)

  const totalDev   = Math.round(salarioBase + auxilio + vN + vF + vNF + veD + veN + veDf + veNf)
  const deducciones = Math.round(salarioBase * 0.08) // salud 4% + pensión 4%

  const r2 = (n: number) => Math.round(n * 100) / 100

  return {
    empresaId, empleadoId, periodoId,
    totalHorasOrdinarias:   r2(acum.tO),
    totalHorasNocturnas:    r2(acum.tN),
    totalHorasFestivas:     r2(acum.tF),
    totalHorasNoctFestivas: r2(acum.tNF),
    totalExtraDiurna:       r2(acum.teD),
    totalExtraNocturna:     r2(acum.teN),
    totalExtraDiurnaFest:   r2(acum.teDf),
    totalExtraNoctFest:     r2(acum.teNf),
    totalHorasTrabajadas:   r2(acum.totalHoras),
    totalHorasExtras:       r2(acum.totalExtras),
    totalHorasDeuda: 0,
    salarioBase,
    auxilioTransporte:       auxilio,
    valorHorasOrdinarias:    vO,
    valorRecargoNocturno:    vN,
    valorRecargoFestivo:     vF,
    valorRecargoNoctFestivo: vNF,
    valorExtraDiurna:        veD,
    valorExtraNocturna:      veN,
    valorExtraDiurnaFest:    veDf,
    valorExtraNoctFest:      veNf,
    totalDevengado:   totalDev,
    totalDeducciones: deducciones,
    netoAPagar:       totalDev - deducciones,
    calculadoPor:     calculadoPorId,
    metadatosCalculo: {
      smmlv: SMMLV,
      auxilioTransporte: AUX_TRANSPORTE,
      topeSemanalhoras: TOPE_SEMANAL,
      formulaValorHora: 'SALARIO_MENSUAL / 220',
      tipoCalculo: 'SEMANAL',
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Iniciando seed completo...\n')

  // ══════════════════════════════════════════════════════════════════════════
  // 1. EMPRESA
  // ══════════════════════════════════════════════════════════════════════════

  const empresa = await prisma.empresa.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      slug:    'demo',
      nombre:  'Empresa Demo S.A.S.',
      nit:     '900123456-7',
      correo:  'contacto@demo.com',
      telefono: '+57 606 3456789',
      direccion: {
        ciudad:       'Pereira',
        departamento: 'Risaralda',
        direccion:    'Calle 100 # 50-90',
        pais:         'Colombia',
      },
      estado: EstadoEmpresa.ACTIVA,
      configuracionPredeterminada: {
        moneda:      'COP',
        idioma:      'es',
        zonaHoraria: 'America/Bogota',
      },
    },
  })
  console.log(`✅ Empresa: ${empresa.nombre}`)

  // ══════════════════════════════════════════════════════════════════════════
  // 2. USUARIOS
  // ══════════════════════════════════════════════════════════════════════════

  const [passAdmin1, passAdmin2, passLiq, passVis] = await Promise.all([
    bcrypt.hash('admin123',      10),
    bcrypt.hash('admin456',      10),
    bcrypt.hash('liquidador123', 10),
    bcrypt.hash('visor123',      10),
  ])

  const admin1 = await prisma.usuario.upsert({
    where: { correo: 'admin1@demo.com' },
    update: {},
    create: {
      correo:    'admin1@demo.com',
      contrasena: passAdmin1,
      nombres:   'Carlos',
      apellidos: 'Mendoza López',
      documento: '1000000001',
      telefono:  '+57 300 1234567',
      empresaId: empresa.id,
      rol:       RolUsuario.ADMINISTRADOR,
      estaActivo: true,
    },
  })

  const admin2 = await prisma.usuario.upsert({
    where: { correo: 'admin2@demo.com' },
    update: {},
    create: {
      correo:    'admin2@demo.com',
      contrasena: passAdmin2,
      nombres:   'María',
      apellidos: 'Fernández García',
      documento: '1000000002',
      telefono:  '+57 300 7654321',
      empresaId: empresa.id,
      rol:       RolUsuario.ADMINISTRADOR,
      estaActivo: true,
      creadoPor: admin1.id,
    },
  })

  const liquidador = await prisma.usuario.upsert({
    where: { correo: 'liquidador@demo.com' },
    update: {},
    create: {
      correo:    'liquidador@demo.com',
      contrasena: passLiq,
      nombres:   'Patricia',
      apellidos: 'Londoño Ruiz',
      documento: '1000000003',
      telefono:  '+57 300 1111222',
      empresaId: empresa.id,
      rol:       RolUsuario.LIQUIDADOR,
      estaActivo: true,
      creadoPor: admin1.id,
    },
  })

  await prisma.usuario.upsert({
    where: { correo: 'visor@demo.com' },
    update: {},
    create: {
      correo:    'visor@demo.com',
      contrasena: passVis,
      nombres:   'Andrés',
      apellidos: 'Ramírez Castro',
      documento: '1000000004',
      telefono:  '+57 300 3334444',
      empresaId: empresa.id,
      rol:       RolUsuario.VISUALIZADOR,
      estaActivo: true,
      creadoPor: admin1.id,
    },
  })
  console.log('✅ Usuarios: admin1@demo.com, admin2@demo.com, liquidador@demo.com, visor@demo.com')

  // ══════════════════════════════════════════════════════════════════════════
  // 3. AUXILIARES
  // ══════════════════════════════════════════════════════════════════════════

  const [passAux1, passAux2, passAux3, passAux4] = await Promise.all([
    bcrypt.hash('auxiliar123', 10),
    bcrypt.hash('auxiliar456', 10),
    bcrypt.hash('auxiliar789', 10),
    bcrypt.hash('auxiliar000', 10),
  ])

  const aux1 = await prisma.auxiliar.upsert({
    where: { correo: 'auxiliar1@demo.com' },
    update: {},
    create: {
      correo:    'auxiliar1@demo.com',
      contrasena: passAux1,
      nombres:   'Pedro',
      apellidos: 'Gómez Reyes',
      documento: '2000000001',
      telefono:  '+57 300 1111111',
      empresaId: empresa.id,
      estaActivo: true,
      creadoPor: admin1.id,
    },
  })

  const aux2 = await prisma.auxiliar.upsert({
    where: { correo: 'auxiliar2@demo.com' },
    update: {},
    create: {
      correo:    'auxiliar2@demo.com',
      contrasena: passAux2,
      nombres:   'Laura',
      apellidos: 'Martínez Silva',
      documento: '2000000002',
      telefono:  '+57 300 2222222',
      empresaId: empresa.id,
      estaActivo: true,
      creadoPor: admin1.id,
    },
  })

  const aux3 = await prisma.auxiliar.upsert({
    where: { correo: 'auxiliar3@demo.com' },
    update: {},
    create: {
      correo:    'auxiliar3@demo.com',
      contrasena: passAux3,
      nombres:   'Diego',
      apellidos: 'Sánchez Torres',
      documento: '2000000003',
      telefono:  '+57 300 3333333',
      empresaId: empresa.id,
      estaActivo: true,
      creadoPor: admin2.id,
    },
  })

  const aux4 = await prisma.auxiliar.upsert({
    where: { correo: 'auxiliar4@demo.com' },
    update: {},
    create: {
      correo:    'auxiliar4@demo.com',
      contrasena: passAux4,
      nombres:   'Valentina',
      apellidos: 'Morales Ríos',
      documento: '2000000004',
      telefono:  '+57 300 4444444',
      empresaId: empresa.id,
      estaActivo: true,
      creadoPor: admin2.id,
    },
  })
  console.log('✅ Auxiliares: auxiliar1@demo.com, auxiliar2@demo.com, auxiliar3@demo.com, auxiliar4@demo.com')

  // ══════════════════════════════════════════════════════════════════════════
  // 4. CONFIGURACIÓN LEGAL (CST Colombia 2026)
  // ══════════════════════════════════════════════════════════════════════════

  const configLegal = await prisma.configuracionLegal.upsert({
    where: { empresaId_estaActiva: { empresaId: empresa.id, estaActiva: true } },
    update: {},
    create: {
      empresaId:   empresa.id,
      nombre:      'Configuración Legal Colombia 2026',
      estaActiva:  true,
      // Jornada base (Art. 161 CST)
      horasSemanalesMaximas: 44,
      horasDiariasEstandar:  7.33,
      // Recargos (Art. 168 CST)
      porcentajeRecargoNocturno:        35,
      porcentajeRecargoDomFestivo:      75,
      porcentajeRecargoNocturnoFestivo: 110,
      // Extras (Art. 159 y 168 CST)
      porcentajeExtraDiurna:         25,
      porcentajeExtraNocturna:       75,
      porcentajeExtraDiurnaFestiva:  100,
      porcentajeExtraNocturnaFestiva: 150,
      // Nocturno (Ley 2466/2025: desde las 7 PM)
      horaInicioNocturno: '19:00',
      horaFinNocturno:    '06:00',
      // Almuerzo
      tipoAlmuerzo:            TipoAlmuerzo.PREDEFINIDO,
      duracionAlmuerzaMinutos: 30,
      horaInicioAlmuerzo:      '12:00',
      horaFinAlmuerzo:         '12:30',
      // Fórmula valor hora
      formulaValorHora:       'SALARIO_MENSUAL / 220',
      tipoCalculoHorasExtras: TipoCalculoHorasExtras.SEMANAL,
      vigenciaDesde: new Date('2026-01-01T00:00:00Z'),
      creadoPor:     admin1.id,
    },
  })
  console.log(`✅ Config legal: ${configLegal.nombre}`)

  // ══════════════════════════════════════════════════════════════════════════
  // 5. CONCEPTOS DE NÓMINA
  // ══════════════════════════════════════════════════════════════════════════

  const conceptosDef = [
    // ── Turnos laborales ──────────────────────────────────────────────────
    {
      codigo: 'D', nombre: 'Turno Día',
      descripcion: 'Turno diurno estándar (07:00–19:00)',
      categoria: CategoriaConcepto.TURNO_LABORAL,
      tipoCalculo: TipoCalculo.HORAS_TURNO,
      tipoImpacto: TipoImpacto.SUMA_HORAS,
      afectaLiquidacion: true, cuentaParaTope: true, afectaVacaciones: true,
      horaInicioDefecto: '07:00', horaFinDefecto: '19:00', cruzaMedianoche: false,
      color: '#3b82f6', icono: '☀️', orden: 1, esDelSistema: true,
    },
    {
      codigo: 'N', nombre: 'Turno Noche',
      descripcion: 'Turno nocturno estándar (19:00–07:00)',
      categoria: CategoriaConcepto.TURNO_LABORAL,
      tipoCalculo: TipoCalculo.HORAS_TURNO,
      tipoImpacto: TipoImpacto.SUMA_HORAS,
      afectaLiquidacion: true, cuentaParaTope: true, afectaVacaciones: true,
      horaInicioDefecto: '19:00', horaFinDefecto: '07:00', cruzaMedianoche: true,
      color: '#6366f1', icono: '🌙', orden: 2, esDelSistema: true,
    },
    {
      codigo: '24T', nombre: 'Turno 24 Horas',
      descripcion: 'Turno completo de 24 horas (07:00–07:00)',
      categoria: CategoriaConcepto.TURNO_LABORAL,
      tipoCalculo: TipoCalculo.HORAS_TURNO,
      tipoImpacto: TipoImpacto.SUMA_HORAS,
      afectaLiquidacion: true, cuentaParaTope: true, afectaVacaciones: true,
      horaInicioDefecto: '07:00', horaFinDefecto: '07:00', cruzaMedianoche: true,
      color: '#8b5cf6', icono: '🔄', orden: 3, esDelSistema: true,
    },
    {
      codigo: 'M', nombre: 'Turno Manual',
      descripcion: 'Turno con horario personalizado',
      categoria: CategoriaConcepto.TURNO_LABORAL,
      tipoCalculo: TipoCalculo.HORAS_TURNO,
      tipoImpacto: TipoImpacto.SUMA_HORAS,
      afectaLiquidacion: true, cuentaParaTope: true, afectaVacaciones: true,
      cruzaMedianoche: false,
      color: '#0ea5e9', icono: '✏️', orden: 4, esDelSistema: true,
    },
    // ── Ausencias pagas ───────────────────────────────────────────────────
    {
      codigo: 'I', nombre: 'Incapacidad',
      descripcion: 'Incapacidad médica (EPS o ARL)',
      categoria: CategoriaConcepto.AUSENCIA_PAGA,
      tipoCalculo: TipoCalculo.HORAS_FIJAS,
      tipoImpacto: TipoImpacto.SUMA_HORAS,
      horasFijas: 7.33,
      afectaLiquidacion: true, requiereJustificacion: true,
      color: '#f43f5e', icono: '🏥', orden: 10, esDelSistema: true,
    },
    {
      codigo: 'DF', nombre: 'Día de la Familia',
      descripcion: 'Día de la familia — beneficio empresarial remunerado',
      categoria: CategoriaConcepto.AUSENCIA_PAGA,
      tipoCalculo: TipoCalculo.HORAS_FIJAS,
      tipoImpacto: TipoImpacto.SUMA_HORAS,
      horasFijas: 7.33,
      afectaLiquidacion: true,
      color: '#f97316', icono: '👨‍👩‍👧', orden: 11, esDelSistema: true,
    },
    {
      codigo: 'PR', nombre: 'Permiso Remunerado',
      descripcion: 'Permiso remunerado autorizado',
      categoria: CategoriaConcepto.AUSENCIA_PAGA,
      tipoCalculo: TipoCalculo.HORAS_FIJAS,
      tipoImpacto: TipoImpacto.SUMA_HORAS,
      horasFijas: 7.33,
      afectaLiquidacion: true, requiereJustificacion: true,
      color: '#06b6d4', icono: '📋', orden: 12, esDelSistema: true,
    },
    {
      codigo: 'V', nombre: 'Vacaciones',
      descripcion: 'Día de vacaciones disfrutadas',
      categoria: CategoriaConcepto.AUSENCIA_PAGA,
      tipoCalculo: TipoCalculo.HORAS_FIJAS,
      tipoImpacto: TipoImpacto.SUMA_HORAS,
      horasFijas: 7.33,
      afectaLiquidacion: true,
      color: '#f59e0b', icono: '🏖️', orden: 13, esDelSistema: true,
    },
    // ── Ausencias no pagas ────────────────────────────────────────────────
    {
      codigo: 'A', nombre: 'Ausencia',
      descripcion: 'Ausencia injustificada — descuento de salario',
      categoria: CategoriaConcepto.AUSENCIA_NO_PAGA,
      tipoCalculo: TipoCalculo.HORAS_FIJAS,
      tipoImpacto: TipoImpacto.RESTA_HORAS,
      horasFijas: 7.33,
      afectaLiquidacion: false,
      color: '#ef4444', icono: '🚫', orden: 14, esDelSistema: true,
    },
    {
      codigo: 'SC', nombre: 'Sin Contrato',
      descripcion: 'Día fuera del período de contrato',
      categoria: CategoriaConcepto.AUSENCIA_NO_PAGA,
      tipoCalculo: TipoCalculo.SIN_PAGO,
      tipoImpacto: TipoImpacto.NEUTRO,
      afectaLiquidacion: false,
      color: '#6b7280', icono: '📄', orden: 15, esDelSistema: true,
    },
    // ── Descanso ──────────────────────────────────────────────────────────
    {
      codigo: 'C', nombre: 'Compensatorio',
      descripcion: 'Día compensatorio por domingo o festivo trabajado',
      categoria: CategoriaConcepto.DESCANSO,
      tipoCalculo: TipoCalculo.SIN_PAGO,
      tipoImpacto: TipoImpacto.NEUTRO,
      horasFijas: 0,
      afectaLiquidacion: true,
      generaCompenatorio: true,
      color: '#10b981', icono: '😌', orden: 16, esDelSistema: true,
    },
  ] as const

  const conceptoMap: Record<string, string> = {}

  for (const c of conceptosDef) {
    const rec = await prisma.conceptoNomina.upsert({
      where: { empresaId_codigo: { empresaId: empresa.id, codigo: c.codigo } },
      update: { nombre: c.nombre, color: c.color, icono: c.icono, orden: c.orden },
      create: {
        empresaId:  empresa.id,
        creadoPor:  admin1.id,
        estaActivo: true,
        ...(c as any),
      },
    })
    conceptoMap[c.codigo] = rec.id
  }
  console.log(`✅ ${conceptosDef.length} conceptos de nómina`)

  // ══════════════════════════════════════════════════════════════════════════
  // 6. EMPLEADOS
  // ══════════════════════════════════════════════════════════════════════════

  type EmpDef = {
    doc: string; nombres: string; apellidos: string
    cc: string; prog: string; mod: string; cargo: string
    salario: number; auxilio: boolean
    vinc: TipoVinculacion; contrato: TipoContrato; horas: number
    creador: 'aux1' | 'aux2' | 'aux3' | 'aux4'
  }

  const empleadosDef: EmpDef[] = [
    // ── Auxiliar 1 (Pedro Gómez) — 3 empleados ──
    { doc:'10000001', nombres:'Juan',     apellidos:'Pérez González',    cc:'400013', prog:'Creeme',            mod:'Centro Internamiento Preventivo',         cargo:'Educador',           salario:1_750_905, auxilio:true,  vinc:TipoVinculacion.TIEMPO_COMPLETO, contrato:TipoContrato.TERMINO_INDEFINIDO, horas:44, creador:'aux1' },
    { doc:'10000002', nombres:'María',    apellidos:'Rodríguez López',   cc:'400013', prog:'Creeme',            mod:'Centro Atencion Especializada',            cargo:'Psicóloga',          salario:2_500_000, auxilio:false, vinc:TipoVinculacion.TIEMPO_COMPLETO, contrato:TipoContrato.TERMINO_INDEFINIDO, horas:44, creador:'aux1' },
    { doc:'10000003', nombres:'Carlos',   apellidos:'Martínez Sánchez',  cc:'40004',  prog:'Arcoiris',          mod:'Internado',                                cargo:'Trabajador Social',  salario:1_750_905, auxilio:true,  vinc:TipoVinculacion.TIEMPO_COMPLETO, contrato:TipoContrato.TERMINO_FIJO,      horas:44, creador:'aux1' },

    // ── Auxiliar 2 (Laura Martínez) — 3 empleados ──
    { doc:'10000004', nombres:'Ana',      apellidos:'García Torres',     cc:'400012', prog:'Genesis',           mod:'Internacion Medio Semicerrado',            cargo:'Nutricionista',      salario:1_950_000, auxilio:true,  vinc:TipoVinculacion.TIEMPO_COMPLETO, contrato:TipoContrato.TERMINO_INDEFINIDO, horas:44, creador:'aux2' },
    { doc:'10000005', nombres:'Luis',     apellidos:'Hernández Díaz',    cc:'400012', prog:'Vientos de Cambio', mod:'Restablecimiento Administracion Justicia', cargo:'Coordinador',        salario:2_200_000, auxilio:false, vinc:TipoVinculacion.TIEMPO_COMPLETO, contrato:TipoContrato.TERMINO_INDEFINIDO, horas:44, creador:'aux2' },
    { doc:'10000006', nombres:'Sofía',    apellidos:'Vargas Castillo',   cc:'400013', prog:'Creeme',            mod:'Centro Internamiento Preventivo',          cargo:'Enfermera',          salario:1_800_000, auxilio:true,  vinc:TipoVinculacion.TIEMPO_COMPLETO, contrato:TipoContrato.TERMINO_INDEFINIDO, horas:44, creador:'aux2' },

    // ── Auxiliar 3 (Diego Sánchez) — 3 empleados ──
    { doc:'10000007', nombres:'Diego',    apellidos:'Morales Ruiz',      cc:'40004',  prog:'Arcoiris',          mod:'Internado',                                cargo:'Educador',           salario:1_423_500, auxilio:true,  vinc:TipoVinculacion.TIEMPO_COMPLETO, contrato:TipoContrato.TERMINO_FIJO,      horas:44, creador:'aux3' },
    { doc:'10000008', nombres:'Isabella', apellidos:'Reyes Mendoza',     cc:'400012', prog:'Genesis',           mod:'Internacion Medio Semicerrado',            cargo:'Trabajadora Social', salario:1_750_905, auxilio:true,  vinc:TipoVinculacion.TIEMPO_COMPLETO, contrato:TipoContrato.TERMINO_INDEFINIDO, horas:44, creador:'aux3' },
    { doc:'10000009', nombres:'Santiago', apellidos:'Torres Ramírez',    cc:'400013', prog:'Creeme',            mod:'Centro Atencion Especializada',            cargo:'Terapeuta Ocupacional', salario:2_100_000, auxilio:true, vinc:TipoVinculacion.TIEMPO_COMPLETO, contrato:TipoContrato.TERMINO_INDEFINIDO, horas:44, creador:'aux3' },

    // ── Auxiliar 4 (Valentina Morales) — 3 empleados ──
    { doc:'10000010', nombres:'Valentina', apellidos:'Morales Ríos',     cc:'40004',  prog:'Arcoiris',          mod:'Internado',                                cargo:'Psicopedagoga',      salario:1_950_000, auxilio:true,  vinc:TipoVinculacion.TIEMPO_COMPLETO, contrato:TipoContrato.TERMINO_INDEFINIDO, horas:44, creador:'aux4' },
    { doc:'10000011', nombres:'Mateo',    apellidos:'Vargas Castillo',   cc:'400012', prog:'Vientos de Cambio', mod:'Restablecimiento Administracion Justicia', cargo:'Auxiliar Administrativo', salario:1_423_500, auxilio:true, vinc:TipoVinculacion.TIEMPO_COMPLETO, contrato:TipoContrato.TERMINO_INDEFINIDO, horas:44, creador:'aux4' },
    { doc:'10000012', nombres:'Camila',   apellidos:'Ríos Romero',       cc:'400013', prog:'Creeme',            mod:'Centro Internamiento Preventivo',          cargo:'Enfermera Jefe',     salario:2_300_000, auxilio:false, vinc:TipoVinculacion.TIEMPO_COMPLETO, contrato:TipoContrato.TERMINO_INDEFINIDO, horas:44, creador:'aux4' },
  ]

  type EmpRecord = { id: string; salario: number; auxilio: boolean }
  const empMap: Record<string, EmpRecord> = {}

  for (const e of empleadosDef) {
    const data: any = {
      empresaId:       empresa.id,
      tipoDocumento:   TipoDocumento.CEDULA_CIUDADANIA,
      numeroDocumento: e.doc,
      nombres:         e.nombres,
      apellidos:       e.apellidos,
      centroCosto:     e.cc,
      programa:        e.prog,
      modalidad:       e.mod,
      cargo:           e.cargo,
      fechaIngreso:    new Date('2023-01-15T12:00:00Z'),
      tipoVinculacion: e.vinc,
      salarioBase:     e.salario,
      tieneAuxilioTransporte: e.auxilio,
      tipoContrato:    e.contrato,
      horasSemanales:  e.horas,
      estaActivo:      true,
    }
    if (e.creador === 'aux1') data.creadoPorAuxiliarId = aux1.id
    if (e.creador === 'aux2') data.creadoPorAuxiliarId = aux2.id
    if (e.creador === 'aux3') data.creadoPorAuxiliarId = aux3.id
    if (e.creador === 'aux4') data.creadoPorAuxiliarId = aux4.id

    const rec = await prisma.empleado.upsert({
      where: { empresaId_numeroDocumento: { empresaId: empresa.id, numeroDocumento: e.doc } },
      update: {},
      create: data,
    })
    empMap[e.doc] = { id: rec.id, salario: e.salario, auxilio: e.auxilio }
  }
  console.log(`✅ ${empleadosDef.length} empleados`)

  const empIds = Object.values(empMap).map(e => e.id)

  // ══════════════════════════════════════════════════════════════════════════
  // 7. CONFIGURACIÓN POR EMPLEADO
  // ══════════════════════════════════════════════════════════════════════════

  // Luis (10000005): coordinador, autorizado horas extras
  await prisma.configuracionEmpleado.upsert({
    where: { empleadoId: empMap['10000005'].id },
    update: {},
    create: {
      empleadoId:    empMap['10000005'].id,
      empresaId:     empresa.id,
      autorizadoHorasExtras:   true,
      autorizadoTurnoNocturno: false,
      maxHorasExtrasSemana:    20,
      tieneAuxilioTransporte:  false,
      tieneSeguroSalud:        true,
      tieneFondoPension:       true,
    },
  })

  // Sofía (10000006): enfermera nocturna, autorizada turno nocturno y extras
  await prisma.configuracionEmpleado.upsert({
    where: { empleadoId: empMap['10000006'].id },
    update: {},
    create: {
      empleadoId:    empMap['10000006'].id,
      empresaId:     empresa.id,
      autorizadoHorasExtras:   true,
      autorizadoTurnoNocturno: true,
      maxHorasExtrasSemana:    12,
      tieneAuxilioTransporte:  true,
      tieneSeguroSalud:        true,
      tieneFondoPension:       true,
      recargoNocturnoPersonalizado: 35,
    },
  })

  // Santiago (10000009): terapeuta ocupacional, sin autorización de horas extras
  await prisma.configuracionEmpleado.upsert({
    where: { empleadoId: empMap['10000009'].id },
    update: {},
    create: {
      empleadoId:    empMap['10000009'].id,
      empresaId:     empresa.id,
      autorizadoHorasExtras:   false,
      autorizadoTurnoNocturno: true,
      tieneAuxilioTransporte:  true,
      tieneSeguroSalud:        true,
      tieneFondoPension:       true,
    },
  })
  console.log('✅ Configuraciones por empleado (3)')

  // ══════════════════════════════════════════════════════════════════════════
  // 8. REGISTROS DE AUDITORÍA
  // ══════════════════════════════════════════════════════════════════════════

  await prisma.registroAuditoria.createMany({
    data: [
      {
        empresaId:  empresa.id,
        usuarioId:  admin1.id,
        accion:     AccionAuditoria.CONFIGURAR,
        modulo:     'CONFIGURACION',
        entidad:    'ConfiguracionLegal',
        entidadId:  configLegal.id,
        descripcion: 'Configuración legal del sistema inicializada',
        accionDetallada: 'Parámetros CST Colombia 2026: 44h/sem, recargos y extras según Art. 159 y 168',
        severidad:  SeveridadAuditoria.MEDIO,
      },
      {
        empresaId:  empresa.id,
        usuarioId:  admin1.id,
        accion:     AccionAuditoria.CREAR,
        modulo:     'EMPLEADOS',
        entidad:    'Empleado',
        entidadId:  empIds[0],
        descripcion: `Creación inicial de ${empIds.length} empleados (seed)`,
        accionDetallada: `Carga masiva de 12 empleados al inicializar el sistema`,
        severidad:  SeveridadAuditoria.INFO,
        esMasiva:   true,
      },
      {
        empresaId:  empresa.id,
        usuarioId:  admin1.id,
        accion:     AccionAuditoria.CREAR,
        modulo:     'SEGURIDAD',
        entidad:    'Usuario',
        entidadId:  admin2.id,
        descripcion: `Creación de administrador: ${admin2.nombres} ${admin2.apellidos}`,
        accionDetallada: `Segundo administrador creado desde el seed`,
        severidad:  SeveridadAuditoria.INFO,
      },
    ],
    skipDuplicates: false,
  })
  console.log('✅ 3 registros de auditoría')

  // ══════════════════════════════════════════════════════════════════════════
  // RESUMEN FINAL
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n🎉 Seed completado exitosamente!\n')
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║              CREDENCIALES DE ACCESO                     ║')
  console.log('╠══════════════════════════════════════════════════════════╣')
  console.log('║  ADMIN 1      admin1@demo.com         / admin123        ║')
  console.log('║  ADMIN 2      admin2@demo.com         / admin456        ║')
  console.log('║  LIQUIDADOR   liquidador@demo.com     / liquidador123   ║')
  console.log('║  VISUALIZADOR visor@demo.com          / visor123        ║')
  console.log('║  AUXILIAR 1   auxiliar1@demo.com      / auxiliar123     ║')
  console.log('║  AUXILIAR 2   auxiliar2@demo.com      / auxiliar456     ║')
  console.log('║  AUXILIAR 3   auxiliar3@demo.com      / auxiliar789     ║')
  console.log('║  AUXILIAR 4   auxiliar4@demo.com      / auxiliar000     ║')
  console.log('╠══════════════════════════════════════════════════════════╣')
  console.log('║  Empresa: Empresa Demo S.A.S.  /  NIT: 900123456-7     ║')
  console.log('║  12 empleados en 3 centros de costo                    ║')
  console.log('║  Sin períodos de nómina ni programaciones creadas      ║')
  console.log('╚══════════════════════════════════════════════════════════╝')
}

main()
  .catch(e => {
    console.error('\n❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
