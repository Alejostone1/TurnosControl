import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { CategoriaConcepto, TipoCalculo, TipoImpacto } from "@prisma/client"

const registerSchema = z.object({
  nombreEmpresa: z.string().min(2, "El nombre de la empresa es requerido"),
  nit: z.string().min(5, "El NIT es requerido"),
  correo: z.string().email("Correo inválido"),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
  pais: z.string().default("Colombia"),
  adminNombre: z.string().min(2, "El nombre del administrador es requerido"),
  adminApellidos: z.string().min(2, "Los apellidos del administrador son requeridos"),
  adminEmail: z.string().email("Correo del administrador inválido"),
  adminPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  adminDocumento: z.string().min(5, "El documento es requerido")
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar datos de entrada
    const validatedData = registerSchema.parse(body)

    // Verificar si la empresa ya existe
    const existingEmpresa = await prisma.empresa.findFirst({
      where: {
        OR: [
          { nombre: validatedData.nombreEmpresa },
          { nit: validatedData.nit },
          { correo: validatedData.correo }
        ]
      }
    })

    if (existingEmpresa) {
      return NextResponse.json(
        { error: "La empresa ya existe o el correo/NIT está en uso" },
        { status: 400 }
      )
    }

    // Verificar si el usuario administrador ya existe
    const existingUser = await prisma.usuario.findUnique({
      where: { correo: validatedData.adminEmail }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "El correo del administrador ya está en uso" },
        { status: 400 }
      )
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(validatedData.adminPassword, 10)

// Crear slug único para la empresa
    const baseSlug = validatedData.nombreEmpresa
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    
    const randomSuffix = Math.random().toString(36).substring(2, 6)
    const slug = `${baseSlug}-${randomSuffix}`

    // Crear empresa
    const empresa = await prisma.empresa.create({
      data: {
        slug,
        nombre: validatedData.nombreEmpresa,
        nit: validatedData.nit,
        correo: validatedData.correo,
        telefono: validatedData.telefono,
        direccion: {
          ciudad: validatedData.ciudad,
          direccion: validatedData.direccion,
          pais: validatedData.pais
        },
        estado: "ACTIVA",
        configuracionPredeterminada: {
          moneda: "COP",
          idioma: "es",
          zonaHoraria: "America/Bogota"
        }
      }
    })

    // Crear usuario administrador
    const usuario = await prisma.usuario.create({
      data: {
        correo: validatedData.adminEmail,
        contrasena: hashedPassword,
        nombres: validatedData.adminNombre,
        apellidos: validatedData.adminApellidos,
        documento: validatedData.adminDocumento,
        empresaId: empresa.id,
        rol: "SUPER_ADMIN",
        estaActivo: true
      }
    })

    // Crear configuración legal por defecto
    await prisma.configuracionLegal.create({
      data: {
        empresaId: empresa.id,
        nombre: "Configuración Legal Colombia",
        estaActiva: true,
        horasSemanalesMaximas: 44,
        horasDiariasEstandar: 7.33,
        porcentajeRecargoNocturno: 35,
        porcentajeRecargoDomFestivo: 75,
        porcentajeRecargoNocturnoFestivo: 110,
        porcentajeExtraDiurna: 25,
        porcentajeExtraNocturna: 75,
        porcentajeExtraDiurnaFestiva: 100,
        porcentajeExtraNocturnaFestiva: 150,
        horaInicioNocturno: "19:00",
        horaFinNocturno: "06:00",
        tipoAlmuerzo: "PREDEFINIDO",
        duracionAlmuerzaMinutos: 30,
        horaInicioAlmuerzo: "12:00",
        horaFinAlmuerzo: "12:30",
        formulaValorHora: "SALARIO_MENSUAL / 220",
        vigenciaDesde: new Date(),
        creadoPor: usuario.id
      }
    })

// Crear conceptos base para la empresa
    const conceptosBase = [
      {
        codigo: 'D',
        nombre: 'Turno Día',
        descripcion: 'Turno diurno estándar (07:00 - 19:00)',
        categoria: CategoriaConcepto.TURNO_LABORAL,
        tipoCalculo: TipoCalculo.HORAS_TURNO,
        tipoImpacto: TipoImpacto.SUMA_HORAS,
        afectaLiquidacion: true,
        cuentaParaTope: true,
        afectaVacaciones: true,
        requiereJustificacion: false,
        generaCompenatorio: false,
        horaInicioDefecto: '07:00',
        horaFinDefecto: '19:00',
        cruzaMedianoche: false,
        color: '#3b82f6',
        icono: '☀️',
        orden: 1,
        estaActivo: true,
        esDelSistema: true,
        creadoPor: usuario.id
      },
      {
        codigo: 'N',
        nombre: 'Turno Noche',
        descripcion: 'Turno nocturno estándar (19:00 - 07:00)',
        categoria: CategoriaConcepto.TURNO_LABORAL,
        tipoCalculo: TipoCalculo.HORAS_TURNO,
        tipoImpacto: TipoImpacto.SUMA_HORAS,
        afectaLiquidacion: true,
        cuentaParaTope: true,
        afectaVacaciones: true,
        requiereJustificacion: false,
        generaCompenatorio: false,
        horaInicioDefecto: '19:00',
        horaFinDefecto: '07:00',
        cruzaMedianoche: true,
        color: '#6366f1',
        icono: '🌙',
        orden: 2,
        estaActivo: true,
        esDelSistema: true,
        creadoPor: usuario.id
      },
      {
        codigo: 'C',
        nombre: 'Libre/Compensatorio',
        descripcion: 'Día libre o compensatorio',
        categoria: CategoriaConcepto.DESCANSO,
        tipoCalculo: TipoCalculo.SIN_PAGO,
        tipoImpacto: TipoImpacto.NEUTRO,
        afectaLiquidacion: false,
        cuentaParaTope: false,
        afectaVacaciones: false,
        requiereJustificacion: false,
        generaCompenatorio: false,
        color: '#10b981',
        icono: '😌',
        orden: 3,
        estaActivo: true,
        esDelSistema: true,
        creadoPor: usuario.id
      },
      {
        codigo: 'I',
        nombre: 'Incapacidad',
        descripcion: 'Incapacidad médica',
        categoria: CategoriaConcepto.AUSENCIA_PAGA,
        tipoCalculo: TipoCalculo.HORAS_FIJAS,
        tipoImpacto: TipoImpacto.SUMA_HORAS,
        horasFijas: 7.33,
        afectaLiquidacion: true,
        cuentaParaTope: false,
        afectaVacaciones: false,
        requiereJustificacion: true,
        generaCompenatorio: false,
        color: '#f43f5e',
        icono: '🏥',
        orden: 4,
        estaActivo: true,
        esDelSistema: true,
        creadoPor: usuario.id
      }
    ]

    await prisma.conceptoNomina.createMany({
      data: conceptosBase.map(concepto => ({
        ...concepto,
        empresaId: empresa.id
      }))
    })

    return NextResponse.json({
      success: true,
      message: "Empresa registrada exitosamente",
      empresaId: empresa.id,
      usuarioId: usuario.id
    })

  } catch (error) {
    console.error("Error en registro:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
