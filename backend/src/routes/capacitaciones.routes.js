import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { logAction } from '../lib/audit.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const capacitaciones = await prisma.capacitacion.findMany({
    include: { certificaciones: { include: { colaborador: true } } },
    orderBy: { id: 'asc' },
  });
  const totalColaboradores = await prisma.colaborador.count({ where: { estado: 'Activo' } });
  res.json(capacitaciones.map((c) => ({
    ...c,
    cobertura: c.certificaciones.filter((x) => x.firmado).length,
    totalColaboradores,
  })));
});

router.post('/', requireAuth, requirePermission('capacitacion', 'editar'), async (req, res) => {
  const { nombreHerramienta, fecha } = req.body;
  if (!nombreHerramienta) return res.status(400).json({ error: 'nombreHerramienta es requerido' });
  const capacitacion = await prisma.capacitacion.create({
    data: { nombreHerramienta, fecha: fecha ? new Date(fecha) : null, convocadaPorId: req.user.colaboradorId || null },
  });
  await logAction(req.user.sub, 'crear', 'capacitacion', capacitacion.id);
  res.status(201).json(capacitacion);
});

// RF-30: certificación firmada por colaborador y por documento.
router.post('/:id/certificar', requireAuth, requirePermission('capacitacion', 'editar'), async (req, res) => {
  const capacitacionId = Number(req.params.id);
  const { colaboradorId } = req.body;
  if (!colaboradorId) return res.status(400).json({ error: 'colaboradorId es requerido' });
  const cert = await prisma.certificacionCapacitacion.upsert({
    where: { capacitacionId_colaboradorId: { capacitacionId, colaboradorId: Number(colaboradorId) } },
    update: { firmado: true, fecha: new Date() },
    create: { capacitacionId, colaboradorId: Number(colaboradorId), firmado: true, fecha: new Date() },
  });
  await logAction(req.user.sub, 'certificar', 'capacitacion', capacitacionId);
  res.status(201).json(cert);
});

export default router;
