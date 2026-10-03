import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { logAction } from '../lib/audit.js';

const router = Router();

// GET /api/v1/arc - Listar tareas del Plan de Mejoras ARC
router.get('/', requireAuth, async (req, res, next) => {
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
router.get('/metricas', requireAuth, async (req, res, next) => {
  try {
    const tareas = await prisma.tareaARC.findMany();
    const ahora = new Date();

    const total = tareas.length;
    const pendientes = tareas.filter(t => t.estado === 'Pendiente').length;
    const enProceso = tareas.filter(t => t.estado === 'En Proceso').length;
    const enRevision = tareas.filter(t => t.estado === 'En Revisión').length;
    const finalizadas = tareas.filter(t => t.estado === 'Finalizado').length;
    const vencidas = tareas.filter(t => t.estado !== 'Finalizado' && new Date(t.fechaLimite) < ahora).length;

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
router.post('/', requireAuth, requirePermission('arc', 'editar'), async (req, res, next) => {
  try {
    const { titulo, descripcion, dimension, prioridad, municipio, responsable, fechaLimite } = req.body;

    // Generar correlativo institucional
    const count = await prisma.tareaARC.count();
    const codigo = `ARC-2024-${(count + 1).toString().padStart(2, '0')}`;

    const tarea = await prisma.tareaARC.create({
      data: {
        codigo,
        titulo,
        descripcion,
        dimension: dimension || 'Planificación y Monitoreo',
        prioridad: prioridad || 'Media',
        municipio: municipio || 'Regional',
        responsable,
        fechaLimite: new Date(fechaLimite),
        estado: 'Pendiente'
      }
    });

    await logAction(req.user?.sub, 'crear_tarea_arc', 'tarea_arc', tarea.id);
    res.status(201).json(tarea);
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/arc/:id - Actualizar estado o datos de tarea (Kanban Drag/Drop - RF7)
router.put('/:id', requireAuth, requirePermission('arc', 'editar'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { estado, titulo, descripcion, dimension, prioridad, responsable, fechaLimite } = req.body;

    const data = {};
    if (estado !== undefined) {
      data.estado = estado;
      if (estado === 'Finalizado') {
        data.fechaFinalizada = new Date();
      } else {
        data.fechaFinalizada = null;
      }
    }
    if (titulo !== undefined) data.titulo = titulo;
    if (descripcion !== undefined) data.descripcion = descripcion;
    if (dimension !== undefined) data.dimension = dimension;
    if (prioridad !== undefined) data.prioridad = prioridad;
    if (responsable !== undefined) data.responsable = responsable;
    if (fechaLimite !== undefined) data.fechaLimite = new Date(fechaLimite);

    const updated = await prisma.tareaARC.update({
      where: { id },
      data
    });

    await logAction(req.user?.sub, 'actualizar_tarea_arc', 'tarea_arc', id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/arc/:id - Eliminar tarea (RBAC)
router.delete('/:id', requireAuth, requirePermission('arc', 'editar'), async (req, res, next) => {
  try {
    await prisma.tareaARC.delete({
      where: { id: Number(req.params.id) }
    });
    await logAction(req.user?.sub, 'eliminar_tarea_arc', 'tarea_arc', Number(req.params.id));
    res.json({ message: 'Tarea eliminada exitosamente' });
  } catch (err) {
    next(err);
  }
});


export default router;
