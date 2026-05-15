import { prisma } from "@/lib/prisma"
import { AccionAuditoria, SeveridadAuditoria } from "@prisma/client"

export type { AccionAuditoria, SeveridadAuditoria }

export interface RegistrarAuditoriaParams {
  empresaId: string
  usuarioId?: string | null
  auxiliarId?: string | null
  accion: AccionAuditoria
  modulo?: string
  entidad: string
  entidadId: string
  valorAntes?: object | null
  valorDespues?: object | null
  descripcion?: string
  accionDetallada?: string
  severidad?: SeveridadAuditoria
  esMasiva?: boolean
  esAutomatico?: boolean
  requiereRevision?: boolean
  ipAddress?: string | null
  userAgent?: string | null
}

export async function registrarAuditoria(params: RegistrarAuditoriaParams): Promise<void> {
  try {
    await prisma.registroAuditoria.create({
      data: {
        empresaId:       params.empresaId,
        usuarioId:       params.usuarioId       ?? null,
        auxiliarId:      params.auxiliarId      ?? null,
        accion:          params.accion,
        modulo:          params.modulo          ?? null,
        entidad:         params.entidad,
        entidadId:       params.entidadId,
        valorAntes:      params.valorAntes      ?? undefined,
        valorDespues:    params.valorDespues    ?? undefined,
        descripcion:     params.descripcion     ?? null,
        accionDetallada: params.accionDetallada ?? null,
        severidad:       params.severidad       ?? 'INFO',
        esMasiva:        params.esMasiva        ?? false,
        esAutomatico:    params.esAutomatico    ?? false,
        requiereRevision:params.requiereRevision?? false,
        ipAddress:       params.ipAddress       ?? null,
        userAgent:       params.userAgent       ?? null,
      },
    })
  } catch {
    // Audit must never block the main operation
  }
}
