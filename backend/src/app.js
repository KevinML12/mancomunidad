import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { DocumentServiceError } from './services/documents.js';
import { ValidationError } from './services/errors.js';
import { allowedClientOrigins } from './lib/cors-policy.js';

import identityRoutes from './modules/identity/index.js';
import institutionalRoutes from './modules/institutional/index.js';
import personnelRoutes from './modules/personnel/index.js';
import adminRoutes from './modules/admin/index.js';

const app = express();
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});
if (process.env.NODE_ENV === 'production') {
  app.use((_req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
    next();
  });
}

// CLIENT_URL admite una o varias URLs separadas por coma (dev local +
// frontend desplegado en Vercel al mismo tiempo).
const allowedOrigins = allowedClientOrigins([process.env.CLIENT_URL, process.env.ADMIN_CLIENT_URL].filter(Boolean).join(','), process.env.NODE_ENV);
app.use((req, res, next) => {
  const origin = req.get('origin');
  if (origin && !allowedOrigins.has(origin) && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return res.status(403).json({ error: 'Origen no permitido' });
  }
  next();
});
app.use(cors({
  origin: (origin, callback) => callback(null, origin && allowedOrigins.has(origin) ? origin : false),
  credentials: true,
  allowedHeaders: ['Authorization', 'Content-Type'],
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
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

app.use('/api/v1', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
}, identityRoutes, institutionalRoutes, personnelRoutes);
app.use('/api/v1/admin', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
}, adminRoutes);

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof DocumentServiceError) return res.status(err.status).json({error:err.message});
  if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
  if (err?.code === 'P2025') return res.status(404).json({ error: 'Registro no encontrado' });
  if (err?.code === 'P2002') return res.status(409).json({ error: 'El registro ya existe. Actualice la lista antes de reintentar.' });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

export default app;
