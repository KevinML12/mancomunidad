-- CreateTable
CREATE TABLE "Proyecto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "agenciaFinanciadora" TEXT NOT NULL,
    "fechaInicioPlanificada" DATETIME NOT NULL,
    "fechaFinPlanificada" DATETIME,
    "presupuestoMunicipal" REAL NOT NULL DEFAULT 0,
    "presupuestoCooperacion" REAL NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'Planificación',
    "porcentajeAvanceFisico" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EvidenciaProyecto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "proyectoId" INTEGER NOT NULL,
    "urlArchivo" TEXT NOT NULL,
    "latitud" REAL,
    "longitud" REAL,
    "descripcion" TEXT,
    "fechaCaptura" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cargadoPorId" INTEGER,
    CONSTRAINT "EvidenciaProyecto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
