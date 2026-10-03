import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import puestosRoutes from './routes/puestos.routes.js';
import colaboradoresRoutes from './routes/colaboradores.routes.js';
import convocatoriasRoutes from './routes/convocatorias.routes.js';
import evaluacionesRoutes from './routes/evaluaciones.routes.js';
import ausenciasRoutes from './routes/ausencias.routes.js';
import disciplinaRoutes from './routes/disciplina.routes.js';
import capacitacionesRoutes from './routes/capacitaciones.routes.js';
import proyectosRoutes from './routes/proyectos.routes.js';
import arcRoutes from './routes/arc.routes.js';
import financieroRoutes from './routes/financiero.routes.js';
import gobernanzaRoutes from './routes/gobernanza.routes.js';
import conveniosRoutes from './routes/convenios.routes.js';
import estadisticasRoutes from './routes/estadisticas.routes.js';
import transparenciaRoutes from './routes/transparencia.routes.js';
import inteligenciaRoutes from './routes/inteligencia.routes.js';
import prisma from './lib/prisma.js';

const app = express();

// CLIENT_URL admite una o varias URLs separadas por coma (dev local +
// frontend desplegado en Vercel al mismo tiempo).
const allowedOrigins = (process.env.CLIENT_URL || '*').split(',').map((s) => s.trim());
app.use(cors({
  origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
}));
app.use(express.json({ limit: '8mb' }));
app.use(morgan('dev'));

app.get('/', (req, res) => res.json({
  ok: true,
  name: 'MFN Digital API',
  version: '1.0.0',
  health: '/api/v1/health'
}));
import { ROLE_PERMISSIONS } from './lib/roles.js';

app.get('/health', (req, res) => res.json({ ok: true, service: 'mfn-digital-backend' }));
app.get('/api/v1/health', (req, res) => res.json({ ok: true, service: 'mfn-digital-backend' }));

app.post('/api/v1/sistema/migrar', async (req, res) => {
  if (req.headers['x-admin-key'] !== (process.env.ADMIN_MIGRATE_KEY || 'mfn-super-migration-2026')) {
    return res.status(403).json({ error: 'Acceso no autorizado' });
  }
  try {
    const results = [];
    
    // Set search_path to mancomunidad
    await prisma.$executeRawUnsafe(`SET search_path TO mancomunidad, public;`);
    
    await prisma.$executeRawUnsafe(`ALTER TABLE "mancomunidad"."Usuario" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;`);
    results.push('Usuario.sessionVersion asegurada');

    await prisma.$executeRawUnsafe(`ALTER TABLE "mancomunidad"."BitacoraAuditoria" ADD COLUMN IF NOT EXISTS "antesHash" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "mancomunidad"."BitacoraAuditoria" ADD COLUMN IF NOT EXISTS "despuesHash" TEXT;`);
    results.push('BitacoraAuditoria hashes asegurados');

    await prisma.$executeRawUnsafe(`ALTER TABLE "mancomunidad"."Proyecto" ADD COLUMN IF NOT EXISTS "municipio" TEXT;`);
    results.push('Proyecto.municipio asegurado');

    await prisma.$executeRawUnsafe(`ALTER TABLE "mancomunidad"."EvidenciaProyecto" ADD COLUMN IF NOT EXISTS "contenido" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "mancomunidad"."EvidenciaProyecto" ADD COLUMN IF NOT EXISTS "sha256" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "mancomunidad"."EvidenciaProyecto" ADD COLUMN IF NOT EXISTS "tipoMime" TEXT;`);
    results.push('EvidenciaProyecto columnas aseguradas');

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "mancomunidad"."RecuperacionClave" (
        "id" SERIAL NOT NULL,
        "usuarioId" INTEGER NOT NULL,
        "tokenHash" TEXT NOT NULL,
        "expira" TIMESTAMP(3) NOT NULL,
        "usado" BOOLEAN NOT NULL DEFAULT false,
        CONSTRAINT "RecuperacionClave_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "RecuperacionClave_tokenHash_key" UNIQUE ("tokenHash"),
        CONSTRAINT "RecuperacionClave_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "mancomunidad"."Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);
    results.push('Tabla RecuperacionClave asegurada');

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "mancomunidad"."PuntoControlIntegridad" (
        "id" SERIAL NOT NULL,
        "rootHash" TEXT NOT NULL,
        "snapshot" JSONB NOT NULL,
        "auditoriaId" INTEGER NOT NULL,
        "usuarioId" INTEGER NOT NULL,
        "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PuntoControlIntegridad_pkey" PRIMARY KEY ("id")
      );
    `);
    results.push('Tabla PuntoControlIntegridad asegurada');

    for (const [codigo, permisos] of Object.entries(ROLE_PERMISSIONS)) {
      await prisma.rol.updateMany({ where: { codigo }, data: { permisos } });
    }
    results.push('Permisos de roles actualizados');

    res.json({ ok: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/puestos', puestosRoutes);
app.use('/api/v1/colaboradores', colaboradoresRoutes);
app.use('/api/v1/convocatorias', convocatoriasRoutes);
app.use('/api/v1/evaluaciones', evaluacionesRoutes);
app.use('/api/v1/ausencias', ausenciasRoutes);
app.use('/api/v1/disciplina', disciplinaRoutes);
app.use('/api/v1/capacitaciones', capacitacionesRoutes);
app.use('/api/v1/proyectos', proyectosRoutes);
app.use('/api/v1/arc', arcRoutes);
app.use('/api/v1/financiero', financieroRoutes);
app.use('/api/v1/gobernanza', gobernanzaRoutes);
app.use('/api/v1/convenios', conveniosRoutes);
app.use('/api/v1/estadisticas', estadisticasRoutes);
app.use('/api/v1/transparencia', transparenciaRoutes);
app.use('/api/v1/inteligencia', inteligenciaRoutes);

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

export default app;
