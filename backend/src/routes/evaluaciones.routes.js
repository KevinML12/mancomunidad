import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { logAction } from '../lib/audit.js';
import { FACTORES_EVALUACION } from '../lib/constants.js';
import { colaboradoresVisiblesPara } from '../lib/scope.js';

const router = Router();
const NIVEL_PUNTOS = { Sobresaliente: 4, Bueno: 3, Regular: 2, Deficiente: 1 };

function consolidar(calificaciones) {
  const puntos = calificaciones.map((c) => NIVEL_PUNTOS[c] ?? 2);
  const promedio = puntos.reduce((a, b) => a + b, 0) / puntos.length;
  if (promedio >= 3.5) return 'Sobresaliente';
  if (promedio >= 2.5) return 'Bueno';
  if (promedio >= 1.5) return 'Regular';
  return 'Deficiente';
}

router.get('/', requireAuth, async (req, res) => {
  const { colaboradorId } = req.query;
  const scope = await colaboradoresVisiblesPara(req.user);
  const solicitado = colaboradorId ? Number(colaboradorId) : null;
  let where;
  if (scope) {
    where = { colaboradorId: { in: solicitado ? scope.filter((id) => id === solicitado) : scope } };
  } else if (solicitado) {
    where = { colaboradorId: solicitado };
  }
  const evaluaciones = await prisma.evaluacionDesempeno.findMany({
    where,
    include: {
      colaborador: { include: { puesto: true } },
      evaluador: { include: { puesto: true } },
      factores: { orderBy: { factor: 'asc' } },
      planMejora: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(evaluaciones);
});

router.get('/factores', requireAuth, (req, res) => res.json(FACTORES_EVALUACION));

// RF-15/16/17/18 — registra el jefe inmediato del colaborador evaluado.
router.post('/', requireAuth, requirePermission('evaluaciones', 'editar'), async (req, res) => {
  const { colaboradorId, periodo, calificaciones } = req.body;
  if (!colaboradorId || !periodo || !Array.isArray(calificaciones) || calificaciones.length !== FACTORES_EVALUACION.length) {
    return res.status(400).json({ error: 'colaboradorId, periodo y 15 calificaciones son requeridos' });
  }

  const resultado = consolidar(calificaciones);

  const evaluacion = await prisma.evaluacionDesempeno.create({
    data: {
      colaboradorId: Number(colaboradorId),
      evaluadorId: req.user.colaboradorId || Number(colaboradorId),
      periodo,
      resultado,
      fecha: new Date(),
      factores: {
        create: FACTORES_EVALUACION.map((nombreFactor, i) => ({
          factor: i + 1,
          nombreFactor,
          calificacion: calificaciones[i],
        })),
      },
    },
    include: { factores: true },
  });

  // RF-18: resultado deficiente → plan de mejora automático (2 meses).
  if (resultado === 'Deficiente') {
    const fechaLimite = new Date();
    fechaLimite.setMonth(fechaLimite.getMonth() + 2);
    await prisma.planMejora.create({
      data: { evaluacionId: evaluacion.id, fechaLimite, estado: 'Activo' },
    });
  }

  await logAction(req.user.sub, 'crear', 'evaluacion_desempeno', evaluacion.id);
  res.status(201).json(evaluacion);
});

export default router;
