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

const app = express();

// CLIENT_URL admite una o varias URLs separadas por coma (dev local +
// frontend desplegado en Vercel al mismo tiempo).
const allowedOrigins = (process.env.CLIENT_URL || '*').split(',').map((s) => s.trim());
app.use(cors({
  origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
}));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/v1/health', (req, res) => res.json({ ok: true, service: 'sirh-mfn-backend' }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/puestos', puestosRoutes);
app.use('/api/v1/colaboradores', colaboradoresRoutes);
app.use('/api/v1/convocatorias', convocatoriasRoutes);
app.use('/api/v1/evaluaciones', evaluacionesRoutes);
app.use('/api/v1/ausencias', ausenciasRoutes);
app.use('/api/v1/disciplina', disciplinaRoutes);
app.use('/api/v1/capacitaciones', capacitacionesRoutes);

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

export default app;
