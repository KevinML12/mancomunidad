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
app.get('/health', (req, res) => res.json({ ok: true, service: 'mfn-digital-backend' }));
app.get('/api/v1/health', (req, res) => res.json({ ok: true, service: 'mfn-digital-backend' }));

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
