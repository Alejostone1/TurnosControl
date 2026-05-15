-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateEnum
CREATE TYPE "EstadoEmpresa" AS ENUM ('ACTIVA', 'INACTIVA', 'SUSPENDIDA', 'ELIMINADA');

-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('SUPER_ADMIN', 'ADMINISTRADOR', 'LIQUIDADOR', 'VISUALIZADOR');

-- CreateEnum
CREATE TYPE "TipoAlmuerzo" AS ENUM ('NINGUNO', 'PREDEFINIDO', 'PERSONALIZADO');

-- CreateEnum
CREATE TYPE "TipoCalculoHorasExtras" AS ENUM ('SEMANAL', 'DIARIO');

-- CreateEnum
CREATE TYPE "CategoriaConcepto" AS ENUM ('TURNO_LABORAL', 'AUSENCIA_PAGA', 'AUSENCIA_NO_PAGA', 'DESCANSO', 'ESPECIAL');

-- CreateEnum
CREATE TYPE "TipoCalculo" AS ENUM ('HORAS_TURNO', 'HORAS_FIJAS', 'FORMULA', 'SIN_PAGO');

-- CreateEnum
CREATE TYPE "TipoImpacto" AS ENUM ('SUMA_HORAS', 'RESTA_HORAS', 'NEUTRO');

-- CreateEnum
CREATE TYPE "EstadoAsignacion" AS ENUM ('ACTIVO', 'INACTIVO', 'EXCLUIDO');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('CEDULA_CIUDADANIA', 'TARJETA_IDENTIDAD', 'CEDULA_EXTRANJERIA', 'PASAPORTE', 'NIT');

-- CreateEnum
CREATE TYPE "TipoVinculacion" AS ENUM ('TIEMPO_COMPLETO', 'MEDIO_TIEMPO', 'TEMPORAL', 'APRENDIZ_SENA', 'PRACTICANTE');

-- CreateEnum
CREATE TYPE "TipoContrato" AS ENUM ('TERMINO_INDEFINIDO', 'TERMINO_FIJO', 'OBRA_LABOR', 'PRESTACION_SERVICIOS', 'APRENDIZAJE');

-- CreateEnum
CREATE TYPE "TipoPeriodo" AS ENUM ('SEMANAL', 'QUINCENAL', 'MENSUAL', 'TRIMESTRAL', 'PERSONALIZADO');

-- CreateEnum
CREATE TYPE "EstadoPeriodo" AS ENUM ('BORRADOR', 'PENDIENTE', 'CALCULADO', 'APROBADO', 'CERRADO', 'ARCHIVADO');

-- CreateEnum
CREATE TYPE "SeveridadAuditoria" AS ENUM ('INFO', 'BAJO', 'MEDIO', 'ALTO', 'CRITICO');

-- CreateEnum
CREATE TYPE "AccionAuditoria" AS ENUM ('CREAR', 'LEER', 'ACTUALIZAR', 'ELIMINAR', 'CALCULAR', 'APROBAR', 'CERRAR', 'EXPORTAR', 'INICIAR_SESION', 'CERRAR_SESION', 'RECALCULAR', 'CONFIRMAR', 'ASIGNAR', 'DESASIGNAR', 'ACTIVAR', 'DESACTIVAR', 'IMPORTAR', 'CONFIGURAR', 'LOGIN_FALLIDO', 'RESTAURAR');

-- CreateEnum
CREATE TYPE "TipoTrabajo" AS ENUM ('CALCULO_PERIODO', 'GENERAR_REPORTE', 'ACTUALIZACION_MASIVA', 'NOTIFICACION_CORREO');

-- CreateEnum
CREATE TYPE "EstadoTrabajo" AS ENUM ('PENDIENTE', 'PROCESANDO', 'COMPLETADO', 'FALLIDO', 'CANCELADO');

