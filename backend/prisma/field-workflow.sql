BEGIN;
SET LOCAL search_path TO mancomunidad;
-- AlterTable
ALTER TABLE "Proyecto" ADD COLUMN     "avancePorHitos" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "EvidenciaProyecto" ADD COLUMN     "claveArchivo" TEXT,
ADD COLUMN     "claveEnvio" TEXT,
ADD COLUMN     "estadoRevision" TEXT NOT NULL DEFAULT 'Pendiente',
ADD COLUMN     "hitoId" INTEGER,
ADD COLUMN     "motivoRevision" TEXT,
ADD COLUMN     "recibidoEn" TIMESTAMP(3),
ADD COLUMN     "revisadoEn" TIMESTAMP(3),
ADD COLUMN     "revisadoPorId" INTEGER,
ADD COLUMN     "revisionVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "HitoProyecto" (
    "id" SERIAL NOT NULL,
    "proyectoId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "criterio" TEXT NOT NULL,
    "peso" INTEGER NOT NULL,

    CONSTRAINT "HitoProyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevisionEvidencia" (
    "id" SERIAL NOT NULL,
    "evidenciaId" INTEGER NOT NULL,
    "estado" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL,

    CONSTRAINT "RevisionEvidencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RevisionEvidencia_evidenciaId_version_key" ON "RevisionEvidencia"("evidenciaId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "EvidenciaProyecto_proyectoId_claveEnvio_key" ON "EvidenciaProyecto"("proyectoId", "claveEnvio");

-- CreateIndex
CREATE UNIQUE INDEX "EvidenciaProyecto_proyectoId_claveArchivo_key" ON "EvidenciaProyecto"("proyectoId", "claveArchivo");

-- AddForeignKey
ALTER TABLE "HitoProyecto" ADD CONSTRAINT "HitoProyecto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionEvidencia" ADD CONSTRAINT "RevisionEvidencia_evidenciaId_fkey" FOREIGN KEY ("evidenciaId") REFERENCES "EvidenciaProyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenciaProyecto" ADD CONSTRAINT "EvidenciaProyecto_hitoId_fkey" FOREIGN KEY ("hitoId") REFERENCES "HitoProyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "HitoProyecto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RevisionEvidencia" ENABLE ROW LEVEL SECURITY;
COMMIT;
