import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { ValidationError } from '../../services/errors.js';
import { listProjects, getProject, createProject, updateProject, addProjectEvidence } from '../../services/projects.js';

import { createMilestones, reviewEvidence } from '../../services/project-workflow.js';
const router = Router();
router.use(requireAuth, requirePermission('proyectos'));

function handleError(err, res, next) {
  if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
  return next(err);
}

router.get('/', async (req, res, next) => {
  try { res.json(await listProjects()); } catch (err) { next(err); }
});
router.get('/:id', async (req, res, next) => {
  try {
    const project = await getProject(Number(req.params.id));
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });
    res.json(project);
  } catch (err) { next(err); }
});
router.post('/', requirePermission('proyectos', 'editar'), async (req, res, next) => {
  try { res.status(201).json(await createProject(req.body)); } catch (err) { handleError(err, res, next); }
});
router.put('/:id', requirePermission('proyectos', 'editar'), async (req, res, next) => {
  try { res.json(await updateProject(Number(req.params.id), req.body, req.user.sub)); } catch (err) { handleError(err, res, next); }
});
router.post('/:id/evidencias', requirePermission('proyectos', 'editar'), async (req, res, next) => {
  try { res.status(201).json(await addProjectEvidence(Number(req.params.id), req.user.sub, req.body)); } catch (err) { handleError(err, res, next); }
});

router.post('/:id/hitos', requirePermission('proyectos','editar'), async (req,res,next) => {
  try { res.status(201).json(await createMilestones(Number(req.params.id),req.user.sub,req.body)); } catch (err) { next(err); }
});
router.put('/:id/evidencias/:evidenciaId/revision', requirePermission('proyectos','aprobar'), async (req,res,next) => {
  try { res.json(await reviewEvidence(Number(req.params.id),Number(req.params.evidenciaId),req.user.sub,req.body)); } catch (err) { next(err); }
});
export default router;
