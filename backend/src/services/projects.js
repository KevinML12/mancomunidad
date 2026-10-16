import { MUNICIPIOS_MFN } from '../lib/municipios.js';
import prisma, { rawPrisma } from '../lib/prisma.js';
import { ValidationError } from './errors.js';
import { date, chronological, numeric } from './validation.js';
import { mediaUrl, saveMedia } from './media.js';
import { hash } from '../lib/integrity.js';

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

export async function getProject(id) {
  const row = await prisma.proyecto.findUnique({ where: { id }, include: { evidencias: { orderBy: { fechaCaptura: 'desc' } } } });
  if (!row) return null;
  const evidencias = new Array(row.evidencias.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(4, row.evidencias.length) }, async () => {
    while (cursor < row.evidencias.length) {
      const index = cursor++;
      evidencias[index] = await serializeEvidence(row.evidencias[index]);
    }
  }));
  return { ...row, evidencias };
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
  const media = await saveMedia(buffer, tipoMime, 'evidencias');
  return recordProjectEvidence(projectId, userId, { reference: media.reference, sha256: media.sha256, mime: tipoMime }, { latitud: lat, longitud: lon, descripcion, fechaCaptura: captured });
}

export async function recordProjectEvidence(projectId, userId, media, body = {}) {
  const { lat, lon, captured, descripcion } = evidenceDetails(body);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const row = await rawPrisma.$transaction(async tx => {
        const existing = await tx.evidenciaProyecto.findFirst({ where: { urlArchivo: media.reference } });
        if (existing) return existing;
        const created = await tx.evidenciaProyecto.create({ data: { proyectoId: projectId, urlArchivo: media.reference, contenido: null, tipoMime: media.mime, sha256: media.sha256, latitud: lat, longitud: lon, descripcion, fechaCaptura: captured, cargadoPorId: userId } });
        await tx.bitacoraAuditoria.create({ data: { usuarioId: userId, accion: 'create', entidad: 'evidenciaProyecto', entidadId: created.id, despuesHash: hash(created) } });
        return created;
      }, { isolationLevel: 'Serializable' });
      return serializeEvidence(row);
    } catch (error) {
      if (error.code !== 'P2034' || attempt === 2) throw error;
    }
  }
}

export function evidenceDetails(body = {}) {
  const { latitud, longitud, descripcion, fechaCaptura } = body;
  const lat = latitud === null || latitud === undefined || latitud === '' ? null : Number(latitud);
  const lon = longitud === null || longitud === undefined || longitud === '' ? null : Number(longitud);
  if ((lat !== null && (!Number.isFinite(lat) || Math.abs(lat) > 90)) || (lon !== null && (!Number.isFinite(lon) || Math.abs(lon) > 180))) throw new ValidationError('Coordenadas fuera de rango');
  const captured = fechaCaptura ? new Date(fechaCaptura) : new Date();
  if (isNaN(captured.getTime())) throw new ValidationError('Fecha de captura inválida');
  if (descripcion !== undefined && (typeof descripcion !== 'string' || descripcion.length > 3000)) throw new ValidationError('Descripción inválida');
  return { lat, lon, captured, descripcion };
}
