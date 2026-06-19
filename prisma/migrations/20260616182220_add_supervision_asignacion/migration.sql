-- CreateTable
CREATE TABLE "supervision_asignaciones" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "visualizadorId" TEXT NOT NULL,
    "asignadoId" TEXT NOT NULL,
    "tipoAsignado" TEXT NOT NULL,
    "creadoPor" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supervision_asignaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supervision_asignaciones_visualizadorId_idx" ON "supervision_asignaciones"("visualizadorId");

-- CreateIndex
CREATE INDEX "supervision_asignaciones_asignadoId_idx" ON "supervision_asignaciones"("asignadoId");

-- CreateIndex
CREATE INDEX "supervision_asignaciones_empresaId_idx" ON "supervision_asignaciones"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "supervision_asignaciones_visualizadorId_asignadoId_key" ON "supervision_asignaciones"("visualizadorId", "asignadoId");

-- AddForeignKey
ALTER TABLE "supervision_asignaciones" ADD CONSTRAINT "supervision_asignaciones_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_asignaciones" ADD CONSTRAINT "supervision_asignaciones_visualizadorId_fkey" FOREIGN KEY ("visualizadorId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
