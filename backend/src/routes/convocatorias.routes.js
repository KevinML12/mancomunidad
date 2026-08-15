import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { logAction } from '../lib/audit.js';

const router = Router();

// RF-06/07
router.get('/', requireAuth, async (req, res) => {
  const convocatorias = await prisma.convocatoria.findMany({
    include: { puesto: true, candidatos: true },
    orderBy: { fechaPublicacion: 'desc' },
  });
  res.json(convocatorias);
});

router.post('/', requireAuth, requirePermission('reclutamiento', 'editar'), async (req, res) => {
  const { puestoId, tipo, fechaCierre, requisitos } = req.body;
  if (!puestoId || !tipo || !fechaCierre) return res.status(400).json({ error: 'puestoId, tipo y fechaCierre son requeridos' });
  const convocatoria = await prisma.convocatoria.create({
    data: { puestoId: Number(puestoId), tipo, fechaCierre: new Date(fechaCierre), requisitos: requisitos || null },
  });
  await logAction(req.user.sub, 'crear', 'convocatoria', convocatoria.id);
  res.status(201).json(convocatoria);
});

// Actualizar estado de convocatoria (Abierta / Cerrada)
router.patch('/:id/estado', requireAuth, requirePermission('reclutamiento', 'editar'), async (req, res) => {
  const id = Number(req.params.id);
  const { estado } = req.body;
  if (!['Abierta', 'Cerrada'].includes(estado)) return res.status(400).json({ error: 'Estado inválido' });

  const convocatoria = await prisma.convocatoria.update({
    where: { id },
    data: { estado },
    include: { puesto: true, candidatos: true },
  });
  await logAction(req.user.sub, `convocatoria:${estado.toLowerCase()}`, 'convocatoria', id);
  res.json(convocatoria);
});

// RF-08/09 - Registrar candidato
router.post('/:id/candidatos', requireAuth, requirePermission('reclutamiento', 'editar'), async (req, res) => {
  const convocatoriaId = Number(req.params.id);
  const { nombre, puntajeCompetencias = 0, puntajeExperiencia = 0, puntajeEntrevista = 0, puntajeReferencias = 0, expedienteCompleto = false } = req.body;
  if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });

  // RF-09: puntaje ponderado — competencias 60%, experiencia 15%, entrevistas 15%, referencias 10%.
  const puntajeTotal = Number((puntajeCompetencias * 0.6 + puntajeExperiencia * 0.15 + puntajeEntrevista * 0.15 + puntajeReferencias * 0.1).toFixed(2));

  const candidato = await prisma.candidato.create({
    data: { convocatoriaId, nombre, puntajeCompetencias: Number(puntajeCompetencias), puntajeExperiencia: Number(puntajeExperiencia), puntajeEntrevista: Number(puntajeEntrevista), puntajeReferencias: Number(puntajeReferencias), puntajeTotal, expedienteCompleto: Boolean(expedienteCompleto) },
  });
  await logAction(req.user.sub, 'crear', 'candidato', candidato.id);
  res.status(201).json(candidato);
});

// Actualizar puntuación o expediente de candidato
router.put('/:id/candidatos/:candidatoId', requireAuth, requirePermission('reclutamiento', 'editar'), async (req, res) => {
  const candidatoId = Number(req.params.candidatoId);
  const { nombre, puntajeCompetencias, puntajeExperiencia, puntajeEntrevista, puntajeReferencias, expedienteCompleto } = req.body;

  const current = await prisma.candidato.findUnique({ where: { id: candidatoId } });
  if (!current) return res.status(404).json({ error: 'Candidato no encontrado' });

  const c = puntajeCompetencias !== undefined ? Number(puntajeCompetencias) : current.puntajeCompetencias || 0;
  const e = puntajeExperiencia !== undefined ? Number(puntajeExperiencia) : current.puntajeExperiencia || 0;
  const ent = puntajeEntrevista !== undefined ? Number(puntajeEntrevista) : current.puntajeEntrevista || 0;
  const r = puntajeReferencias !== undefined ? Number(puntajeReferencias) : current.puntajeReferencias || 0;
  const puntajeTotal = Number((c * 0.6 + e * 0.15 + ent * 0.15 + r * 0.1).toFixed(2));

  const updated = await prisma.candidato.update({
    where: { id: candidatoId },
    data: {
      nombre: nombre || current.nombre,
      puntajeCompetencias: c,
      puntajeExperiencia: e,
      puntajeEntrevista: ent,
      puntajeReferencias: r,
      puntajeTotal,
      expedienteCompleto: expedienteCompleto !== undefined ? Boolean(expedienteCompleto) : current.expedienteCompleto,
    },
  });
  await logAction(req.user.sub, 'actualizar', 'candidato', candidatoId);
  res.json(updated);
});

export default router;

