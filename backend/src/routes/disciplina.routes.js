import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { logAction } from '../lib/audit.js';
import { colaboradoresVisiblesPara } from '../lib/scope.js';

const router = Router();

// RF-27: el expediente disciplinario solo es visible para RRHH, Gerencia,
// Junta Directiva, Auditoría Interna, y el jefe inmediato del colaborador.
router.get('/', requireAuth, async (req, res) => {
  const scope = await colaboradoresVisiblesPara(req.user);
  const faltas = await prisma.faltaDisciplinaria.findMany({
    where: scope ? { colaboradorId: { in: scope } } : undefined,
    include: { colaborador: true, sancion: true },
    orderBy: { fecha: 'desc' },
  });
  res.json(faltas);
});

// RF-24/25/26: registra la falta y escala la sanción según el conteo de
// amonestaciones del colaborador en el mes calendario vigente.
router.post('/', requireAuth, requirePermission('disciplina', 'editar'), async (req, res) => {
  const { colaboradorId, tipo, descripcion } = req.body;
  if (!colaboradorId || !tipo || !descripcion) return res.status(400).json({ error: 'colaboradorId, tipo y descripcion son requeridos' });

  const falta = await prisma.faltaDisciplinaria.create({
    data: { colaboradorId: Number(colaboradorId), tipo, descripcion, registradoPorId: req.user.colaboradorId || null },
  });

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  const faltasDelMes = await prisma.faltaDisciplinaria.count({
    where: { colaboradorId: Number(colaboradorId), fecha: { gte: inicioMes } },
  });

  let sancionTipo = 'Verbal';
  if (tipo === 'Grave' || faltasDelMes >= 4) sancionTipo = 'Suspension';
  else if (faltasDelMes >= 2) sancionTipo = 'Escrita';

  let sancion = null;
  if (sancionTipo === 'Suspension') {
    const fechaAudiencia = new Date();
    fechaAudiencia.setDate(fechaAudiencia.getDate() + 3); // 3 días hábiles (aprox.)
    sancion = await prisma.sancion.create({
      data: { faltaId: falta.id, tipo: sancionTipo, fechaAudiencia, resultado: 'Pendiente de audiencia' },
    });
  } else {
    sancion = await prisma.sancion.create({ data: { faltaId: falta.id, tipo: sancionTipo, resultado: 'Notificada' } });
  }

  await logAction(req.user.sub, 'crear', 'falta_disciplinaria', falta.id);
  res.status(201).json({ falta, sancion });
});

// RF-26: resolver audiencia de suspensión.
router.put('/sancion/:id', requireAuth, requirePermission('disciplina', 'aprobar'), async (req, res) => {
  const id = Number(req.params.id);
  const { resultado } = req.body;
  const sancion = await prisma.sancion.update({
    where: { id },
    data: { resultado, resueltoPorId: req.user.colaboradorId || null },
  });
  await logAction(req.user.sub, 'resolver', 'sancion', id);
  res.json(sancion);
});

export default router;
