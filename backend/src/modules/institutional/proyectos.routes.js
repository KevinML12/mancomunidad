import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { ValidationError } from '../../services/errors.js';
import { listProjects, getProject, createProject, updateProject, addProjectEvidence } from '../../services/projects.js';
import { prepareEvidenceUpload, finishEvidenceUpload } from '../../services/evidence-upload.js';
import { rateLimit } from '../../middleware/rate-limit.js';

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
  try { res.json(await updateProject(Number(req.params.id), req.body)); } catch (err) { handleError(err, res, next); }
});
router.post('/:id/evidencias', requirePermission('proyectos', 'editar'), async (req, res, next) => {
  try { res.status(201).json(await addProjectEvidence(Number(req.params.id), req.user.sub, req.body)); } catch (err) { handleError(err, res, next); }
});

router.post('/:id/evidencias/preparar', requirePermission('proyectos', 'editar'), rateLimit(20, undefined, { scope: 'evidence-prepare', keyFrom: req => req.user.sub }), async (req, res, next) => {
  try { res.json(await prepareEvidenceUpload(req.user.sub, Number(req.params.id), req.body)); } catch (err) { handleError(err, res, next); }
});

router.post('/:id/evidencias/confirmar', requirePermission('proyectos', 'editar'), rateLimit(40, undefined, { scope: 'evidence-confirm', keyFrom: req => req.user.sub }), async (req, res, next) => {
  try { res.status(201).json(await finishEvidenceUpload(req.user.sub, Number(req.params.id), req.body?.ticket, req.body)); } catch (err) { handleError(err, res, next); }
});

export default router;
