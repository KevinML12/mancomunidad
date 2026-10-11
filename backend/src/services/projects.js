import crypto from 'node:crypto';
import { MUNICIPIOS_MFN } from '../lib/municipios.js';
import prisma from '../lib/prisma.js';
import { ValidationError } from './errors.js';

const fields = ['nombre','municipio','agenciaFinanciadora','fechaInicioPlanificada','fechaFinPlanificada','presupuestoMunicipal','presupuestoCooperacion','estado','porcentajeAvanceFisico'];

export function projectData(body, creating = false) {
  const data = Object.fromEntries(fields.filter(key => body[key] !== undefined).map(key => [key, body[key]]));
  if (creating && (!data.nombre || !data.agenciaFinanciadora || !data.fechaInicioPlanificada || !data.municipio)) throw new ValidationError('Nombre, municipio, agencia y fecha de inicio requeridos');
  for (const key of ['nombre','municipio','agenciaFinanciadora','estado']) if (data[key] !== undefined && (typeof data[key] !== 'string' || !data[key].trim())) throw new ValidationError(`Valor inválido: ${key}`);
  if (data.municipio !== undefined && !MUNICIPIOS_MFN.includes(data.municipio)) throw new ValidationError('Seleccione un municipio activo de la mancomunidad');
  for (const key of ['fechaInicioPlanificada','fechaFinPlanificada']) if (data[key]) { data[key] = new Date(data[key]); if (isNaN(data[key].getTime())) throw new ValidationError('Fecha inválida'); }
  for (const key of ['presupuestoMunicipal','presupuestoCooperacion','porcentajeAvanceFisico']) if (data[key] !== undefined) { data[key] = Number(data[key]); if (!Number.isFinite(data[key]) || data[key] < 0 || (key === 'porcentajeAvanceFisico' && data[key] > 100)) throw new ValidationError('Monto o porcentaje fuera de rango'); }
  return data;
}

const serializeEvidence = row => {
  const { contenido, ...metadata } = row;
  return { ...metadata, urlArchivo: contenido ? `data:${row.tipoMime};base64,${contenido}` : row.urlArchivo, integridadArchivo: contenido ? 'Archivo conservado con SHA-256' : 'Enlace histórico externo sin garantía de integridad' };
};

export const listProjects = () => prisma.proyecto.findMany({ orderBy: { createdAt: 'desc' }, include: { _count: { select: { evidencias: true } } } });

export async function getProject(id) {
  const row = await prisma.proyecto.findUnique({ where: { id }, include: { evidencias: { orderBy: { fechaCaptura: 'desc' } } } });
  return row && { ...row, evidencias: row.evidencias.map(serializeEvidence) };
}

export const createProject = body => prisma.proyecto.create({ data: projectData(body, true) });
export const updateProject = (id, body) => prisma.proyecto.update({ where: { id }, data: projectData(body) });

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
  const row = await prisma.evidenciaProyecto.create({ data: { proyectoId: projectId, urlArchivo: '', contenido: archivoBase64, tipoMime, sha256: crypto.createHash('sha256').update(buffer).digest('hex'), latitud: lat, longitud: lon, descripcion, fechaCaptura: captured, cargadoPorId: userId } });
  return serializeEvidence(row);
}
