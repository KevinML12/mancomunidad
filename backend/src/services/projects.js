import { MUNICIPIOS_MFN } from '../lib/municipios.js';
import prisma from '../lib/prisma.js';
import { ValidationError } from './errors.js';
import { date, chronological, numeric } from './validation.js';
import { mediaKey, mediaUrl, saveMedia } from './media.js';
import crypto from 'node:crypto';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { storage } from './documents.js';

const fields = ['nombre','municipio','agenciaFinanciadora','fechaInicioPlanificada','fechaFinPlanificada','presupuestoMunicipal','presupuestoCooperacion','estado','porcentajeAvanceFisico'];

export function projectData(body, creating = false) {
  const data = Object.fromEntries(fields.filter(key => body[key] !== undefined).map(key => [key, body[key]]));
  if (creating && (!data.nombre || !data.agenciaFinanciadora || !data.fechaInicioPlanificada || !data.municipio)) throw new ValidationError('Nombre, municipio, agencia y fecha de inicio requeridos');
  for (const key of ['nombre','municipio','agenciaFinanciadora','estado']) if (data[key] !== undefined && (typeof data[key] !== 'string' || !data[key].trim())) throw new ValidationError(`Valor inválido: ${key}`);
  if (data.municipio !== undefined && !MUNICIPIOS_MFN.includes(data.municipio)) throw new ValidationError('Seleccione un municipio activo de la mancomunidad');
  for (const key of ['fechaInicioPlanificada','fechaFinPlanificada']) if (data[key] !== undefined) { data[key] = key === 'fechaFinPlanificada' && (data[key] === '' || data[key] === null) ? null : date(data[key], key); }
  chronological(data.fechaInicioPlanificada, data.fechaFinPlanificada);
  for (const key of ['presupuestoMunicipal','presupuestoCooperacion','porcentajeAvanceFisico']) if (data[key] !== undefined) { data[key] = numeric(data[key], key, { max: key === 'porcentajeAvanceFisico' ? 100 : Number.MAX_SAFE_INTEGER, money: key !== 'porcentajeAvanceFisico' }); }
  return data;
}

const serializeEvidence = async row => {
  const { contenido, ...metadata } = row;
  let urlArchivo = contenido ? `data:${row.tipoMime};base64,${contenido}` : row.urlArchivo;
  if (row.urlArchivo?.startsWith('r2media://')) {
    try { urlArchivo = await mediaUrl(row.urlArchivo); }
    catch { urlArchivo = null; }
  }
  return { ...metadata, urlArchivo, integridadArchivo: row.urlArchivo?.startsWith('r2media://') ? 'Archivo en R2 con SHA-256' : contenido ? 'Archivo heredado en base de datos con SHA-256' : 'Enlace histórico externo sin garantía de integridad' };
};

export const listProjects = () => prisma.proyecto.findMany({ orderBy: { createdAt: 'desc' }, include: { _count: { select: { evidencias: true } } } });

export async function projectSummary() {
  const result = await prisma.proyecto.aggregate({ _count: { _all: true }, _sum: { presupuestoMunicipal: true, presupuestoCooperacion: true }, _avg: { porcentajeAvanceFisico: true } });
  return { total: result._count._all, inversionTotal: (result._sum.presupuestoMunicipal ?? 0) + (result._sum.presupuestoCooperacion ?? 0), avancePromedio: Number((result._avg.porcentajeAvanceFisico ?? 0).toFixed(1)) };
}

export async function listProjectEvidence(id, after) {
  const rows = await prisma.evidenciaProyecto.findMany({
    where: { proyectoId: id },
    orderBy: [{ fechaCaptura: 'desc' }, { id: 'desc' }],
    take: 13,
    ...(after ? { cursor: { id: after }, skip: 1 } : {})
  });
  const page = rows.slice(0, 12);
  const evidencias = new Array(page.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(4, page.length) }, async () => {
    while (cursor < page.length) {
      const index = cursor++;
      evidencias[index] = await serializeEvidence(page[index]);
    }
  }));
  return { evidencias, nextCursor: rows.length > 12 ? page.at(-1).id : null };
}

export async function getProject(id) {
  const row = await prisma.proyecto.findUnique({ where: { id }, include: { _count: { select: { evidencias: true } } } });
  if (!row) return null;
  const { evidencias, nextCursor } = await listProjectEvidence(id);
  return { ...row, evidencias, evidenciasTotal: row._count.evidencias, evidenciasNextCursor: nextCursor };
}

