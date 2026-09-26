import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/gobernanza/actas - Listar actas oficiales e indexadas
router.get('/actas', requireAuth, async (req, res, next) => {
  try {
    const { tipoSesion, municipioSede, search } = req.query;
    const where = {};
    if (tipoSesion) where.tipoSesion = tipoSesion;
    if (municipioSede) where.municipioSede = municipioSede;
    if (search) {
      where.OR = [
        { numeroActa: { contains: search } },
        { municipioSede: { contains: search } },
        { libroCGCFolio: { contains: search } }
      ];
    }

    const actas = await prisma.actaAsamblea.findMany({
      where,
      orderBy: { fecha: 'desc' },
      include: {
        acuerdos: true
      }
    });

    res.json(actas);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/gobernanza/acuerdos - Semáforo de acuerdos políticos
router.get('/acuerdos', requireAuth, async (req, res, next) => {
  try {
    const { estado } = req.query;
    const where = {};
    if (estado) where.estado = estado;

    const acuerdos = await prisma.acuerdoGobernanza.findMany({
      where,
      include: {
        acta: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(acuerdos);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/gobernanza/actas - Registrar y digitalizar acta oficial
router.post('/actas', requireAuth, async (req, res, next) => {
  try {
    const { 
      numeroActa, 
      numeroSesion, 
      tipoSesion, 
      fecha, 
      municipioSede, 
      lugarReunion, 
      libroCGCFolio, 
      urlPdfEscaneado 
    } = req.body;

    const acta = await prisma.actaAsamblea.create({
      data: {
        numeroActa,
        numeroSesion: Number(numeroSesion),
        tipoSesion: tipoSesion || 'Ordinaria',
        fecha: new Date(fecha),
        municipioSede,
        lugarReunion,
        libroCGCFolio,
        urlPdfEscaneado
      }
    });

    res.status(201).json(acta);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/gobernanza/actas/:id/acuerdos - Vincular acuerdo resolutivo a acta
router.post('/actas/:id/acuerdos', requireAuth, async (req, res, next) => {
  try {
    const actaId = Number(req.params.id);
    const { titulo, descripcion, responsable, fechaCumplimiento, estado, evidenciaUrl } = req.body;

    const count = await prisma.acuerdoGobernanza.count({ where: { actaId } });
    const acta = await prisma.actaAsamblea.findUnique({ where: { id: actaId } });
    const codigo = `ACU-${acta.numeroActa}-${(count + 1).toString().padStart(2, '0')}`;

    const acuerdo = await prisma.acuerdoGobernanza.create({
      data: {
        codigo,
        actaId,
        titulo,
        descripcion,
        responsable,
        fechaCumplimiento: fechaCumplimiento ? new Date(fechaCumplimiento) : null,
        estado: estado || 'En Proceso',
        evidenciaUrl
      }
    });

    res.status(201).json(acuerdo);
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/gobernanza/acuerdos/:id - Actualizar estado en semáforo de cumplimiento
router.put('/acuerdos/:id', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { estado, evidenciaUrl } = req.body;

    const updated = await prisma.acuerdoGobernanza.update({
      where: { id },
      data: {
        estado,
        evidenciaUrl
      }
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
