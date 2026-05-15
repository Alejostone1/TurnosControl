import { z } from "zod"

export const TIPO_DOCUMENTO = [
  "CEDULA_CIUDADANIA",
  "TARJETA_IDENTIDAD",
  "CEDULA_EXTRANJERIA",
  "PASAPORTE",
  "NIT",
] as const

export const TIPO_VINCULACION = [
  "TIEMPO_COMPLETO",
  "MEDIO_TIEMPO",
  "TEMPORAL",
  "APRENDIZ_SENA",
  "PRACTICANTE",
] as const

export const TIPO_CONTRATO = [
  "TERMINO_INDEFINIDO",
  "TERMINO_FIJO",
  "OBRA_LABOR",
  "PRESTACION_SERVICIOS",
  "APRENDIZAJE",
] as const

export const TIPO_DOCUMENTO_LABELS: Record<string, string> = {
  CEDULA_CIUDADANIA: "Cédula de Ciudadanía",
  TARJETA_IDENTIDAD: "Tarjeta de Identidad",
  CEDULA_EXTRANJERIA: "Cédula de Extranjería",
  PASAPORTE: "Pasaporte",
  NIT: "NIT",
}

export const TIPO_VINCULACION_LABELS: Record<string, string> = {
  TIEMPO_COMPLETO: "Tiempo Completo",
  MEDIO_TIEMPO: "Medio Tiempo",
  TEMPORAL: "Temporal",
  APRENDIZ_SENA: "Aprendiz SENA",
  PRACTICANTE: "Practicante",
}

export const TIPO_CONTRATO_LABELS: Record<string, string> = {
  TERMINO_INDEFINIDO: "Término Indefinido",
  TERMINO_FIJO: "Término Fijo",
  OBRA_LABOR: "Obra o Labor",
  PRESTACION_SERVICIOS: "Prestación de Servicios",
  APRENDIZAJE: "Aprendizaje",
}

export const empleadoSchema = z.object({
  nombres: z
    .string({ required_error: "Nombres requeridos" })
    .min(2, "Mínimo 2 caracteres")
    .max(100, "Máximo 100 caracteres")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/, "Solo letras y espacios"),
  apellidos: z
    .string({ required_error: "Apellidos requeridos" })
    .min(2, "Mínimo 2 caracteres")
    .max(100, "Máximo 100 caracteres")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/, "Solo letras y espacios"),
  tipoDocumento: z.enum(TIPO_DOCUMENTO, {
    errorMap: () => ({ message: "Tipo de documento inválido" }),
  }),
  numeroDocumento: z
    .string({ required_error: "Número de documento requerido" })
    .min(4, "Mínimo 4 caracteres")
    .max(20, "Máximo 20 caracteres")
    .regex(/^[0-9A-Za-z\-]+$/, "Solo alfanumérico y guiones"),
  centroCosto: z.string().max(50, "Máximo 50 caracteres").optional().nullable(),
  programa: z.string().max(100, "Máximo 100 caracteres").optional().nullable(),
  modalidad: z.string().max(100, "Máximo 100 caracteres").optional().nullable(),
  cargo: z.string().max(100, "Máximo 100 caracteres").optional().nullable(),
  fechaIngreso: z
    .string({ required_error: "Fecha de ingreso requerida" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD requerido"),
  tipoVinculacion: z.enum(TIPO_VINCULACION, {
    errorMap: () => ({ message: "Tipo de vinculación inválido" }),
  }),
  tipoContrato: z.enum(TIPO_CONTRATO, {
    errorMap: () => ({ message: "Tipo de contrato inválido" }),
  }),
  salarioBase: z
    .number({ required_error: "Salario requerido", invalid_type_error: "Debe ser un número" })
    .min(100_000, "Salario mínimo: $100.000")
    .max(100_000_000, "Salario máximo: $100.000.000"),
  horasSemanales: z
    .number({ required_error: "Horas requeridas", invalid_type_error: "Debe ser un número" })
    .min(1, "Mínimo 1 hora")
    .max(48, "Máximo 48 horas semanales"),
  tieneAuxilioTransporte: z.boolean({
    required_error: "Indique si tiene auxilio de transporte",
  }),
})

export type EmpleadoSchemaType = z.infer<typeof empleadoSchema>
