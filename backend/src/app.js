import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import identityRoutes from './modules/identity.js';
import institutionalRoutes from './modules/institutional.js';
import personnelRoutes from './modules/personnel.js';

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

app.use('/api/v1', identityRoutes, institutionalRoutes, personnelRoutes);

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

export default app;
