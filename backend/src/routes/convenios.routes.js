import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requirePermission('convenios'));

// GET /api/v1/convenios - Listar convenios con motor cronológico y cálculo de alertas
router.get('/', async (req, res, next) => {
  try {
    const { tipoOrganizacion, estado, search } = req.query;
    const where = {};
    if (tipoOrganizacion) where.tipoOrganizacion = tipoOrganizacion;
    if (estado) where.estado = estado;
    if (search) {
      where.OR = [
        { nombre: { contains: search } },
        { codigo: { contains: search } },
        { entidadCooperante: { contains: search } }
      ];
    }

    const convenios = await prisma.convenioInstitucional.findMany({
      where,
      orderBy: { fechaVencimiento: 'asc' }
    });

    const ahora = new Date();

    // Motor cronológico: cálculo de días restantes y alerta de 90 días (RF15)
    const procesados = convenios.map(c => {
      const vencimiento = new Date(c.fechaVencimiento);
      const diasRestantes = Math.ceil((vencimiento.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));
      
      let alerta = 'normal';
      let estadoCalculado = c.estado;

      if (diasRestantes < 0) {
        alerta = 'vencido';
        estadoCalculado = 'Vencido';
      } else if (diasRestantes <= 90) {
        alerta = 'proximo';
        if (c.estado !== 'En Renovación') {
          estadoCalculado = 'Próximo a Vencer';
        }
      }

      return {
        ...c,
        diasRestantes,
        alerta,
        estado: estadoCalculado
      };
    });

    res.json(procesados);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/convenios - Registrar nuevo convenio (RF15 - RBAC)
router.post('/', requirePermission('convenios', 'editar'), async (req, res, next) => {
  try {
    const {
      nombre,
      tipoOrganizacion,
      entidadCooperante,
      montoCooperacion,
      contrapartidaMFN,
      fechaSuscripcion,
      fechaVencimiento,
      urlDocumento,
      coordinadorMFN
    } = req.body;

    const count = await prisma.convenioInstitucional.count();
    const codigo = `CONV-2024-${entidadCooperante.toUpperCase().replace(/\s+/g, '').slice(0, 5)}-${(count + 1).toString().padStart(2, '0')}`;

    const nuevo = await prisma.convenioInstitucional.create({
      data: {
        codigo,
        nombre,
        tipoOrganizacion: tipoOrganizacion || 'Cooperación Internacional',
        entidadCooperante,
        montoCooperacion: Number(montoCooperacion) || 0,
        contrapartidaMFN: Number(contrapartidaMFN) || 0,
        fechaSuscripcion: new Date(fechaSuscripcion),
        fechaVencimiento: new Date(fechaVencimiento),
        urlDocumento,
        coordinadorMFN,
        estado: 'Vigente'
      }
    });

    res.status(201).json(nuevo);
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/convenios/:id - Actualizar estado o prorrogar (RBAC)
router.put('/:id', requirePermission('convenios', 'editar'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { estado, fechaVencimiento, urlDocumento } = req.body;

    const data = {};
    if (estado) data.estado = estado;
    if (fechaVencimiento) data.fechaVencimiento = new Date(fechaVencimiento);
    if (urlDocumento) data.urlDocumento = urlDocumento;

    const updated = await prisma.convenioInstitucional.update({
      where: { id },
      data
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;

