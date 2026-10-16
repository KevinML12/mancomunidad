import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { ValidationError } from '../../services/errors.js';
import { listProjects, getProject, createProject, updateProject, addProjectEvidence } from '../../services/projects.js';
import { prepareEvidenceUpload, finishEvidenceUpload } from '../../services/evidence-upload.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import prisma from '../../lib/prisma.js';
import { canAccessMunicipio } from '../../lib/municipality-scope.js';
import { createMilestone, updateMilestone, approveMilestone, deleteMilestone } from '../../services/milestones.js';

const router = Router();
router.use(requireAuth, requirePermission('proyectos'));
router.param('hitoId', (req, res, next, value) => {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) return res.status(400).json({ error: 'Hito inválido' });
  next();
});

async function requireProjectScope(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(404).json({ error: 'Proyecto no encontrado' });
    const row = await prisma.proyecto.findUnique({ where: { id }, select: { municipio: true } });
    if (!row || !canAccessMunicipio(req.user, row.municipio)) return res.status(404).json({ error: 'Proyecto no encontrado' });
    next();
  } catch (error) { next(error); }
}

function handleError(err, res, next) {
  if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
  return next(err);
}

router.get('/', async (req, res, next) => {
  try { res.json(await listProjects(req.user)); } catch (err) { next(err); }
});
router.get('/:id', async (req, res, next) => {
  try {
    const project = await getProject(Number(req.params.id), req.user);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });
    res.json(project);
  } catch (err) { next(err); }
});
router.post('/', requirePermission('proyectos', 'editar'), async (req, res, next) => {
  try { res.status(201).json(await createProject(req.body, req.user)); } catch (err) { handleError(err, res, next); }
});
router.put('/:id', requirePermission('proyectos', 'editar'), async (req, res, next) => {
  try { res.json(await updateProject(Number(req.params.id), req.body, req.user)); } catch (err) { handleError(err, res, next); }
});
router.post('/:id/hitos', requirePermission('proyectos', 'editar'), requireProjectScope, async (req, res, next) => {
  try { res.status(201).json(await createMilestone(Number(req.params.id), req.user.sub, req.body)); }
  catch (err) { handleError(err, res, next); }
});
router.put('/:id/hitos/:hitoId', requirePermission('proyectos', 'editar'), requireProjectScope, async (req, res, next) => {
  try { res.json(await updateMilestone(Number(req.params.id), Number(req.params.hitoId), req.user.sub, req.body)); }
  catch (err) { handleError(err, res, next); }
});
router.post('/:id/hitos/:hitoId/aprobar', requirePermission('proyectos', 'aprobar'), requireProjectScope, async (req, res, next) => {
  try { res.json(await approveMilestone(Number(req.params.id), Number(req.params.hitoId), req.user.sub)); }
  catch (err) { handleError(err, res, next); }
});
router.post('/:id/hitos/:hitoId/reabrir', requirePermission('proyectos', 'aprobar'), requireProjectScope, async (req, res, next) => {
  try { res.json(await approveMilestone(Number(req.params.id), Number(req.params.hitoId), req.user.sub, false)); }
  catch (err) { handleError(err, res, next); }
});
router.delete('/:id/hitos/:hitoId', requirePermission('proyectos', 'editar'), requireProjectScope, async (req, res, next) => {
  try { res.json(await deleteMilestone(Number(req.params.id), Number(req.params.hitoId), req.user.sub)); }
  catch (err) { handleError(err, res, next); }
});
router.post('/:id/evidencias', requirePermission('proyectos', 'editar'), requireProjectScope, async (req, res, next) => {
  try { res.status(201).json(await addProjectEvidence(Number(req.params.id), req.user.sub, req.body)); } catch (err) { handleError(err, res, next); }
});

router.post('/:id/evidencias/preparar', requirePermission('proyectos', 'editar'), requireProjectScope, rateLimit(20, undefined, { scope: 'evidence-prepare', keyFrom: req => req.user.sub }), async (req, res, next) => {
  try { res.json(await prepareEvidenceUpload(req.user.sub, Number(req.params.id), req.body)); } catch (err) { handleError(err, res, next); }
});

router.post('/:id/evidencias/confirmar', requirePermission('proyectos', 'editar'), requireProjectScope, rateLimit(40, undefined, { scope: 'evidence-confirm', keyFrom: req => req.user.sub }), async (req, res, next) => {
  try { res.status(201).json(await finishEvidenceUpload(req.user.sub, Number(req.params.id), req.body?.ticket, req.body)); } catch (err) { handleError(err, res, next); }
});

export default router;
