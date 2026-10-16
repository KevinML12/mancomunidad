-- Actualiza la base Neon heredada (personal) a la estructura institucional.
-- Generado desde una copia restaurada de la base entregada el 2026-10-16.
-- Ejecutar una sola vez, tras respaldo y ensayo de restauración. La transacción
-- completa evita dejar una actualización parcial si falla una instrucción.
BEGIN;
SET LOCAL search_path TO public;
DO $$ BEGIN
  IF to_regclass('public."Usuario"') IS NULL OR to_regclass('public."Proyecto"') IS NOT NULL THEN
    RAISE EXCEPTION 'Esta migración solo admite la base Neon heredada sin Proyecto';
  END IF;
END $$;

-- AlterTable
ALTER TABLE "BitacoraAuditoria" ADD COLUMN     "antesHash" TEXT,
ADD COLUMN     "despuesHash" TEXT;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "UsuarioMunicipio" (
    "usuarioId" INTEGER NOT NULL,
    "municipio" TEXT NOT NULL,

    CONSTRAINT "UsuarioMunicipio_pkey" PRIMARY KEY ("usuarioId","municipio")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "untilMs" BIGINT NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Proyecto" (
    "municipio" TEXT,
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "agenciaFinanciadora" TEXT NOT NULL,
    "fechaInicioPlanificada" TIMESTAMP(3) NOT NULL,
    "fechaFinPlanificada" TIMESTAMP(3),
    "presupuestoMunicipal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "presupuestoCooperacion" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'Planificación',
    "porcentajeAvanceFisico" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HitoProyecto" (
    "id" SERIAL NOT NULL,
    "proyectoId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "pesoPorcentaje" DOUBLE PRECISION NOT NULL,
    "fechaPlanificada" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Pendiente',
    "fechaAprobacion" TIMESTAMP(3),
    "aprobadoPorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HitoProyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenciaProyecto" (
    "contenido" TEXT,
    "tipoMime" TEXT,
    "sha256" TEXT,
    "id" SERIAL NOT NULL,
    "proyectoId" INTEGER NOT NULL,
    "hitoId" INTEGER,
    "urlArchivo" TEXT NOT NULL,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "latitudExif" DOUBLE PRECISION,
    "longitudExif" DOUBLE PRECISION,
    "latitudDispositivo" DOUBLE PRECISION,
    "longitudDispositivo" DOUBLE PRECISION,
    "precisionDispositivoMetros" DOUBLE PRECISION,
    "municipioExif" TEXT,
    "municipioDispositivo" TEXT,
    "fuenteUbicacion" TEXT,
    "validacionUbicacion" TEXT,
    "descripcion" TEXT,
    "fechaCaptura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cargadoPorId" INTEGER,

    CONSTRAINT "EvidenciaProyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TareaARC" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "prioridad" TEXT NOT NULL DEFAULT 'Media',
    "estado" TEXT NOT NULL DEFAULT 'Pendiente',
    "municipio" TEXT DEFAULT 'Regional',
    "responsable" TEXT NOT NULL,
    "responsableId" INTEGER,
    "fechaLimite" TIMESTAMP(3) NOT NULL,
    "fechaFinalizada" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TareaARC_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransaccionFinanciera" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "cuentaBancaria" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "municipio" TEXT,
    "monto" DOUBLE PRECISION NOT NULL,
    "comprobanteTipo" TEXT NOT NULL,
    "comprobanteNumero" TEXT NOT NULL,
    "urlComprobante" TEXT,
    "descripcion" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransaccionFinanciera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActaAsamblea" (
    "id" SERIAL NOT NULL,
    "numeroActa" TEXT NOT NULL,
    "numeroSesion" INTEGER NOT NULL,
    "tipoSesion" TEXT NOT NULL DEFAULT 'Ordinaria',
    "fecha" TIMESTAMP(3) NOT NULL,
    "municipioSede" TEXT NOT NULL,
    "lugarReunion" TEXT,
    "libroCGCFolio" TEXT NOT NULL,
    "urlPdfEscaneado" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActaAsamblea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcuerdoGobernanza" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "actaId" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "responsable" TEXT NOT NULL,
    "fechaCumplimiento" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'En Proceso',
    "evidenciaUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcuerdoGobernanza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConvenioInstitucional" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipoOrganizacion" TEXT NOT NULL,
    "entidadCooperante" TEXT NOT NULL,
    "montoCooperacion" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contrapartidaMFN" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fechaSuscripcion" TIMESTAMP(3) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Vigente',
    "urlDocumento" TEXT,
    "coordinadorMFN" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConvenioInstitucional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CensoComunitarioASH" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "comunidad" TEXT NOT NULL,
    "viviendasTotales" INTEGER NOT NULL,
    "viviendasConAgua" INTEGER NOT NULL,
    "sistemaCloracion" BOOLEAN NOT NULL DEFAULT false,
    "ppmCloroResidual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "viviendasConSaneamiento" INTEGER NOT NULL,
    "fechaLevantamiento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tecnicoResponsable" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CensoComunitarioASH_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicacionTransparencia" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "resumen" TEXT NOT NULL,
    "mediaRef" TEXT,
    "referenciaId" INTEGER,
    "visibilidad" BOOLEAN NOT NULL DEFAULT true,
    "fechaPublicacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autorizadoPor" TEXT NOT NULL DEFAULT 'Gerencia Ejecutiva',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicacionTransparencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecuperacionClave" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expira" TIMESTAMP(3) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RecuperacionClave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PuntoControlIntegridad" (
    "id" SERIAL NOT NULL,
    "rootHash" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "auditoriaId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PuntoControlIntegridad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvidenciaProyecto_hitoId_idx" ON "EvidenciaProyecto"("hitoId");

-- CreateIndex
CREATE UNIQUE INDEX "TareaARC_codigo_key" ON "TareaARC"("codigo");

-- CreateIndex
CREATE INDEX "TareaARC_responsableId_idx" ON "TareaARC"("responsableId");

-- CreateIndex
CREATE UNIQUE INDEX "TransaccionFinanciera_codigo_key" ON "TransaccionFinanciera"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ActaAsamblea_numeroActa_key" ON "ActaAsamblea"("numeroActa");

-- CreateIndex
CREATE UNIQUE INDEX "AcuerdoGobernanza_codigo_key" ON "AcuerdoGobernanza"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ConvenioInstitucional_codigo_key" ON "ConvenioInstitucional"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "CensoComunitarioASH_codigo_key" ON "CensoComunitarioASH"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "PublicacionTransparencia_codigo_key" ON "PublicacionTransparencia"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "RecuperacionClave_tokenHash_key" ON "RecuperacionClave"("tokenHash");

-- AddForeignKey
ALTER TABLE "UsuarioMunicipio" ADD CONSTRAINT "UsuarioMunicipio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HitoProyecto" ADD CONSTRAINT "HitoProyecto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenciaProyecto" ADD CONSTRAINT "EvidenciaProyecto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenciaProyecto" ADD CONSTRAINT "EvidenciaProyecto_hitoId_fkey" FOREIGN KEY ("hitoId") REFERENCES "HitoProyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TareaARC" ADD CONSTRAINT "TareaARC_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcuerdoGobernanza" ADD CONSTRAINT "AcuerdoGobernanza_actaId_fkey" FOREIGN KEY ("actaId") REFERENCES "ActaAsamblea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecuperacionClave" ADD CONSTRAINT "RecuperacionClave_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Evita exposición accidental mediante roles de acceso directo a PostgreSQL.
-- El rol propietario utilizado por el backend omite estas políticas: la
-- autorización por cuenta y municipio se aplica en la API.
ALTER TABLE "UnidadOrganizacional" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Puesto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Colaborador" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Rol" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Usuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UsuarioMunicipio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RateLimitBucket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Convocatoria" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Candidato" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contrato" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvaluacionDesempeno" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvaluacionFactor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlanMejora" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SolicitudAusencia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SaldoVacaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FaltaDisciplinaria" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Sancion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Capacitacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CertificacionCapacitacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BitacoraAuditoria" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Proyecto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HitoProyecto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvidenciaProyecto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TareaARC" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TransaccionFinanciera" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActaAsamblea" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AcuerdoGobernanza" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConvenioInstitucional" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CensoComunitarioASH" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PublicacionTransparencia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecuperacionClave" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PuntoControlIntegridad" ENABLE ROW LEVEL SECURITY;

COMMIT;
