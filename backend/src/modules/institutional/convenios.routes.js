import crypto from 'node:crypto';
import { text, numeric, choice, date, chronological, url } from '../../services/validation.js';
import { ValidationError } from '../../services/errors.js';
import { Router } from 'express';
import prisma from '../../lib/prisma.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';

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
    const body = req.body;
    const fechaSuscripcion = date(body.fechaSuscripcion,'Fecha de suscripción');
    const fechaVencimiento = date(body.fechaVencimiento,'Fecha de vencimiento');
    chronological(fechaSuscripcion,fechaVencimiento);
    const nuevo = await prisma.convenioInstitucional.create({data:{
      codigo: `CONV-${fechaSuscripcion.getUTCFullYear()}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
      nombre:text(body.nombre,'Nombre'),
      tipoOrganizacion:choice(body.tipoOrganizacion === undefined ? 'Cooperación Internacional' : body.tipoOrganizacion,['Cooperación Internacional','Sector Público','ONG'],'Tipo de organización'),
      entidadCooperante:text(body.entidadCooperante,'Entidad cooperante'),
      montoCooperacion:numeric(body.montoCooperacion === undefined ? 0 : body.montoCooperacion,'Monto de cooperación',{money:true}),
      contrapartidaMFN:numeric(body.contrapartidaMFN === undefined ? 0 : body.contrapartidaMFN,'Contrapartida MFN',{money:true}),
      fechaSuscripcion,fechaVencimiento,
      urlDocumento:url(body.urlDocumento,'Enlace del documento'),
      coordinadorMFN:text(body.coordinadorMFN,'Coordinador MFN'),estado:'Vigente'
    }});

    res.status(201).json(nuevo);
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/convenios/:id - Actualizar estado o prorrogar (RBAC)
router.put('/:id', requirePermission('convenios', 'editar'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const current = await prisma.convenioInstitucional.findUnique({where:{id}});
    if (!current) return res.status(404).json({error:'Convenio no encontrado'});
    const data = {};
    if (req.body.estado !== undefined) data.estado=choice(req.body.estado,['Vigente','En Renovación'],'Estado');
    if (req.body.fechaVencimiento !== undefined) {
      data.fechaVencimiento=date(req.body.fechaVencimiento,'Nueva fecha de vencimiento');
      chronological(current.fechaSuscripcion,data.fechaVencimiento);
      if (data.fechaVencimiento <= current.fechaVencimiento) throw new ValidationError('La prórroga debe ser posterior al vencimiento registrado');
    }
    if (req.body.urlDocumento !== undefined) data.urlDocumento=url(req.body.urlDocumento,'Enlace del documento') ?? null;
    const updated = await prisma.convenioInstitucional.update({where:{id},data});

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;

