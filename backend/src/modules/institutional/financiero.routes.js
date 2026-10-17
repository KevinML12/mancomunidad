import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { ValidationError } from '../../services/errors.js';
import { listTransactions, getBalance, createTransaction } from '../../services/finance.js';
import { transactionReceiptPdf, annualFinanceReportPdf } from '../../services/finance-pdf.js';
import prisma from '../../lib/prisma.js';
import { canAccessMunicipio, municipalityWhere } from '../../lib/municipality-scope.js';
import { pageWindow, sendPage } from '../../lib/pagination.js';

const router = Router();
router.use(requireAuth, requirePermission('financiero'));

router.get('/transacciones', async (req, res, next) => {
  try { const page = pageWindow(req.query); sendPage(res, await listTransactions(req.query, req.user, page), page); } catch (err) { next(err); }
});
router.get('/balance', async (req, res, next) => {
  try { res.json(await getBalance(req.user)); } catch (err) { next(err); }
});
function sendPdf(res, filename, bytes) {
  res.set('Content-Type', 'application/pdf');
  res.set('Content-Disposition', `attachment; filename="${filename}"`);
  res.set('Cache-Control', 'no-store');
  res.send(bytes);
}
router.get('/reportes/ejecucion.pdf', async (req, res, next) => {
  try {
    const year = Number(req.query.anio ?? new Date().getUTCFullYear());
    if (!Number.isSafeInteger(year) || year < 2000 || year > 2100) throw new ValidationError('Año fiscal inválido');
    const transactions = await prisma.transaccionFinanciera.findMany({ where: {
      ...municipalityWhere(req.user, { includeRegional: true }),
      fecha: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) },
    }, orderBy: { fecha: 'asc' } });
    const scope = req.user.permisos?.alcance?.territorio === 'global' ? 'Todos los municipios' : 'Municipios autorizados';
    sendPdf(res, `mfn-ejecucion-${year}.pdf`, await annualFinanceReportPdf(year, transactions, scope));
  } catch (err) { next(err); }
});
router.get('/transacciones/:id/constancia.pdf', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(404).json({ error: 'Movimiento no encontrado' });
    const transaction = await prisma.transaccionFinanciera.findUnique({ where: { id } });
    if (!transaction || (transaction.municipio !== 'Regional' && !canAccessMunicipio(req.user, transaction.municipio))) {
      return res.status(404).json({ error: 'Movimiento no encontrado' });
    }
    sendPdf(res, `${transaction.codigo}.pdf`, await transactionReceiptPdf(transaction));
  } catch (err) { next(err); }
});
router.post('/transacciones', requirePermission('financiero', 'editar'), async (req, res, next) => {
  try { res.status(201).json(await createTransaction(req.body, req.user)); }
  catch (err) {
    if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
    next(err);
  }
});

export default router;
