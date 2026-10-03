import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { logAction } from '../lib/audit.js';

const router = Router();
router.use(requireAuth, requirePermission('estructura'));

// RF-01
router.get('/', async (req, res) => {
  const puestos = await prisma.puesto.findMany({
    include: { unidad: true, jefeInmediato: true, _count: { select: { colaboradores: true } } },
    orderBy: { id: 'asc' },
  });
  res.json(puestos);
});

router.post('/', requirePermission('estructura', 'editar'), async (req, res) => {
  const { nombre, categoria, formaPago, unidadId, jefeInmediatoId } = req.body;
  if (!nombre || !categoria) return res.status(400).json({ error: 'nombre y categoria son requeridos' });
  const puesto = await prisma.puesto.create({
    data: { nombre, categoria, formaPago: formaPago || 'Mensual', unidadId: unidadId || null, jefeInmediatoId: jefeInmediatoId || null },
  });
  await logAction(req.user.sub, 'crear', 'puesto', puesto.id);
  res.status(201).json(puesto);
});

router.put('/:id', requirePermission('estructura', 'editar'), async (req, res) => {
  const id = Number(req.params.id);
  const { nombre, categoria, formaPago, unidadId, jefeInmediatoId } = req.body;
  const puesto = await prisma.puesto.update({
    where: { id },
    data: { nombre, categoria, formaPago, unidadId: unidadId ?? undefined, jefeInmediatoId: jefeInmediatoId ?? undefined },
  });
  await logAction(req.user.sub, 'editar', 'puesto', id);
  res.json(puesto);
});

export default router;
