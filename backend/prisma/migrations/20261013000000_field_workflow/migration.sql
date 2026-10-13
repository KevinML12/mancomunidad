-- CreateTable
CREATE TABLE "HitoProyecto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "proyectoId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "criterio" TEXT NOT NULL,
    "peso" INTEGER NOT NULL,
    CONSTRAINT "HitoProyecto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RevisionEvidencia" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "evidenciaId" INTEGER NOT NULL,
    "estado" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL,
    CONSTRAINT "RevisionEvidencia_evidenciaId_fkey" FOREIGN KEY ("evidenciaId") REFERENCES "EvidenciaProyecto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Proyecto" (
    "municipio" TEXT,
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "agenciaFinanciadora" TEXT NOT NULL,
    "fechaInicioPlanificada" DATETIME NOT NULL,
    "fechaFinPlanificada" DATETIME,
    "presupuestoMunicipal" REAL NOT NULL DEFAULT 0,
    "presupuestoCooperacion" REAL NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'Planificación',
    "porcentajeAvanceFisico" REAL NOT NULL DEFAULT 0,
    "avancePorHitos" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Proyecto" ("agenciaFinanciadora", "createdAt", "estado", "fechaFinPlanificada", "fechaInicioPlanificada", "id", "municipio", "nombre", "porcentajeAvanceFisico", "presupuestoCooperacion", "presupuestoMunicipal") SELECT "agenciaFinanciadora", "createdAt", "estado", "fechaFinPlanificada", "fechaInicioPlanificada", "id", "municipio", "nombre", "porcentajeAvanceFisico", "presupuestoCooperacion", "presupuestoMunicipal" FROM "Proyecto";
DROP TABLE "Proyecto";
ALTER TABLE "new_Proyecto" RENAME TO "Proyecto";
CREATE TABLE "new_EvidenciaProyecto" (
    "claveEnvio" TEXT,
    "claveArchivo" TEXT,
    "hitoId" INTEGER,
    "recibidoEn" DATETIME,
    "estadoRevision" TEXT NOT NULL DEFAULT 'Pendiente',
    "revisionVersion" INTEGER NOT NULL DEFAULT 0,
    "revisadoPorId" INTEGER,
    "revisadoEn" DATETIME,
    "motivoRevision" TEXT,
    "contenido" TEXT,
    "tipoMime" TEXT,
    "sha256" TEXT,
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "proyectoId" INTEGER NOT NULL,
    "urlArchivo" TEXT NOT NULL,
    "latitud" REAL,
    "longitud" REAL,
    "descripcion" TEXT,
    "fechaCaptura" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cargadoPorId" INTEGER,
    CONSTRAINT "EvidenciaProyecto_hitoId_fkey" FOREIGN KEY ("hitoId") REFERENCES "HitoProyecto" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EvidenciaProyecto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_EvidenciaProyecto" ("cargadoPorId", "contenido", "descripcion", "fechaCaptura", "id", "latitud", "longitud", "proyectoId", "sha256", "tipoMime", "urlArchivo") SELECT "cargadoPorId", "contenido", "descripcion", "fechaCaptura", "id", "latitud", "longitud", "proyectoId", "sha256", "tipoMime", "urlArchivo" FROM "EvidenciaProyecto";
DROP TABLE "EvidenciaProyecto";
ALTER TABLE "new_EvidenciaProyecto" RENAME TO "EvidenciaProyecto";
CREATE UNIQUE INDEX "EvidenciaProyecto_proyectoId_claveEnvio_key" ON "EvidenciaProyecto"("proyectoId", "claveEnvio");
CREATE UNIQUE INDEX "EvidenciaProyecto_proyectoId_claveArchivo_key" ON "EvidenciaProyecto"("proyectoId", "claveArchivo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "RevisionEvidencia_evidenciaId_version_key" ON "RevisionEvidencia"("evidenciaId", "version");
