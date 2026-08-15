import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { logAction } from '../lib/audit.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const colaboradores = await prisma.colaborador.findMany({
    include: { puesto: true },
    orderBy: { nombre: 'asc' },
  });
  res.json(colaboradores);
});

router.get('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const colaborador = await prisma.colaborador.findUnique({
    where: { id },
    include: {
      puesto: true,
      evaluaciones: { include: { factores: true, planMejora: true }, orderBy: { createdAt: 'desc' } },
      ausencias: { orderBy: { createdAt: 'desc' } },
      saldosVacaciones: true,
      faltas: { include: { sancion: true } },
      certificaciones: { include: { capacitacion: true } },
    },
  });
  if (!colaborador) return res.status(404).json({ error: 'Colaborador no encontrado' });
  res.json(colaborador);
});

router.post('/', requireAuth, requirePermission('estructura', 'editar'), async (req, res) => {
  const { nombre, dpi, puestoId, fechaIngreso, tipoContrato } = req.body;
  if (!nombre || !puestoId || !fechaIngreso) return res.status(400).json({ error: 'nombre, puestoId y fechaIngreso son requeridos' });
  const colaborador = await prisma.colaborador.create({
    data: { nombre, dpi: dpi || null, puestoId: Number(puestoId), fechaIngreso: new Date(fechaIngreso), tipoContrato: tipoContrato || null },
  });
  await prisma.saldoVacaciones.create({
    data: { colaboradorId: colaborador.id, anio: new Date().getFullYear(), diasDisponibles: 20, diasUsados: 0 },
  });
  await logAction(req.user.sub, 'crear', 'colaborador', colaborador.id);
  res.status(201).json(colaborador);
});

export default router;
