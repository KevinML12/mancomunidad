-- Solo para una base nueva de MFN, previamente identificada. No contiene datos ficticios.
BEGIN;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "UnidadOrganizacional" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "unidadPadreId" INTEGER,

    CONSTRAINT "UnidadOrganizacional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Puesto" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "formaPago" TEXT NOT NULL DEFAULT 'Mensual',
    "unidadId" INTEGER,
    "jefeInmediatoId" INTEGER,

    CONSTRAINT "Puesto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Colaborador" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "dpi" TEXT,
    "puestoId" INTEGER NOT NULL,
    "fechaIngreso" TIMESTAMP(3) NOT NULL,
    "tipoContrato" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Colaborador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rol" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "permisos" JSONB NOT NULL,

    CONSTRAINT "Rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "correo" TEXT NOT NULL,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "hashContrasena" TEXT NOT NULL,
    "rolId" INTEGER NOT NULL,
    "colaboradorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Convocatoria" (
    "id" SERIAL NOT NULL,
    "puestoId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "fechaPublicacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaCierre" TIMESTAMP(3) NOT NULL,
    "requisitos" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Abierta',

    CONSTRAINT "Convocatoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidato" (
    "id" SERIAL NOT NULL,
    "convocatoriaId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "expedienteCompleto" BOOLEAN NOT NULL DEFAULT false,
    "puntajeCompetencias" DOUBLE PRECISION,
    "puntajeExperiencia" DOUBLE PRECISION,
    "puntajeEntrevista" DOUBLE PRECISION,
    "puntajeReferencias" DOUBLE PRECISION,
    "puntajeTotal" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Candidato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contrato" (
    "id" SERIAL NOT NULL,
    "colaboradorId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "fechaRegistroContraloria" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluacionDesempeno" (
    "id" SERIAL NOT NULL,
    "colaboradorId" INTEGER NOT NULL,
    "evaluadorId" INTEGER NOT NULL,
    "periodo" TEXT NOT NULL,
    "resultado" TEXT,
    "fecha" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluacionDesempeno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluacionFactor" (
    "id" SERIAL NOT NULL,
    "evaluacionId" INTEGER NOT NULL,
    "factor" INTEGER NOT NULL,
    "nombreFactor" TEXT NOT NULL,
    "calificacion" TEXT,

    CONSTRAINT "EvaluacionFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanMejora" (
    "id" SERIAL NOT NULL,
    "evaluacionId" INTEGER NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaLimite" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Activo',

    CONSTRAINT "PlanMejora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudAusencia" (
    "id" SERIAL NOT NULL,
    "colaboradorId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "desde" TIMESTAMP(3) NOT NULL,
    "hasta" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Pendiente',
    "aprobadorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitudAusencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaldoVacaciones" (
    "id" SERIAL NOT NULL,
    "colaboradorId" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "diasDisponibles" INTEGER NOT NULL,
    "diasUsados" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SaldoVacaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaltaDisciplinaria" (
    "id" SERIAL NOT NULL,
    "colaboradorId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registradoPorId" INTEGER,

    CONSTRAINT "FaltaDisciplinaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sancion" (
    "id" SERIAL NOT NULL,
    "faltaId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "fechaAudiencia" TIMESTAMP(3),
    "resultado" TEXT,
    "resueltoPorId" INTEGER,

    CONSTRAINT "Sancion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Capacitacion" (
    "id" SERIAL NOT NULL,
    "nombreHerramienta" TEXT NOT NULL,
    "fecha" TIMESTAMP(3),
    "convocadaPorId" INTEGER,

    CONSTRAINT "Capacitacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificacionCapacitacion" (
    "id" SERIAL NOT NULL,
    "capacitacionId" INTEGER NOT NULL,
    "colaboradorId" INTEGER NOT NULL,
    "firmado" BOOLEAN NOT NULL DEFAULT false,
    "fecha" TIMESTAMP(3),

    CONSTRAINT "CertificacionCapacitacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BitacoraAuditoria" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER,
    "accion" TEXT NOT NULL,
    "entidad" TEXT,
    "entidadId" INTEGER,
    "antesHash" TEXT,
    "despuesHash" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BitacoraAuditoria_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "EvidenciaProyecto" (
    "contenido" TEXT,
    "tipoMime" TEXT,
    "sha256" TEXT,
    "id" SERIAL NOT NULL,
    "proyectoId" INTEGER NOT NULL,
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
CREATE UNIQUE INDEX "Colaborador_dpi_key" ON "Colaborador"("dpi");

-- CreateIndex
CREATE UNIQUE INDEX "Rol_codigo_key" ON "Rol"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_correo_key" ON "Usuario"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_colaboradorId_key" ON "Usuario"("colaboradorId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanMejora_evaluacionId_key" ON "PlanMejora"("evaluacionId");

-- CreateIndex
CREATE UNIQUE INDEX "SaldoVacaciones_colaboradorId_anio_key" ON "SaldoVacaciones"("colaboradorId", "anio");

-- CreateIndex
CREATE UNIQUE INDEX "Sancion_faltaId_key" ON "Sancion"("faltaId");

-- CreateIndex
CREATE UNIQUE INDEX "CertificacionCapacitacion_capacitacionId_colaboradorId_key" ON "CertificacionCapacitacion"("capacitacionId", "colaboradorId");

-- CreateIndex
CREATE UNIQUE INDEX "TareaARC_codigo_key" ON "TareaARC"("codigo");

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
ALTER TABLE "UnidadOrganizacional" ADD CONSTRAINT "UnidadOrganizacional_unidadPadreId_fkey" FOREIGN KEY ("unidadPadreId") REFERENCES "UnidadOrganizacional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Puesto" ADD CONSTRAINT "Puesto_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "UnidadOrganizacional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Puesto" ADD CONSTRAINT "Puesto_jefeInmediatoId_fkey" FOREIGN KEY ("jefeInmediatoId") REFERENCES "Puesto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Colaborador" ADD CONSTRAINT "Colaborador_puestoId_fkey" FOREIGN KEY ("puestoId") REFERENCES "Puesto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "Rol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Convocatoria" ADD CONSTRAINT "Convocatoria_puestoId_fkey" FOREIGN KEY ("puestoId") REFERENCES "Puesto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidato" ADD CONSTRAINT "Candidato_convocatoriaId_fkey" FOREIGN KEY ("convocatoriaId") REFERENCES "Convocatoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluacionDesempeno" ADD CONSTRAINT "EvaluacionDesempeno_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluacionDesempeno" ADD CONSTRAINT "EvaluacionDesempeno_evaluadorId_fkey" FOREIGN KEY ("evaluadorId") REFERENCES "Colaborador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluacionFactor" ADD CONSTRAINT "EvaluacionFactor_evaluacionId_fkey" FOREIGN KEY ("evaluacionId") REFERENCES "EvaluacionDesempeno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanMejora" ADD CONSTRAINT "PlanMejora_evaluacionId_fkey" FOREIGN KEY ("evaluacionId") REFERENCES "EvaluacionDesempeno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudAusencia" ADD CONSTRAINT "SolicitudAusencia_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaldoVacaciones" ADD CONSTRAINT "SaldoVacaciones_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaltaDisciplinaria" ADD CONSTRAINT "FaltaDisciplinaria_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sancion" ADD CONSTRAINT "Sancion_faltaId_fkey" FOREIGN KEY ("faltaId") REFERENCES "FaltaDisciplinaria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificacionCapacitacion" ADD CONSTRAINT "CertificacionCapacitacion_capacitacionId_fkey" FOREIGN KEY ("capacitacionId") REFERENCES "Capacitacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificacionCapacitacion" ADD CONSTRAINT "CertificacionCapacitacion_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BitacoraAuditoria" ADD CONSTRAINT "BitacoraAuditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenciaProyecto" ADD CONSTRAINT "EvidenciaProyecto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcuerdoGobernanza" ADD CONSTRAINT "AcuerdoGobernanza_actaId_fkey" FOREIGN KEY ("actaId") REFERENCES "ActaAsamblea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecuperacionClave" ADD CONSTRAINT "RecuperacionClave_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Las tablas privadas no deben exponerse mediante la API REST de Supabase.
ALTER TABLE "UnidadOrganizacional" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Puesto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Colaborador" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Rol" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Usuario" ENABLE ROW LEVEL SECURITY;
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

CREATE TABLE public."RateLimitBucket" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "count" INTEGER NOT NULL,
    "untilMs" BIGINT NOT NULL
);
ALTER TABLE public."RateLimitBucket" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."SchemaVersion" (
    "version" TEXT PRIMARY KEY,
    "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public."SchemaVersion" ENABLE ROW LEVEL SECURITY;
INSERT INTO public."SchemaVersion" ("version") VALUES ('2026-10-15-release');

CREATE TABLE public."UsuarioMunicipio" (
    "usuarioId" INTEGER NOT NULL,
    "municipio" TEXT NOT NULL,
    CONSTRAINT "UsuarioMunicipio_pkey" PRIMARY KEY ("usuarioId", "municipio"),
    CONSTRAINT "UsuarioMunicipio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES public."Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
ALTER TABLE public."UsuarioMunicipio" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."HitoProyecto" (
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
ALTER TABLE public."EvidenciaProyecto" ADD COLUMN "hitoId" INTEGER;
CREATE INDEX "EvidenciaProyecto_hitoId_idx" ON public."EvidenciaProyecto"("hitoId");
ALTER TABLE public."EvidenciaProyecto" ADD CONSTRAINT "EvidenciaProyecto_hitoId_fkey" FOREIGN KEY ("hitoId") REFERENCES public."HitoProyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "TareaARC_responsableId_idx" ON public."TareaARC"("responsableId");
ALTER TABLE public."TareaARC" ADD CONSTRAINT "TareaARC_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES public."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION public.mfn_prevent_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'La bitácora y los puntos de control solo admiten inserciones';
END $$;
CREATE TRIGGER mfn_audit_append_only BEFORE UPDATE OR DELETE ON public."BitacoraAuditoria"
  FOR EACH ROW EXECUTE FUNCTION public.mfn_prevent_audit_mutation();
CREATE TRIGGER mfn_checkpoint_append_only BEFORE UPDATE OR DELETE ON public."PuntoControlIntegridad"
  FOR EACH ROW EXECUTE FUNCTION public.mfn_prevent_audit_mutation();

COMMIT;
