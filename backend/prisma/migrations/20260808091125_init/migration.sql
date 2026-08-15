-- CreateTable
CREATE TABLE "UnidadOrganizacional" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "unidadPadreId" INTEGER,
    CONSTRAINT "UnidadOrganizacional_unidadPadreId_fkey" FOREIGN KEY ("unidadPadreId") REFERENCES "UnidadOrganizacional" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Puesto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "formaPago" TEXT NOT NULL DEFAULT 'Mensual',
    "unidadId" INTEGER,
    "jefeInmediatoId" INTEGER,
    CONSTRAINT "Puesto_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "UnidadOrganizacional" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Puesto_jefeInmediatoId_fkey" FOREIGN KEY ("jefeInmediatoId") REFERENCES "Puesto" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Colaborador" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "dpi" TEXT,
    "puestoId" INTEGER NOT NULL,
    "fechaIngreso" DATETIME NOT NULL,
    "tipoContrato" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Colaborador_puestoId_fkey" FOREIGN KEY ("puestoId") REFERENCES "Puesto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "correo" TEXT NOT NULL,
    "hashContrasena" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "colaboradorId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Usuario_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Convocatoria" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "puestoId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "fechaPublicacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaCierre" DATETIME NOT NULL,
    "requisitos" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Abierta',
    CONSTRAINT "Convocatoria_puestoId_fkey" FOREIGN KEY ("puestoId") REFERENCES "Puesto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Candidato" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "convocatoriaId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "expedienteCompleto" BOOLEAN NOT NULL DEFAULT false,
    "puntajeCompetencias" REAL,
    "puntajeExperiencia" REAL,
    "puntajeEntrevista" REAL,
    "puntajeReferencias" REAL,
    "puntajeTotal" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Candidato_convocatoriaId_fkey" FOREIGN KEY ("convocatoriaId") REFERENCES "Convocatoria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contrato" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "colaboradorId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "fechaInicio" DATETIME NOT NULL,
    "fechaFin" DATETIME,
    "fechaRegistroContraloria" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Contrato_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvaluacionDesempeno" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "colaboradorId" INTEGER NOT NULL,
    "evaluadorId" INTEGER NOT NULL,
    "periodo" TEXT NOT NULL,
    "resultado" TEXT,
    "fecha" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EvaluacionDesempeno_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EvaluacionDesempeno_evaluadorId_fkey" FOREIGN KEY ("evaluadorId") REFERENCES "Colaborador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvaluacionFactor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "evaluacionId" INTEGER NOT NULL,
    "factor" INTEGER NOT NULL,
    "nombreFactor" TEXT NOT NULL,
    "calificacion" TEXT,
    CONSTRAINT "EvaluacionFactor_evaluacionId_fkey" FOREIGN KEY ("evaluacionId") REFERENCES "EvaluacionDesempeno" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlanMejora" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "evaluacionId" INTEGER NOT NULL,
    "fechaInicio" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaLimite" DATETIME NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    CONSTRAINT "PlanMejora_evaluacionId_fkey" FOREIGN KEY ("evaluacionId") REFERENCES "EvaluacionDesempeno" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SolicitudAusencia" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "colaboradorId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "desde" DATETIME NOT NULL,
    "hasta" DATETIME NOT NULL,
    "motivo" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Pendiente',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SolicitudAusencia_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SaldoVacaciones" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "colaboradorId" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "diasDisponibles" INTEGER NOT NULL,
    "diasUsados" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SaldoVacaciones_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FaltaDisciplinaria" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "colaboradorId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registradoPorId" INTEGER,
    CONSTRAINT "FaltaDisciplinaria_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sancion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "faltaId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "fechaAudiencia" DATETIME,
    "resultado" TEXT,
    CONSTRAINT "Sancion_faltaId_fkey" FOREIGN KEY ("faltaId") REFERENCES "FaltaDisciplinaria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Capacitacion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombreHerramienta" TEXT NOT NULL,
    "fecha" DATETIME,
    "convocadaPorId" INTEGER
);

-- CreateTable
CREATE TABLE "CertificacionCapacitacion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "capacitacionId" INTEGER NOT NULL,
    "colaboradorId" INTEGER NOT NULL,
    "firmado" BOOLEAN NOT NULL DEFAULT false,
    "fecha" DATETIME,
    CONSTRAINT "CertificacionCapacitacion_capacitacionId_fkey" FOREIGN KEY ("capacitacionId") REFERENCES "Capacitacion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CertificacionCapacitacion_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BitacoraAuditoria" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usuarioId" INTEGER,
    "accion" TEXT NOT NULL,
    "entidad" TEXT,
    "entidadId" INTEGER,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BitacoraAuditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Colaborador_dpi_key" ON "Colaborador"("dpi");

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
