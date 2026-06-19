-- CreateEnum
CREATE TYPE "EstadoTurno" AS ENUM ('PENDIENTE', 'PROGRAMADO', 'LIQUIDADO', 'EN_REVISION', 'APROBADO', 'RECHAZADO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EstadoPeriodo" ADD VALUE 'EN_REVISION';
ALTER TYPE "EstadoPeriodo" ADD VALUE 'RECHAZADO';

-- AlterTable
ALTER TABLE "asignaciones_turno" ADD COLUMN     "aprobadoEn" TIMESTAMP(3),
ADD COLUMN     "aprobadoPor" TEXT,
ADD COLUMN     "estado" "EstadoTurno" NOT NULL DEFAULT 'PENDIENTE',
ADD COLUMN     "liquidadoEn" TIMESTAMP(3),
ADD COLUMN     "liquidadoPor" TEXT,
ADD COLUMN     "observacionRevision" TEXT,
ADD COLUMN     "revisadoEn" TIMESTAMP(3),
ADD COLUMN     "revisadoPor" TEXT;

-- AlterTable
ALTER TABLE "periodos_nomina" ADD COLUMN     "aprobadoEn" TIMESTAMP(3),
ADD COLUMN     "aprobadoPor" TEXT,
ADD COLUMN     "observacionCierre" TEXT;
