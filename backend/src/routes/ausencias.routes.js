import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { logAction } from '../lib/audit.js';
import { colaboradoresVisiblesPara } from '../lib/scope.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const scope = await colaboradoresVisiblesPara(req.user);
  const solicitudes = await prisma.solicitudAusencia.findMany({
    where: scope ? { colaboradorId: { in: scope } } : undefined,
    include: { colaborador: { include: { puesto: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(solicitudes);
});

router.get('/saldo/:colaboradorId', requireAuth, async (req, res) => {
  const colaboradorId = Number(req.params.colaboradorId);
  const anio = new Date().getFullYear();
  const saldo = await prisma.saldoVacaciones.findUnique({ where: { colaboradorId_anio: { colaboradorId, anio } } });
  res.json(saldo || { colaboradorId, anio, diasDisponibles: 0, diasUsados: 0 });
});

// RF-20/23: valida saldo antes de aceptar la solicitud de vacaciones.
router.post('/', requireAuth, async (req, res) => {
  const { colaboradorId, tipo, desde, hasta, motivo } = req.body;
  if (!colaboradorId || !tipo || !desde || !hasta) return res.status(400).json({ error: 'colaboradorId, tipo, desde y hasta son requeridos' });

  if (tipo === 'Vacaciones') {
    const anio = new Date().getFullYear();
    const saldo = await prisma.saldoVacaciones.findUnique({ where: { colaboradorId_anio: { colaboradorId: Number(colaboradorId), anio } } });
    const diasSolicitados = Math.round((new Date(hasta) - new Date(desde)) / 86_400_000) + 1;
    const disponibles = (saldo?.diasDisponibles || 0) - (saldo?.diasUsados || 0);
    if (!saldo || diasSolicitados > disponibles) {
      return res.status(400).json({ error: `Saldo insuficiente: disponibles ${disponibles}, solicitados ${diasSolicitados}` });
    }
  }

  const solicitud = await prisma.solicitudAusencia.create({
    data: { colaboradorId: Number(colaboradorId), tipo, desde: new Date(desde), hasta: new Date(hasta), motivo: motivo || null },
  });
  await logAction(req.user.sub, 'crear', 'solicitud_ausencia', solicitud.id);
  res.status(201).json(solicitud);
});

// RF-21: el jefe inmediato aprueba/rechaza.
router.put('/:id', requireAuth, requirePermission('ausencias', 'aprobar'), async (req, res) => {
  const id = Number(req.params.id);
  const { estado } = req.body;
  if (!['Aprobado', 'Rechazado'].includes(estado)) return res.status(400).json({ error: 'estado debe ser Aprobado o Rechazado' });

  const solicitud = await prisma.solicitudAusencia.update({
    where: { id },
    data: { estado, aprobadorId: req.user.colaboradorId || null },
  });

  if (estado === 'Aprobado' && solicitud.tipo === 'Vacaciones') {
    const anio = new Date().getFullYear();
    const dias = Math.round((solicitud.hasta - solicitud.desde) / 86_400_000) + 1;
    await prisma.saldoVacaciones.updateMany({
      where: { colaboradorId: solicitud.colaboradorId, anio },
      data: { diasUsados: { increment: dias } },
    });
  }

  await logAction(req.user.sub, `ausencia:${estado.toLowerCase()}`, 'solicitud_ausencia', id);
  res.json(solicitud);
});

export default router;
