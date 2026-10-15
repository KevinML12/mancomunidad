import { Router } from 'express';
import prisma from '../../lib/prisma.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { logAction } from '../../lib/audit.js';
import { colaboradoresVisiblesPara } from '../../lib/scope.js';

const router = Router();
router.use(requireAuth, requirePermission('ausencias'));

router.get('/', async (req, res) => {
  const scope = await colaboradoresVisiblesPara(req.user);
  const solicitudes = await prisma.solicitudAusencia.findMany({
    where: scope ? { colaboradorId: { in: scope } } : undefined,
    include: { colaborador: { include: { puesto: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(solicitudes);
});

router.get('/saldo/:colaboradorId', async (req, res) => {
  const colaboradorId = Number(req.params.colaboradorId);
  const scope = await colaboradoresVisiblesPara(req.user);
  if (scope && !scope.includes(colaboradorId)) return res.status(403).json({ error: 'Sin acceso al saldo solicitado' });
  const anio = new Date().getFullYear();
  const saldo = await prisma.saldoVacaciones.findUnique({ where: { colaboradorId_anio: { colaboradorId, anio } } });
  res.json(saldo || { colaboradorId, anio, diasDisponibles: 0, diasUsados: 0 });
});

// RF-20/23: valida saldo antes de aceptar la solicitud de vacaciones.
router.post('/', async (req, res) => {
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
router.put('/:id', requirePermission('ausencias', 'aprobar'), async (req, res, next) => {
  const id = Number(req.params.id);
  const { estado } = req.body;
  if (!['Aprobado', 'Rechazado'].includes(estado)) return res.status(400).json({ error: 'estado debe ser Aprobado o Rechazado' });
  try {
    const scope = await colaboradoresVisiblesPara(req.user);
    const solicitud = await prisma.$transaction(async (tx) => {
      const current = await tx.solicitudAusencia.findUnique({ where: { id } });
      if (!current || (scope && !scope.includes(current.colaboradorId))) throw Object.assign(new Error('Solicitud no encontrada'), { status: 404 });
      const changed = await tx.solicitudAusencia.updateMany({
        where: { id, estado: 'Pendiente' },
        data: { estado, aprobadorId: req.user.colaboradorId || null },
      });
      if (changed.count !== 1) throw Object.assign(new Error('La solicitud ya fue resuelta'), { status: 409 });
      if (estado === 'Aprobado' && current.tipo === 'Vacaciones') {
        const anio = new Date().getFullYear();
        const dias = Math.round((current.hasta - current.desde) / 86_400_000) + 1;
        const saldo = await tx.saldoVacaciones.findUnique({ where: { colaboradorId_anio: { colaboradorId: current.colaboradorId, anio } } });
        if (!saldo || saldo.diasDisponibles - saldo.diasUsados < dias) throw Object.assign(new Error('Saldo de vacaciones insuficiente'), { status: 409 });
        const debit = await tx.saldoVacaciones.updateMany({
          where: { id: saldo.id, diasUsados: { lte: saldo.diasDisponibles - dias } },
          data: { diasUsados: { increment: dias } },
        });
        if (debit.count !== 1) throw Object.assign(new Error('El saldo cambió; vuelva a intentar'), { status: 409 });
      }
      return tx.solicitudAusencia.findUnique({ where: { id } });
    });
    await logAction(req.user.sub, `ausencia:${estado.toLowerCase()}`, 'solicitud_ausencia', id);
    res.json(solicitud);
  } catch (error) {
    if (error?.status) return res.status(error.status).json({ error: error.message });
    next(error);
  }
});

export default router;
