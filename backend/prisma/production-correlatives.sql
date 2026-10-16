CREATE TABLE IF NOT EXISTS "CorrelativoInstitucional" (
  "clave" TEXT NOT NULL PRIMARY KEY,
  "ultimo" INTEGER NOT NULL
);
ALTER TABLE "CorrelativoInstitucional" ENABLE ROW LEVEL SECURITY;
