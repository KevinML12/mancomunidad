CREATE TABLE "HitoProyecto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "proyectoId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "pesoPorcentaje" REAL NOT NULL,
    "fechaPlanificada" DATETIME NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Pendiente',
    "fechaAprobacion" DATETIME,
    "aprobadoPorId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HitoProyecto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

ALTER TABLE "EvidenciaProyecto" ADD COLUMN "hitoId" INTEGER REFERENCES "HitoProyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "EvidenciaProyecto_hitoId_idx" ON "EvidenciaProyecto"("hitoId");
