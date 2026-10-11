import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { ValidationError } from '../services/errors.js';
import { listTransactions, getBalance, createTransaction } from '../services/finance.js';

const router = Router();
router.use(requireAuth, requirePermission('financiero'));

router.get('/transacciones', async (req, res, next) => {
  try { res.json(await listTransactions(req.query)); } catch (err) { next(err); }
});
router.get('/balance', async (req, res, next) => {
  try { res.json(await getBalance()); } catch (err) { next(err); }
});
router.post('/transacciones', requirePermission('financiero', 'editar'), async (req, res, next) => {
  try { res.status(201).json(await createTransaction(req.body)); }
  catch (err) {
    if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
    next(err);
  }
});

export default router;
