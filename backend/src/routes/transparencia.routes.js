import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/transparencia/publico - Acceso público ciudadano libre (RF5, sin autenticación)
router.get('/publico', async (req, res, next) => {
  try {
    const publicaciones = await prisma.publicacionTransparencia.findMany({
      where: { visibilidad: true },
      orderBy: { fechaPublicacion: 'desc' }
    });

    const proyectosPublicos = await prisma.proyecto.findMany({
      where: { estado: { not: 'Cancelado' } },
      select: {
        id: true,
        nombre: true,
        agenciaFinanciadora: true,
        presupuestoMunicipal: true,
        presupuestoCooperacion: true,
        estado: true,
        porcentajeAvanceFisico: true,
        createdAt: true
      }
    });

    res.json({
      portal: 'Portal de Transparencia y Datos Abiertos · Mancomunidad Frontera del Norte',
      marcoLegal: 'Ley de Acceso a la Información Pública (Decreto 57-2008)',
      publicaciones,
      proyectosPublicos
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/transparencia/gestion - Control interno para rol de Gerente (RF5)
router.get('/gestion', requireAuth, async (req, res, next) => {
  try {
    const publicaciones = await prisma.publicacionTransparencia.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(publicaciones);
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/transparencia/:id/visibilidad - Habilitar o dar de baja publicación (RF5)
router.put('/:id/visibilidad', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { visibilidad } = req.body;

    const updated = await prisma.publicacionTransparencia.update({
      where: { id },
      data: { visibilidad: Boolean(visibilidad) }
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/transparencia - Publicar nuevo contenido al portal ciudadano
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { tipo, titulo, resumen, referenciaId } = req.body;

    const count = await prisma.publicacionTransparencia.count();
    const codigo = `PUB-2024-${(count + 1).toString().padStart(3, '0')}`;

    const nueva = await prisma.publicacionTransparencia.create({
      data: {
        codigo,
        tipo,
        titulo,
        resumen,
        referenciaId: referenciaId ? Number(referenciaId) : null,
        visibilidad: true,
        autorizadoPor: req.user?.nombre || 'Gerencia Ejecutiva'
      }
    });

    res.status(201).json(nueva);
  } catch (err) {
    next(err);
  }
});

export default router;
