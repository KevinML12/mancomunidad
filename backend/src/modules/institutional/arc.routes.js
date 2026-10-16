import { Router } from 'express';
import { text, choice, date } from '../../services/validation.js';
import { MUNICIPIOS_MFN } from '../../lib/municipios.js';
import prisma from '../../lib/prisma.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { createWithCorrelative } from '../../services/correlatives.js';

const router = Router();
router.use(requireAuth, requirePermission('arc'));

// GET /api/v1/arc - Listar tareas del Plan de Mejoras ARC
router.get('/', async (req, res, next) => {
  try {
    const { estado, dimension, prioridad, municipio, search } = req.query;
    const where = {};

    if (estado) where.estado = estado;
    if (dimension) where.dimension = dimension;
    if (prioridad) where.prioridad = prioridad;
    if (municipio) where.municipio = municipio;
    if (search) {
      where.OR = [
        { titulo: { contains: search } },
        { codigo: { contains: search } },
        { responsable: { contains: search } }
      ];
    }

    const tareas = await prisma.tareaARC.findMany({
      where,
      orderBy: [
        { fechaLimite: 'asc' }
      ]
    });

    const ahora = new Date();
    // Enriquecer con cálculo de si está vencida
    const enriquecidas = tareas.map(t => {
      const limite = new Date(t.fechaLimite);
      const estaVencida = t.estado !== 'Finalizado' && limite < ahora;
      const diasRestantes = Math.ceil((limite - ahora) / (1000 * 60 * 60 * 24));
      return {
        ...t,
        estaVencida,
        diasRestantes
      };
    });

    res.json(enriquecidas);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/arc/metricas - Métricas ejecutivas y alertas
router.get('/metricas', async (req, res, next) => {
  try {
    const [grupos, vencidas] = await Promise.all([
      prisma.tareaARC.groupBy({ by: ['estado'], _count: { _all: true } }),
      prisma.tareaARC.count({ where: { estado: { not: 'Finalizado' }, fechaLimite: { lt: new Date() } } })
    ]);
    const porEstado = Object.fromEntries(grupos.map(grupo => [grupo.estado, grupo._count._all]));
    const total = grupos.reduce((sum, grupo) => sum + grupo._count._all, 0);
    const pendientes = porEstado.Pendiente ?? 0;
    const enProceso = porEstado['En Proceso'] ?? 0;
    const enRevision = porEstado['En Revisión'] ?? 0;
    const finalizadas = porEstado.Finalizado ?? 0;

    // Cumplimiento global en %
    const porcentajeCumplimiento = total > 0 ? Math.round((finalizadas / total) * 100) : 0;

    res.json({
      total,
      pendientes,
      enProceso,
      enRevision,
      finalizadas,
      vencidas,
      porcentajeCumplimiento
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/arc - Crear nueva tarea operativa ARC (RF8 - RBAC)
router.post('/', requirePermission('arc', 'editar'), async (req, res, next) => {
  try {
    const titulo = text(req.body.titulo, 'Título');
    const descripcion = text(req.body.descripcion, 'Descripción', { max: 4000 });
    const responsable = text(req.body.responsable, 'Responsable');
    const dimension = text(req.body.dimension ?? 'Planificación y Monitoreo', 'Dimensión');
    const prioridad = choice(req.body.prioridad ?? 'Media', ['Alta', 'Media', 'Baja'], 'Prioridad');
    const municipio = choice(req.body.municipio ?? 'Regional', [...MUNICIPIOS_MFN, 'Regional'], 'Municipio');
    const fechaLimite = date(req.body.fechaLimite, 'Fecha límite');

    const tarea = await createWithCorrelative('tareaARC', 'ARC-2024-', 2, {
      titulo,
      descripcion,
      dimension: dimension || 'Planificación y Monitoreo',
      prioridad: prioridad || 'Media',
      municipio: municipio || 'Regional',
      responsable,
      fechaLimite: new Date(fechaLimite),
      estado: 'Pendiente'
    });

    res.status(201).json(tarea);
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/arc/:id - Actualizar estado o datos de tarea (Kanban Drag/Drop - RF7)
router.put('/:id', requirePermission('arc', 'editar'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { estado, titulo, descripcion, dimension, prioridad, responsable, fechaLimite } = req.body;

    const data = {};
    if (estado !== undefined) {
      data.estado = choice(estado, ['Pendiente', 'En Proceso', 'En Revisión', 'Finalizado'], 'Estado');
      if (estado === 'Finalizado') {
        data.fechaFinalizada = new Date();
      } else {
        data.fechaFinalizada = null;
      }
    }
    if (titulo !== undefined) data.titulo = text(titulo, 'Título', { max: 200 });
    if (descripcion !== undefined) data.descripcion = text(descripcion, 'Descripción', { max: 4000 });
    if (dimension !== undefined) data.dimension = text(dimension, 'Dimensión', { max: 200 });
    if (prioridad !== undefined) data.prioridad = choice(prioridad, ['Alta', 'Media', 'Baja'], 'Prioridad');
    if (responsable !== undefined) data.responsable = text(responsable, 'Responsable', { max: 200 });
    if (fechaLimite !== undefined) data.fechaLimite = date(fechaLimite, 'Fecha límite');

    const updated = await prisma.tareaARC.update({
      where: { id },
      data
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/arc/:id - Eliminar tarea (RBAC)
router.delete('/:id', requirePermission('arc', 'editar'), async (req, res, next) => {
  try {
    await prisma.tareaARC.delete({
      where: { id: Number(req.params.id) }
    });
    res.json({ message: 'Tarea eliminada exitosamente' });
  } catch (err) {
    next(err);
  }
});


export default router;
