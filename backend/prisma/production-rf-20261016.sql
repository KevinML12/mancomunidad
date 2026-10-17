-- Aplicar solo a la base activa identificada y respaldada, después de
-- production-release-20261015.sql.
BEGIN;

CREATE TABLE IF NOT EXISTS public."UsuarioMunicipio" (
  "usuarioId" INTEGER NOT NULL,
  "municipio" TEXT NOT NULL,
  CONSTRAINT "UsuarioMunicipio_pkey" PRIMARY KEY ("usuarioId", "municipio"),
  CONSTRAINT "UsuarioMunicipio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES public."Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
ALTER TABLE public."UsuarioMunicipio" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public."HitoProyecto" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "proyectoId" INTEGER NOT NULL REFERENCES public."Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "nombre" TEXT NOT NULL,
  "pesoPorcentaje" DOUBLE PRECISION NOT NULL,
  "fechaPlanificada" TIMESTAMP(3) NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'Pendiente',
  "fechaAprobacion" TIMESTAMP(3),
  "aprobadoPorId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE public."HitoProyecto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TareaARC" ADD COLUMN IF NOT EXISTS "responsableId" INTEGER;
CREATE INDEX IF NOT EXISTS "TareaARC_responsableId_idx" ON public."TareaARC"("responsableId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TareaARC_responsableId_fkey') THEN
    ALTER TABLE public."TareaARC" ADD CONSTRAINT "TareaARC_responsableId_fkey"
      FOREIGN KEY ("responsableId") REFERENCES public."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
ALTER TABLE public."EvidenciaProyecto" ADD COLUMN IF NOT EXISTS "hitoId" INTEGER;
ALTER TABLE public."EvidenciaProyecto" ADD COLUMN IF NOT EXISTS "latitudExif" DOUBLE PRECISION;
ALTER TABLE public."EvidenciaProyecto" ADD COLUMN IF NOT EXISTS "longitudExif" DOUBLE PRECISION;
ALTER TABLE public."EvidenciaProyecto" ADD COLUMN IF NOT EXISTS "latitudDispositivo" DOUBLE PRECISION;
ALTER TABLE public."EvidenciaProyecto" ADD COLUMN IF NOT EXISTS "longitudDispositivo" DOUBLE PRECISION;
ALTER TABLE public."EvidenciaProyecto" ADD COLUMN IF NOT EXISTS "precisionDispositivoMetros" DOUBLE PRECISION;
ALTER TABLE public."EvidenciaProyecto" ADD COLUMN IF NOT EXISTS "municipioExif" TEXT;
ALTER TABLE public."EvidenciaProyecto" ADD COLUMN IF NOT EXISTS "municipioDispositivo" TEXT;
ALTER TABLE public."EvidenciaProyecto" ADD COLUMN IF NOT EXISTS "fuenteUbicacion" TEXT;
ALTER TABLE public."EvidenciaProyecto" ADD COLUMN IF NOT EXISTS "validacionUbicacion" TEXT;
CREATE INDEX IF NOT EXISTS "EvidenciaProyecto_hitoId_idx" ON public."EvidenciaProyecto"("hitoId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EvidenciaProyecto_hitoId_fkey') THEN
    ALTER TABLE public."EvidenciaProyecto" ADD CONSTRAINT "EvidenciaProyecto_hitoId_fkey"
      FOREIGN KEY ("hitoId") REFERENCES public."HitoProyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
CREATE OR REPLACE FUNCTION public.mfn_prevent_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'La bitácora y los puntos de control solo admiten inserciones';
END $$;
DROP TRIGGER IF EXISTS mfn_audit_append_only ON public."BitacoraAuditoria";
CREATE TRIGGER mfn_audit_append_only BEFORE UPDATE OR DELETE ON public."BitacoraAuditoria"
  FOR EACH ROW EXECUTE FUNCTION public.mfn_prevent_audit_mutation();
DROP TRIGGER IF EXISTS mfn_checkpoint_append_only ON public."PuntoControlIntegridad";
CREATE TRIGGER mfn_checkpoint_append_only BEFORE UPDATE OR DELETE ON public."PuntoControlIntegridad"
  FOR EACH ROW EXECUTE FUNCTION public.mfn_prevent_audit_mutation();
INSERT INTO public."SchemaVersion" ("version") VALUES ('2026-10-16-rf')
  ON CONFLICT ("version") DO NOTHING;

COMMIT;
