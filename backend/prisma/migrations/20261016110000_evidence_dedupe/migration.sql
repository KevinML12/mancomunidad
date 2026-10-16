ALTER TABLE "EvidenciaProyecto" ADD COLUMN "dedupeKey" TEXT;
CREATE UNIQUE INDEX "EvidenciaProyecto_proyectoId_dedupeKey_key" ON "EvidenciaProyecto"("proyectoId", "dedupeKey");
CREATE INDEX "EvidenciaProyecto_proyectoId_sha256_idx" ON "EvidenciaProyecto"("proyectoId", "sha256");
CREATE INDEX "EvidenciaProyecto_proyectoId_fechaCaptura_id_idx" ON "EvidenciaProyecto"("proyectoId", "fechaCaptura", "id");
