BEGIN;
ALTER TABLE "EvidenciaProyecto" ADD COLUMN IF NOT EXISTS "dedupeKey" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "EvidenciaProyecto_proyectoId_dedupeKey_key" ON "EvidenciaProyecto"("proyectoId", "dedupeKey");
CREATE INDEX IF NOT EXISTS "EvidenciaProyecto_proyectoId_sha256_idx" ON "EvidenciaProyecto"("proyectoId", "sha256");
CREATE INDEX IF NOT EXISTS "EvidenciaProyecto_proyectoId_fechaCaptura_id_idx" ON "EvidenciaProyecto"("proyectoId", "fechaCaptura", "id");
COMMIT;