-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nit" TEXT,
    "correo" TEXT,
    "telefono" TEXT,
    "direccion" JSONB,
    "estado" "EstadoEmpresa" NOT NULL DEFAULT 'ACTIVA',
    "configuracionPredeterminada" JSONB DEFAULT '{}',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "eliminadoEn" TIMESTAMP(3),

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "contrasena" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "documento" TEXT,
    "telefono" TEXT,
    "avatar" TEXT,
    "empresaId" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'VISUALIZADOR',
    "estaActivo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoAccesoEn" TIMESTAMP(3),
    "contrasenaActualizadaEn" TIMESTAMP(3),
    "tokenActualizacion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "creadoPor" TEXT,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auxiliares" (
    "id" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "contrasena" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "documento" TEXT,
    "telefono" TEXT,
    "avatar" TEXT,
    "empresaId" TEXT NOT NULL,
    "estaActivo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoAccesoEn" TIMESTAMP(3),
    "contrasenaActualizadaEn" TIMESTAMP(3),
    "tokenActualizacion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "creadoPor" TEXT,

    CONSTRAINT "auxiliares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones_auxiliares" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "auxiliarId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sesiones_auxiliares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuraciones_legales" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL DEFAULT 'Configuración Predeterminada',
    "estaActiva" BOOLEAN NOT NULL DEFAULT true,
    "horasSemanalesMaximas" DOUBLE PRECISION NOT NULL DEFAULT 44,
    "horasDiariasEstandar" DOUBLE PRECISION NOT NULL DEFAULT 7.33,
    "porcentajeRecargoNocturno" INTEGER NOT NULL DEFAULT 35,
    "porcentajeRecargoDomFestivo" INTEGER NOT NULL DEFAULT 75,
    "porcentajeRecargoNocturnoFestivo" INTEGER NOT NULL DEFAULT 110,
    "porcentajeExtraDiurna" INTEGER NOT NULL DEFAULT 25,
    "porcentajeExtraNocturna" INTEGER NOT NULL DEFAULT 75,
    "porcentajeExtraDiurnaFestiva" INTEGER NOT NULL DEFAULT 100,
    "porcentajeExtraNocturnaFestiva" INTEGER NOT NULL DEFAULT 150,
    "horaInicioNocturno" TEXT NOT NULL DEFAULT '19:00',
    "horaFinNocturno" TEXT NOT NULL DEFAULT '06:00',
    "tipoAlmuerzo" "TipoAlmuerzo" NOT NULL DEFAULT 'PREDEFINIDO',
    "duracionAlmuerzaMinutos" INTEGER DEFAULT 30,
    "horaInicioAlmuerzo" TEXT DEFAULT '12:00',
    "horaFinAlmuerzo" TEXT,
    "formulaValorHora" TEXT NOT NULL DEFAULT 'SALARIO_MENSUAL / 220',
    "tipoCalculoHorasExtras" "TipoCalculoHorasExtras" NOT NULL DEFAULT 'SEMANAL',
    "vigenciaDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigenciaHasta" TIMESTAMP(3),
    "creadoPor" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuraciones_legales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conceptos_nomina" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria" "CategoriaConcepto" NOT NULL DEFAULT 'TURNO_LABORAL',
    "tipoCalculo" "TipoCalculo" NOT NULL DEFAULT 'HORAS_TURNO',
    "tipoImpacto" "TipoImpacto" NOT NULL DEFAULT 'SUMA_HORAS',
    "horasFijas" DOUBLE PRECISION,
    "formula" TEXT,
    "afectaLiquidacion" BOOLEAN NOT NULL DEFAULT true,
    "cuentaParaTope" BOOLEAN NOT NULL DEFAULT false,
    "afectaVacaciones" BOOLEAN NOT NULL DEFAULT false,
    "requiereJustificacion" BOOLEAN NOT NULL DEFAULT false,
    "generaCompenatorio" BOOLEAN NOT NULL DEFAULT false,
    "horaInicioDefecto" TEXT,
    "horaFinDefecto" TEXT,
    "cruzaMedianoche" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "icono" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "estaActivo" BOOLEAN NOT NULL DEFAULT true,
    "esDelSistema" BOOLEAN NOT NULL DEFAULT false,
    "creadoPor" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conceptos_nomina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empleados" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipoDocumento" "TipoDocumento" NOT NULL DEFAULT 'CEDULA_CIUDADANIA',
    "numeroDocumento" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "centroCosto" TEXT,
    "programa" TEXT,
    "modalidad" TEXT,
    "cargo" TEXT,
    "creadoPorAuxiliarId" TEXT,
    "creadoPorUsuarioId" TEXT,
    "fechaIngreso" TIMESTAMP(3) NOT NULL,
    "fechaRetiro" TIMESTAMP(3),
    "tipoVinculacion" "TipoVinculacion" NOT NULL DEFAULT 'TIEMPO_COMPLETO',
    "salarioBase" DOUBLE PRECISION NOT NULL,
    "tieneAuxilioTransporte" BOOLEAN NOT NULL DEFAULT true,
    "tipoContrato" "TipoContrato" NOT NULL DEFAULT 'TERMINO_INDEFINIDO',
    "horasSemanales" DOUBLE PRECISION NOT NULL DEFAULT 44,
    "estaActivo" BOOLEAN NOT NULL DEFAULT true,
    "creadoPor" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empleados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empleado_periodo" (
    "id" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "periodoId" TEXT NOT NULL,
    "estadoAsignacion" "EstadoAsignacion" NOT NULL DEFAULT 'ACTIVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "creadoPor" TEXT,

    CONSTRAINT "empleado_periodo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignaciones_turno" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "conceptoId" TEXT NOT NULL,
    "novedadId" TEXT,
    "fechaTurno" DATE NOT NULL,
    "horaInicioPersonalizada" TEXT,
    "horaFinPersonalizada" TEXT,
    "minutosAlimentacion" INTEGER,
    "observaciones" TEXT,
    "creadoPor" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asignaciones_turno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periodos_nomina" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombrePeriodo" TEXT NOT NULL,
    "tipoPeriodo" "TipoPeriodo" NOT NULL DEFAULT 'MENSUAL',
    "tipoCalculoHorasExtras" "TipoCalculoHorasExtras" NOT NULL DEFAULT 'SEMANAL',
    "fechaInicio" DATE NOT NULL,
    "fechaFin" DATE NOT NULL,
    "fechaCorte" DATE,
    "configuracionLegalId" TEXT NOT NULL,
    "minutosAlimentacion" INTEGER,
    "estadoPeriodo" "EstadoPeriodo" NOT NULL DEFAULT 'BORRADOR',
    "cerradoEn" TIMESTAMP(3),
    "calculadoEn" TIMESTAMP(3),
    "calculadoPor" TEXT,
    "creadoPor" TEXT,
    "modificadoPor" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "periodos_nomina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_dias_trabajados" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "periodoId" TEXT NOT NULL,
    "asignacionId" TEXT NOT NULL,
    "fechaDia" DATE NOT NULL,
    "numeroSemana" INTEGER NOT NULL,
    "esFestivo" BOOLEAN NOT NULL DEFAULT false,
    "esDomingo" BOOLEAN NOT NULL DEFAULT false,
    "cruzaMedianoche" BOOLEAN NOT NULL DEFAULT false,
    "horasOrdinarias" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "horasNocturnas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "horasFestivas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "horasNoctFestivas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "horasExtraDiurna" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "horasExtraNocturna" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "horasExtraDiurnaFest" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "horasExtraNoctFest" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalHorasTrabajadas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "horasExtrasGeneradas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "horasDeuda" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "horasSemanaAcumuladas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requiereCompensatorio" BOOLEAN NOT NULL DEFAULT false,
    "compensatorioAsignado" BOOLEAN NOT NULL DEFAULT false,
    "valorHoraUsado" DOUBLE PRECISION,
    "valorTotalDia" DOUBLE PRECISION,
    "detalleCalculo" JSONB,
    "calculadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculadoPor" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "registros_dias_trabajados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resultados_nomina" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "periodoId" TEXT NOT NULL,
    "totalHorasOrdinarias" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalHorasNocturnas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalHorasFestivas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalHorasNoctFestivas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalExtraDiurna" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalExtraNocturna" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalExtraDiurnaFest" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalExtraNoctFest" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalHorasTrabajadas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalHorasExtras" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalHorasDeuda" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salarioBase" DOUBLE PRECISION NOT NULL,
    "auxilioTransporte" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorHorasOrdinarias" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorRecargoNocturno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorRecargoFestivo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorRecargoNoctFestivo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorExtraDiurna" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorExtraNocturna" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorExtraDiurnaFest" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorExtraNoctFest" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDevengado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeducciones" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netoAPagar" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadatosCalculo" JSONB,
    "calculadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculadoPor" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resultados_nomina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuraciones_empleados" (
    "id" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "horarioPersonalizado" JSONB,
    "recargoNocturnoPersonalizado" INTEGER,
    "recargoFestivoPersonalizado" INTEGER,
    "recargoNoctFestivoPersonalizado" INTEGER,
    "maxHorasExtrasSemana" DOUBLE PRECISION,
    "maxHorasExtrasMes" DOUBLE PRECISION,
    "tieneAuxilioTransporte" BOOLEAN NOT NULL DEFAULT true,
    "tieneSeguroSalud" BOOLEAN NOT NULL DEFAULT true,
    "tieneFondoPension" BOOLEAN NOT NULL DEFAULT true,
    "esSindicado" BOOLEAN NOT NULL DEFAULT false,
    "autorizadoHorasExtras" BOOLEAN NOT NULL DEFAULT false,
    "autorizadoTurnoNocturno" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuraciones_empleados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_auditoria" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "auxiliarId" TEXT,
    "accion" "AccionAuditoria" NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "valorAntes" JSONB,
    "valorDespues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "descripcion" TEXT,
    "modulo" TEXT,
    "severidad" "SeveridadAuditoria" NOT NULL DEFAULT 'INFO',
    "accionDetallada" TEXT,
    "esMasiva" BOOLEAN NOT NULL DEFAULT false,
    "esAutomatico" BOOLEAN NOT NULL DEFAULT false,
    "requiereRevision" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registros_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trabajos_calculo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "periodoId" TEXT NOT NULL,
    "tipoTrabajo" "TipoTrabajo" NOT NULL DEFAULT 'CALCULO_PERIODO',
    "estadoTrabajo" "EstadoTrabajo" NOT NULL DEFAULT 'PENDIENTE',
    "prioridad" INTEGER NOT NULL DEFAULT 0,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "maxIntentos" INTEGER NOT NULL DEFAULT 3,
    "resultado" JSONB,
    "iniciadoEn" TIMESTAMP(3),
    "finalizadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trabajos_calculo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_slug_key" ON "empresas"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_nombre_key" ON "empresas"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_correo_key" ON "empresas"("correo");

-- CreateIndex
CREATE INDEX "empresas_slug_idx" ON "empresas"("slug");

-- CreateIndex
CREATE INDEX "empresas_estado_idx" ON "empresas"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_documento_key" ON "usuarios"("documento");

-- CreateIndex
CREATE INDEX "usuarios_empresaId_correo_idx" ON "usuarios"("empresaId", "correo");

-- CreateIndex
CREATE INDEX "usuarios_empresaId_estaActivo_idx" ON "usuarios"("empresaId", "estaActivo");

-- CreateIndex
CREATE UNIQUE INDEX "auxiliares_correo_key" ON "auxiliares"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "auxiliares_documento_key" ON "auxiliares"("documento");

-- CreateIndex
CREATE INDEX "auxiliares_empresaId_estaActivo_idx" ON "auxiliares"("empresaId", "estaActivo");

-- CreateIndex
CREATE UNIQUE INDEX "auxiliares_empresaId_correo_key" ON "auxiliares"("empresaId", "correo");

-- CreateIndex
CREATE UNIQUE INDEX "auxiliares_empresaId_documento_key" ON "auxiliares"("empresaId", "documento");

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_token_key" ON "sesiones"("token");

-- CreateIndex
CREATE INDEX "sesiones_token_idx" ON "sesiones"("token");

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_auxiliares_token_key" ON "sesiones_auxiliares"("token");

-- CreateIndex
CREATE INDEX "sesiones_auxiliares_token_idx" ON "sesiones_auxiliares"("token");

-- CreateIndex
CREATE INDEX "configuraciones_legales_empresaId_vigenciaDesde_idx" ON "configuraciones_legales"("empresaId", "vigenciaDesde");

-- CreateIndex
CREATE UNIQUE INDEX "configuraciones_legales_empresaId_estaActiva_key" ON "configuraciones_legales"("empresaId", "estaActiva");

-- CreateIndex
CREATE INDEX "conceptos_nomina_empresaId_estaActivo_idx" ON "conceptos_nomina"("empresaId", "estaActivo");

-- CreateIndex
CREATE INDEX "conceptos_nomina_empresaId_categoria_idx" ON "conceptos_nomina"("empresaId", "categoria");

-- CreateIndex
CREATE UNIQUE INDEX "conceptos_nomina_empresaId_codigo_key" ON "conceptos_nomina"("empresaId", "codigo");

-- CreateIndex
CREATE INDEX "empleados_empresaId_estaActivo_idx" ON "empleados"("empresaId", "estaActivo");

-- CreateIndex
CREATE INDEX "empleados_numeroDocumento_idx" ON "empleados"("numeroDocumento");

-- CreateIndex
CREATE UNIQUE INDEX "empleados_empresaId_numeroDocumento_key" ON "empleados"("empresaId", "numeroDocumento");

-- CreateIndex
CREATE INDEX "empleado_periodo_periodoId_estadoAsignacion_idx" ON "empleado_periodo"("periodoId", "estadoAsignacion");

-- CreateIndex
CREATE INDEX "empleado_periodo_empleadoId_estadoAsignacion_idx" ON "empleado_periodo"("empleadoId", "estadoAsignacion");

-- CreateIndex
CREATE UNIQUE INDEX "empleado_periodo_empleadoId_periodoId_key" ON "empleado_periodo"("empleadoId", "periodoId");

-- CreateIndex
CREATE INDEX "asignaciones_turno_empresaId_empleadoId_fechaTurno_idx" ON "asignaciones_turno"("empresaId", "empleadoId", "fechaTurno");

-- CreateIndex
CREATE INDEX "asignaciones_turno_empresaId_fechaTurno_idx" ON "asignaciones_turno"("empresaId", "fechaTurno");

-- CreateIndex
CREATE INDEX "asignaciones_turno_conceptoId_idx" ON "asignaciones_turno"("conceptoId");

-- CreateIndex
CREATE INDEX "asignaciones_turno_novedadId_idx" ON "asignaciones_turno"("novedadId");

-- CreateIndex
CREATE UNIQUE INDEX "asignaciones_turno_empresaId_empleadoId_fechaTurno_key" ON "asignaciones_turno"("empresaId", "empleadoId", "fechaTurno");

-- CreateIndex
CREATE INDEX "periodos_nomina_empresaId_estadoPeriodo_idx" ON "periodos_nomina"("empresaId", "estadoPeriodo");

-- CreateIndex
CREATE INDEX "periodos_nomina_empresaId_fechaInicio_fechaFin_idx" ON "periodos_nomina"("empresaId", "fechaInicio", "fechaFin");

-- CreateIndex
CREATE UNIQUE INDEX "periodos_nomina_empresaId_nombrePeriodo_fechaInicio_key" ON "periodos_nomina"("empresaId", "nombrePeriodo", "fechaInicio");

-- CreateIndex
CREATE UNIQUE INDEX "registros_dias_trabajados_asignacionId_key" ON "registros_dias_trabajados"("asignacionId");

-- CreateIndex
CREATE INDEX "registros_dias_trabajados_empresaId_empleadoId_periodoId_idx" ON "registros_dias_trabajados"("empresaId", "empleadoId", "periodoId");

-- CreateIndex
CREATE INDEX "registros_dias_trabajados_empresaId_fechaDia_idx" ON "registros_dias_trabajados"("empresaId", "fechaDia");

-- CreateIndex
CREATE INDEX "registros_dias_trabajados_empleadoId_fechaDia_idx" ON "registros_dias_trabajados"("empleadoId", "fechaDia");

-- CreateIndex
CREATE INDEX "registros_dias_trabajados_empleadoId_numeroSemana_idx" ON "registros_dias_trabajados"("empleadoId", "numeroSemana");

-- CreateIndex
CREATE INDEX "resultados_nomina_empresaId_periodoId_empleadoId_idx" ON "resultados_nomina"("empresaId", "periodoId", "empleadoId");

-- CreateIndex
CREATE UNIQUE INDEX "resultados_nomina_empresaId_empleadoId_periodoId_key" ON "resultados_nomina"("empresaId", "empleadoId", "periodoId");

-- CreateIndex
CREATE UNIQUE INDEX "configuraciones_empleados_empleadoId_key" ON "configuraciones_empleados"("empleadoId");

-- CreateIndex
CREATE INDEX "registros_auditoria_empresaId_entidad_entidadId_idx" ON "registros_auditoria"("empresaId", "entidad", "entidadId");

-- CreateIndex
CREATE INDEX "registros_auditoria_empresaId_creadoEn_idx" ON "registros_auditoria"("empresaId", "creadoEn");

-- CreateIndex
CREATE INDEX "registros_auditoria_usuarioId_idx" ON "registros_auditoria"("usuarioId");

-- CreateIndex
CREATE INDEX "registros_auditoria_auxiliarId_idx" ON "registros_auditoria"("auxiliarId");

-- CreateIndex
CREATE INDEX "registros_auditoria_empresaId_severidad_creadoEn_idx" ON "registros_auditoria"("empresaId", "severidad", "creadoEn");

-- CreateIndex
CREATE INDEX "registros_auditoria_empresaId_modulo_creadoEn_idx" ON "registros_auditoria"("empresaId", "modulo", "creadoEn");

-- CreateIndex
CREATE INDEX "registros_auditoria_empresaId_accion_creadoEn_idx" ON "registros_auditoria"("empresaId", "accion", "creadoEn");

-- CreateIndex
CREATE INDEX "trabajos_calculo_empresaId_estadoTrabajo_idx" ON "trabajos_calculo"("empresaId", "estadoTrabajo");

-- CreateIndex
CREATE INDEX "trabajos_calculo_estadoTrabajo_prioridad_idx" ON "trabajos_calculo"("estadoTrabajo", "prioridad");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auxiliares" ADD CONSTRAINT "auxiliares_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_auxiliares" ADD CONSTRAINT "sesiones_auxiliares_auxiliarId_fkey" FOREIGN KEY ("auxiliarId") REFERENCES "auxiliares"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_auxiliares" ADD CONSTRAINT "sesiones_auxiliares_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuraciones_legales" ADD CONSTRAINT "configuraciones_legales_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conceptos_nomina" ADD CONSTRAINT "conceptos_nomina_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_creadoPorAuxiliarId_fkey" FOREIGN KEY ("creadoPorAuxiliarId") REFERENCES "auxiliares"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_creadoPorUsuarioId_fkey" FOREIGN KEY ("creadoPorUsuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleado_periodo" ADD CONSTRAINT "empleado_periodo_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleado_periodo" ADD CONSTRAINT "empleado_periodo_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "periodos_nomina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_turno" ADD CONSTRAINT "asignaciones_turno_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_turno" ADD CONSTRAINT "asignaciones_turno_conceptoId_fkey" FOREIGN KEY ("conceptoId") REFERENCES "conceptos_nomina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_turno" ADD CONSTRAINT "asignaciones_turno_novedadId_fkey" FOREIGN KEY ("novedadId") REFERENCES "conceptos_nomina"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodos_nomina" ADD CONSTRAINT "periodos_nomina_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodos_nomina" ADD CONSTRAINT "periodos_nomina_configuracionLegalId_fkey" FOREIGN KEY ("configuracionLegalId") REFERENCES "configuraciones_legales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodos_nomina" ADD CONSTRAINT "periodos_nomina_creadoPor_fkey" FOREIGN KEY ("creadoPor") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodos_nomina" ADD CONSTRAINT "periodos_nomina_modificadoPor_fkey" FOREIGN KEY ("modificadoPor") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_dias_trabajados" ADD CONSTRAINT "registros_dias_trabajados_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_dias_trabajados" ADD CONSTRAINT "registros_dias_trabajados_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "periodos_nomina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_dias_trabajados" ADD CONSTRAINT "registros_dias_trabajados_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES "asignaciones_turno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultados_nomina" ADD CONSTRAINT "resultados_nomina_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultados_nomina" ADD CONSTRAINT "resultados_nomina_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "periodos_nomina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuraciones_empleados" ADD CONSTRAINT "configuraciones_empleados_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_auditoria" ADD CONSTRAINT "registros_auditoria_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_auditoria" ADD CONSTRAINT "registros_auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_auditoria" ADD CONSTRAINT "registros_auditoria_auxiliarId_fkey" FOREIGN KEY ("auxiliarId") REFERENCES "auxiliares"("id") ON DELETE SET NULL ON UPDATE CASCADE;