export const createProject = body => prisma.proyecto.create({ data: projectData(body, true) });
export async function updateProject(id, body) {
  const data = projectData(body);
  if ('fechaInicioPlanificada' in data || 'fechaFinPlanificada' in data) {
    const current = await prisma.proyecto.findUnique({ where: { id } });
    if (current) chronological(data.fechaInicioPlanificada ?? current.fechaInicioPlanificada, data.fechaFinPlanificada === undefined ? current.fechaFinPlanificada : data.fechaFinPlanificada);
  }
  return prisma.proyecto.update({ where: { id }, data });
}

export async function addProjectEvidence(projectId, userId, body) {
  if (!Number.isSafeInteger(projectId) || projectId < 1 || !(await prisma.proyecto.findUnique({ where: { id: projectId }, select: { id: true } }))) throw new ValidationError('Proyecto no encontrado');
  const { archivoBase64, tipoMime, latitud, longitud, descripcion, fechaCaptura } = body;
  if (typeof archivoBase64 !== 'string' || archivoBase64.length > 7_000_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(archivoBase64)) throw new ValidationError('Adjunte una fotografía PNG o JPEG de hasta 5 MB');
  const buffer = Buffer.from(archivoBase64, 'base64');
  const png = buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpeg = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
  if (buffer.length > 5 * 1024 * 1024 || !((tipoMime === 'image/png' && png) || (tipoMime === 'image/jpeg' && jpeg)) || buffer.toString('base64') !== archivoBase64) throw new ValidationError('Contenido de fotografía inválido');
  const lat = latitud === null || latitud === undefined || latitud === '' ? null : Number(latitud);
  const lon = longitud === null || longitud === undefined || longitud === '' ? null : Number(longitud);
  if ((lat !== null && (!Number.isFinite(lat) || Math.abs(lat) > 90)) || (lon !== null && (!Number.isFinite(lon) || Math.abs(lon) > 180))) throw new ValidationError('Coordenadas fuera de rango');
  const captured = fechaCaptura ? new Date(fechaCaptura) : new Date();
  if (isNaN(captured.getTime())) throw new ValidationError('Fecha de captura inválida');
  const metadata = evidenceMetadata({ latitud: lat, longitud: lon, descripcion, fechaCaptura: captured });
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  const existing = await prisma.evidenciaProyecto.findFirst({ where: { proyectoId: projectId, sha256 }, orderBy: { id: 'asc' } });
  if (existing) return serializeEvidence(existing);
  const media = await saveMedia(buffer, tipoMime, 'evidencias');
  const saved = await createEvidenceRecord(projectId, userId, media, metadata);
  const persisted = await prisma.evidenciaProyecto.findUnique({ where: { id: saved.id }, select: { urlArchivo: true } });
  if (persisted?.urlArchivo !== media.reference) {
    try { await storage().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: mediaKey(media.reference) })); }
    catch (error) { console.warn('No se pudo limpiar la evidencia duplicada', error.name); }
  }
  return saved;
}

export async function findEvidenceByHash(projectId, sha256) {
  const row = await prisma.evidenciaProyecto.findFirst({ where: { proyectoId: projectId, sha256 }, orderBy: { id: 'asc' } });
  return row ? serializeEvidence(row) : null;
}

export async function createEvidenceRecord(projectId, userId, media, body) {
  const data = evidenceMetadata(body);
  try {
    const row = await prisma.evidenciaProyecto.create({ data: { proyectoId: projectId, urlArchivo: media.reference, contenido: null, tipoMime: media.mime, sha256: media.sha256, dedupeKey: media.sha256, ...data, cargadoPorId: userId } });
    return serializeEvidence(row);
  } catch (error) {
    if (error.code !== 'P2002') throw error;
    const existing = await findEvidenceByHash(projectId, media.sha256);
    if (existing) return existing;
    throw error;
  }
}

export function evidenceMetadata(body) {
  const lat = body.latitud === null || body.latitud === undefined || body.latitud === '' ? null : Number(body.latitud);
  const lon = body.longitud === null || body.longitud === undefined || body.longitud === '' ? null : Number(body.longitud);
  if ((lat !== null && (!Number.isFinite(lat) || Math.abs(lat) > 90)) || (lon !== null && (!Number.isFinite(lon) || Math.abs(lon) > 180))) throw new ValidationError('Coordenadas fuera de rango');
  const captured = body.fechaCaptura ? new Date(body.fechaCaptura) : new Date();
  if (isNaN(captured.getTime())) throw new ValidationError('Fecha de captura inválida');
  if (body.descripcion !== undefined && body.descripcion !== null && (typeof body.descripcion !== 'string' || body.descripcion.length > 3000)) throw new ValidationError('Descripción inválida');
  return { latitud: lat, longitud: lon, descripcion: body.descripcion ?? null, fechaCaptura: captured };
}
