-- Ejecutar manualmente SOLO contra la base activa de Vercel, tras identificarla
-- y crear un respaldo verificable. No forma parte de la compilación ni de una petición.
BEGIN;

ALTER TABLE public."Usuario"
  ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public."PublicacionTransparencia"
  ADD COLUMN IF NOT EXISTS "mediaRef" TEXT;

CREATE TABLE IF NOT EXISTS public."RateLimitBucket" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "count" INTEGER NOT NULL,
  "untilMs" BIGINT NOT NULL
);
ALTER TABLE public."RateLimitBucket" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public."SchemaVersion" (
  "version" TEXT PRIMARY KEY,
  "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public."SchemaVersion" ENABLE ROW LEVEL SECURITY;
INSERT INTO public."SchemaVersion" ("version") VALUES ('2026-10-15-release')
  ON CONFLICT ("version") DO NOTHING;

COMMIT;
