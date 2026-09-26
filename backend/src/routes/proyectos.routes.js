import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/proyectos - Obtener todos los proyectos
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const proyectos = await prisma.proyecto.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { evidencias: true }
        }
      }
    });
    res.json(proyectos);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/proyectos/:id - Obtener un proyecto y sus evidencias
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        evidencias: {
          orderBy: { fechaCaptura: 'desc' }
        }
      }
    });
    if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });
    res.json(proyecto);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/proyectos - Crear nuevo proyecto
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { 
      nombre, 
      agenciaFinanciadora, 
      fechaInicioPlanificada, 
      fechaFinPlanificada, 
      presupuestoMunicipal, 
      presupuestoCooperacion, 
      estado, 
      porcentajeAvanceFisico 
    } = req.body;

    const proyecto = await prisma.proyecto.create({
      data: {
        nombre,
        agenciaFinanciadora,
        fechaInicioPlanificada: new Date(fechaInicioPlanificada),
        fechaFinPlanificada: fechaFinPlanificada ? new Date(fechaFinPlanificada) : null,
        presupuestoMunicipal: Number(presupuestoMunicipal) || 0,
        presupuestoCooperacion: Number(presupuestoCooperacion) || 0,
        estado: estado || 'Planificación',
        porcentajeAvanceFisico: Number(porcentajeAvanceFisico) || 0
      }
    });
    res.status(201).json(proyecto);
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/proyectos/:id - Actualizar proyecto
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (data.fechaInicioPlanificada) data.fechaInicioPlanificada = new Date(data.fechaInicioPlanificada);
    if (data.fechaFinPlanificada) data.fechaFinPlanificada = new Date(data.fechaFinPlanificada);
    
    if (data.presupuestoMunicipal !== undefined) data.presupuestoMunicipal = Number(data.presupuestoMunicipal);
    if (data.presupuestoCooperacion !== undefined) data.presupuestoCooperacion = Number(data.presupuestoCooperacion);
    if (data.porcentajeAvanceFisico !== undefined) data.porcentajeAvanceFisico = Number(data.porcentajeAvanceFisico);

    const proyecto = await prisma.proyecto.update({
      where: { id: Number(req.params.id) },
      data
    });
    res.json(proyecto);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/proyectos/:id/evidencias - Añadir evidencia fotográfica
router.post('/:id/evidencias', requireAuth, async (req, res, next) => {
  try {
    const { urlArchivo, latitud, longitud, descripcion, fechaCaptura } = req.body;
    
    const evidencia = await prisma.evidenciaProyecto.create({
      data: {
        proyectoId: Number(req.params.id),
        urlArchivo,
        latitud: latitud ? Number(latitud) : null,
        longitud: longitud ? Number(longitud) : null,
        descripcion,
        fechaCaptura: fechaCaptura ? new Date(fechaCaptura) : new Date(),
        cargadoPorId: req.user?.id // Assuming auth middleware injects user
      }
    });
    res.status(201).json(evidencia);
  } catch (err) {
    next(err);
  }
});

export default router;
