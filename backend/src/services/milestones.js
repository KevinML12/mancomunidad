import { rawPrisma } from '../lib/prisma.js';
import { hash } from '../lib/integrity.js';
import { date, numeric, text } from './validation.js';
import { ValidationError } from './errors.js';

const points = value => Math.round(value * 100);
const totalPoints = rows => rows.reduce((sum, row) => sum + points(row.pesoPorcentaje), 0);

async function serializable(work) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await rawPrisma.$transaction(work, { isolationLevel: 'Serializable' }); }
    catch (error) {
      if (error.code !== 'P2034' || attempt === 2) throw error;
    }
  }
}

export function milestoneProgress(hitos, now = new Date()) {
  if (!hitos.length) return { metodo: 'Sin plan de hitos', programado: null, aprobado: null, pesoConfigurado: 0 };
  return {
    metodo: 'Hitos ponderados aprobados',
    programado: totalPoints(hitos.filter(hito => new Date(hito.fechaPlanificada) <= now)) / 100,
    aprobado: totalPoints(hitos.filter(hito => hito.estado === 'Aprobado')) / 100,
    pesoConfigurado: totalPoints(hitos) / 100,
  };
}

function milestoneData(body) {
  return {
    nombre: text(body?.nombre, 'Nombre del hito', { max: 180 }),
    pesoPorcentaje: numeric(body?.pesoPorcentaje, 'Peso del hito', { min: 0.01, max: 100, money: true }),
    fechaPlanificada: date(body?.fechaPlanificada, 'Fecha planificada del hito'),
  };
}

function validateSchedule(project, plannedDate) {
  if (plannedDate < project.fechaInicioPlanificada ||
      (project.fechaFinPlanificada && plannedDate > project.fechaFinPlanificada)) {
    throw new ValidationError('La fecha del hito debe estar dentro del período planificado del proyecto');
  }
}

export async function createMilestone(projectId, userId, body) {
  const data = milestoneData(body);
  return serializable(async tx => {
    const project = await tx.proyecto.findUnique({ where: { id: projectId }, include: { hitos: true } });
    if (!project) throw new ValidationError('Proyecto no encontrado');
    validateSchedule(project, data.fechaPlanificada);
    if (totalPoints(project.hitos) + points(data.pesoPorcentaje) > 10000) throw new ValidationError('La suma de los pesos no puede superar el 100 %');
    const hito = await tx.hitoProyecto.create({ data: { proyectoId: projectId, ...data } });
    await tx.bitacoraAuditoria.create({ data: { usuarioId: userId, accion: 'crear_hito', entidad: 'hitoProyecto', entidadId: hito.id, despuesHash: hash(hito) } });
    return hito;
  });
}

export async function updateMilestone(projectId, hitoId, userId, body) {
  const data = milestoneData(body);
  return serializable(async tx => {
    const [project, hito] = await Promise.all([
      tx.proyecto.findUnique({ where: { id: projectId }, include: { hitos: true } }),
      tx.hitoProyecto.findUnique({ where: { id: hitoId } }),
    ]);
    if (!project || !hito || hito.proyectoId !== projectId) throw new ValidationError('Hito no encontrado');
    if (hito.estado === 'Aprobado') throw new ValidationError('Reabra el hito antes de modificarlo');
    validateSchedule(project, data.fechaPlanificada);
    if (totalPoints(project.hitos.filter(row => row.id !== hitoId)) + points(data.pesoPorcentaje) > 10000) throw new ValidationError('La suma de los pesos no puede superar el 100 %');
    const changed = await tx.hitoProyecto.update({ where: { id: hitoId }, data });
    await tx.bitacoraAuditoria.create({ data: { usuarioId: userId, accion: 'actualizar_hito', entidad: 'hitoProyecto', entidadId: hitoId, antesHash: hash(hito), despuesHash: hash(changed) } });
    return changed;
  });
}

export async function approveMilestone(projectId, hitoId, userId, approve = true) {
  return serializable(async tx => {
    const project = await tx.proyecto.findUnique({ where: { id: projectId }, include: { hitos: true } });
    const hito = project?.hitos.find(row => row.id === hitoId);
    if (!hito) throw new ValidationError('Hito no encontrado');
    if (totalPoints(project.hitos) !== 10000) throw new ValidationError('Complete el 100 % de los pesos antes de aprobar hitos');
    if (approve === (hito.estado === 'Aprobado')) throw new ValidationError(approve ? 'El hito ya fue aprobado' : 'El hito ya está pendiente');
    if (approve && !(await tx.evidenciaProyecto.count({ where: { hitoId } }))) throw new ValidationError('Adjunte evidencia al hito antes de aprobarlo');
    const changed = await tx.hitoProyecto.update({ where: { id: hitoId }, data: {
      estado: approve ? 'Aprobado' : 'Pendiente',
      fechaAprobacion: approve ? new Date() : null,
      aprobadoPorId: approve ? userId : null,
    } });
    const hitos = project.hitos.map(row => row.id === hitoId ? changed : row);
    const percentage = milestoneProgress(hitos).aprobado;
    await tx.proyecto.update({ where: { id: projectId }, data: { porcentajeAvanceFisico: percentage } });
    await tx.bitacoraAuditoria.create({ data: { usuarioId: userId, accion: approve ? 'aprobar_hito' : 'reabrir_hito', entidad: 'hitoProyecto', entidadId: hitoId,
      antesHash: hash(hito), despuesHash: hash(changed) } });
    return { hito: changed, porcentajeAvanceFisico: percentage };
  });
}

export async function deleteMilestone(projectId, hitoId, userId) {
  return serializable(async tx => {
    const hito = await tx.hitoProyecto.findUnique({ where: { id: hitoId }, include: { _count: { select: { evidencias: true } } } });
    if (!hito || hito.proyectoId !== projectId) throw new ValidationError('Hito no encontrado');
    if (hito.estado === 'Aprobado' || hito._count.evidencias) throw new ValidationError('No se puede eliminar un hito aprobado o con evidencias');
    await tx.hitoProyecto.delete({ where: { id: hitoId } });
    await tx.bitacoraAuditoria.create({ data: { usuarioId: userId, accion: 'eliminar_hito', entidad: 'hitoProyecto', entidadId: hitoId, antesHash: hash(hito) } });
    return { ok: true };
  });
}
