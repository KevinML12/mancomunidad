-- AlterTable
ALTER TABLE "BitacoraAuditoria" ADD COLUMN "antesHash" TEXT;
ALTER TABLE "BitacoraAuditoria" ADD COLUMN "despuesHash" TEXT;

-- AlterTable
ALTER TABLE "EvidenciaProyecto" ADD COLUMN "contenido" TEXT;
ALTER TABLE "EvidenciaProyecto" ADD COLUMN "sha256" TEXT;
ALTER TABLE "EvidenciaProyecto" ADD COLUMN "tipoMime" TEXT;

-- AlterTable
ALTER TABLE "Proyecto" ADD COLUMN "municipio" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "TareaARC" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "prioridad" TEXT NOT NULL DEFAULT 'Media',
    "estado" TEXT NOT NULL DEFAULT 'Pendiente',
    "municipio" TEXT DEFAULT 'Regional',
    "responsable" TEXT NOT NULL,
    "fechaLimite" DATETIME NOT NULL,
    "fechaFinalizada" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TransaccionFinanciera" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "cuentaBancaria" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "municipio" TEXT,
    "monto" REAL NOT NULL,
    "comprobanteTipo" TEXT NOT NULL,
    "comprobanteNumero" TEXT NOT NULL,
    "urlComprobante" TEXT,
    "descripcion" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ActaAsamblea" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numeroActa" TEXT NOT NULL,
    "numeroSesion" INTEGER NOT NULL,
    "tipoSesion" TEXT NOT NULL DEFAULT 'Ordinaria',
    "fecha" DATETIME NOT NULL,
    "municipioSede" TEXT NOT NULL,
    "lugarReunion" TEXT,
    "libroCGCFolio" TEXT NOT NULL,
    "urlPdfEscaneado" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AcuerdoGobernanza" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigo" TEXT NOT NULL,
    "actaId" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "responsable" TEXT NOT NULL,
    "fechaCumplimiento" DATETIME,
    "estado" TEXT NOT NULL DEFAULT 'En Proceso',
    "evidenciaUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AcuerdoGobernanza_actaId_fkey" FOREIGN KEY ("actaId") REFERENCES "ActaAsamblea" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ConvenioInstitucional" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipoOrganizacion" TEXT NOT NULL,
    "entidadCooperante" TEXT NOT NULL,
    "montoCooperacion" REAL NOT NULL DEFAULT 0,
    "contrapartidaMFN" REAL NOT NULL DEFAULT 0,
    "fechaSuscripcion" DATETIME NOT NULL,
    "fechaVencimiento" DATETIME NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Vigente',
    "urlDocumento" TEXT,
    "coordinadorMFN" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CensoComunitarioASH" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigo" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "comunidad" TEXT NOT NULL,
    "viviendasTotales" INTEGER NOT NULL,
    "viviendasConAgua" INTEGER NOT NULL,
    "sistemaCloracion" BOOLEAN NOT NULL DEFAULT false,
    "ppmCloroResidual" REAL NOT NULL DEFAULT 0,
    "viviendasConSaneamiento" INTEGER NOT NULL,
    "fechaLevantamiento" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tecnicoResponsable" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PublicacionTransparencia" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "resumen" TEXT NOT NULL,
    "referenciaId" INTEGER,
    "visibilidad" BOOLEAN NOT NULL DEFAULT true,
    "fechaPublicacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autorizadoPor" TEXT NOT NULL DEFAULT 'Gerencia Ejecutiva',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RecuperacionClave" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usuarioId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expira" DATETIME NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "RecuperacionClave_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PuntoControlIntegridad" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "rootHash" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "auditoriaId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "Usuario" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TareaARC_codigo_key" ON "TareaARC"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TransaccionFinanciera_codigo_key" ON "TransaccionFinanciera"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ActaAsamblea_numeroActa_key" ON "ActaAsamblea"("numeroActa");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AcuerdoGobernanza_codigo_key" ON "AcuerdoGobernanza"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ConvenioInstitucional_codigo_key" ON "ConvenioInstitucional"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CensoComunitarioASH_codigo_key" ON "CensoComunitarioASH"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PublicacionTransparencia_codigo_key" ON "PublicacionTransparencia"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "RecuperacionClave_tokenHash_key" ON "RecuperacionClave"("tokenHash");

