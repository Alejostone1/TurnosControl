export type TipoDocumento =
  | "CEDULA_CIUDADANIA"
  | "TARJETA_IDENTIDAD"
  | "CEDULA_EXTRANJERIA"
  | "PASAPORTE"
  | "NIT"

export type TipoVinculacion =
  | "TIEMPO_COMPLETO"
  | "MEDIO_TIEMPO"
  | "TEMPORAL"
  | "APRENDIZ_SENA"
  | "PRACTICANTE"

export type TipoContrato =
  | "TERMINO_INDEFINIDO"
  | "TERMINO_FIJO"
  | "OBRA_LABOR"
  | "PRESTACION_SERVICIOS"
  | "APRENDIZAJE"

export interface EmpleadoInput {
  nombres: string
  apellidos: string
  tipoDocumento: TipoDocumento
  numeroDocumento: string
  centroCosto?: string | null
  programa?: string | null
  modalidad?: string | null
  cargo?: string | null
  fechaIngreso: string
  tipoVinculacion: TipoVinculacion
  tipoContrato: TipoContrato
  salarioBase: number
  horasSemanales: number
  tieneAuxilioTransporte: boolean
}

export interface ParsedExcelRow extends EmpleadoInput {
  _rowIndex: number
  errors: string[]
  isValid: boolean
}

export interface BulkImportResult {
  created: number
  failed: number
  total: number
  errors: Array<{
    index: number
    numeroDocumento: string
    error: string
  }>
}
