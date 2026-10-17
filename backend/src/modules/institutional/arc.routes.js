import { Router } from 'express';
import { text, choice, date } from '../../services/validation.js';
import { MUNICIPIOS_MFN } from '../../lib/municipios.js';
import prisma from '../../lib/prisma.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { canAccessMunicipio, municipalityWhere } from '../../lib/municipality-scope.js';
import crypto from 'node:crypto';
import { ValidationError } from '../../services/errors.js';
import { pageWindow, sendPage } from '../../lib/pagination.js';

const router = Router();
router.use(requireAuth, requirePermission('arc'));

async function assigneeFromId(value, municipio) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new ValidationError('Seleccione una cuenta responsable');
  const user = await prisma.usuario.findUnique({ where: { id }, include: { rol: true, municipios: { select: { municipio: true } }, colaborador: { select: { nombre: true } } } });
  if (!user || !user.rol.permisos?.modulos?.includes('arc') ||
      (municipio !== 'Regional' && !canAccessMunicipio({ permisos: user.rol.permisos, municipios: user.municipios.map(row => row.municipio) }, municipio))) {
    throw new ValidationError('La cuenta responsable no tiene acceso al municipio o al módulo ARC');
  }
  return { responsableId: id, responsable: user.colaborador?.nombre || user.correo };
}

router.get('/asignables', async (req, res, next) => {
  try {
    const municipio = req.query.municipio || 'Regional';
    if (![...MUNICIPIOS_MFN, 'Regional'].includes(municipio) ||
        (municipio !== 'Regional' && !canAccessMunicipio(req.user, municipio))) return res.status(400).json({ error: 'Municipio fuera de su ámbito autorizado' });
    const rows = await prisma.usuario.findMany({ select: { id: true, correo: true, rol: { select: { codigo: true, permisos: true } },
      municipios: { select: { municipio: true } }, colaborador: { select: { nombre: true } } }, orderBy: { correo: 'asc' } });
    res.json(rows.filter(row => row.rol.permisos?.modulos?.includes('arc') &&
      (municipio === 'Regional' || canAccessMunicipio({ permisos: row.rol.permisos, municipios: row.municipios.map(item => item.municipio) }, municipio)))
      .map(row => ({ id: row.id, correo: row.correo, nombre: row.colaborador?.nombre || row.correo })));
  } catch (err) { next(err); }
});

// GET /api/v1/arc - Listar tareas del Plan de Mejoras ARC
router.get('/', async (req, res, next) => {
  try {
    const page = pageWindow(req.query);
    const { estado, dimension, prioridad, municipio, search } = req.query;
    const where = municipalityWhere(req.user, { includeRegional: true });

    if (estado) where.estado = estado;
    if (dimension) where.dimension = dimension;
    if (prioridad) where.prioridad = prioridad;
    if (municipio) {
      if (municipio !== 'Regional' && !canAccessMunicipio(req.user, municipio)) return res.json([]);
      where.municipio = municipio;
    }
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
        { fechaLimite: 'asc' }, { id: 'asc' }
      ], skip: page.skip, take: page.take,
    });

    const ahora = new Date();
    // Enriquecer con cálculo de si está vencida
    const enriquecidas = tareas.map(t => {
      const limite = new Date(t.fechaLimite);
      const estaVencida = t.estado !== 'Finalizado' && limite < ahora;
      const diasRestantes = Math.ceil((limite - ahora) / (1000 * 60 * 60 * 24));
      return {
        ...t,
        esPropia: t.responsableId === req.user.sub,
        estaVencida,
        diasRestantes
      };
    });

    sendPage(res, enriquecidas, page);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/arc/metricas - Métricas ejecutivas y alertas
router.get('/metricas', async (req, res, next) => {
  try {
    const where = municipalityWhere(req.user, { includeRegional: true });
    const ahora = new Date();
    const [groups, vencidas] = await Promise.all([
      prisma.tareaARC.groupBy({ by: ['estado'], where, _count: { _all: true } }),
      prisma.tareaARC.count({ where: { ...where, estado: { not: 'Finalizado' }, fechaLimite: { lt: ahora } } }),
    ]);
    const counts = Object.fromEntries(groups.map(group => [group.estado, group._count._all]));
    const total = groups.reduce((sum, group) => sum + group._count._all, 0);
    const pendientes = counts.Pendiente || 0;
    const enProceso = counts['En Proceso'] || 0;
    const enRevision = counts['En Revisión'] || 0;
    const finalizadas = counts.Finalizado || 0;

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
    const dimension = text(req.body.dimension ?? 'Planificación y Monitoreo', 'Dimensión');
    const prioridad = choice(req.body.prioridad ?? 'Media', ['Alta', 'Media', 'Baja'], 'Prioridad');
    const municipio = choice(req.body.municipio ?? 'Regional', [...MUNICIPIOS_MFN, 'Regional'], 'Municipio');
    if (!canAccessMunicipio(req.user, municipio)) return res.status(403).json({ error: 'Municipio fuera de su ámbito autorizado' });
    const assignment = req.body.responsableId === undefined ? { responsable: text(req.body.responsable, 'Responsable') } : await assigneeFromId(req.body.responsableId, municipio);
    const fechaLimite = date(req.body.fechaLimite, 'Fecha límite');

    // Generar correlativo institucional
    const codigo = `ARC-${new Date().getUTCFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const tarea = await prisma.tareaARC.create({
      data: {
        codigo,
        titulo,
        descripcion,
        dimension: dimension || 'Planificación y Monitoreo',
        prioridad: prioridad || 'Media',
        municipio: municipio || 'Regional',
        ...assignment,
        fechaLimite: new Date(fechaLimite),
        estado: 'Pendiente'
      }
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
    if (!Number.isSafeInteger(id) || id < 1) return res.status(404).json({ error: 'Tarea no encontrada' });
    const existing = await prisma.tareaARC.findUnique({ where: { id }, select: { municipio: true, responsableId: true } });
    if (!existing || !(existing.municipio === 'Regional' ? req.user.permisos?.alcance?.regionalARC || existing.responsableId === req.user.sub : canAccessMunicipio(req.user, existing.municipio))) return res.status(404).json({ error: 'Tarea no encontrada' });
    const { estado, titulo, descripcion, dimension, prioridad, responsable, responsableId, fechaLimite } = req.body;

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
    if (responsableId !== undefined) Object.assign(data, await assigneeFromId(responsableId, existing.municipio));
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
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(404).json({ error: 'Tarea no encontrada' });
    const existing = await prisma.tareaARC.findUnique({ where: { id }, select: { municipio: true } });
    if (!existing || !(existing.municipio === 'Regional' ? req.user.permisos?.alcance?.regionalARC : canAccessMunicipio(req.user, existing.municipio))) return res.status(404).json({ error: 'Tarea no encontrada' });
    await prisma.tareaARC.delete({
      where: { id }
    });
    res.json({ message: 'Tarea eliminada exitosamente' });
  } catch (err) {
    next(err);
  }
});


export default router;
