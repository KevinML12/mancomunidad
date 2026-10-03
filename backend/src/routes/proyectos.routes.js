import { MUNICIPIOS_MFN } from '../lib/municipios.js';
import { Router } from 'express';
import crypto from 'node:crypto';
import prisma from '../lib/prisma.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
const router = Router();
router.use(requireAuth, requirePermission('proyectos'));
const fields = ['nombre','municipio','agenciaFinanciadora','fechaInicioPlanificada','fechaFinPlanificada','presupuestoMunicipal','presupuestoCooperacion','estado','porcentajeAvanceFisico'];
function projectData(body, creating = false) {
  const data = Object.fromEntries(fields.filter(key => body[key] !== undefined).map(key => [key, body[key]]));
  if (creating && (!data.nombre || !data.agenciaFinanciadora || !data.fechaInicioPlanificada || !data.municipio)) throw new Error('Nombre, municipio, agencia y fecha de inicio requeridos');
  for (const key of ['nombre','municipio','agenciaFinanciadora','estado']) if (data[key] !== undefined && (typeof data[key] !== 'string' || !data[key].trim())) throw new Error(`Valor inválido: ${key}`);
  if (data.municipio !== undefined && !MUNICIPIOS_MFN.includes(data.municipio)) throw new Error('Seleccione un municipio activo de la mancomunidad');
  for (const key of ['fechaInicioPlanificada','fechaFinPlanificada']) if (data[key]) { data[key] = new Date(data[key]); if (isNaN(data[key].getTime())) throw new Error('Fecha inválida'); }
  for (const key of ['presupuestoMunicipal','presupuestoCooperacion','porcentajeAvanceFisico']) if (data[key] !== undefined) { data[key] = Number(data[key]); if (!Number.isFinite(data[key]) || data[key] < 0 || (key === 'porcentajeAvanceFisico' && data[key] > 100)) throw new Error('Monto o porcentaje fuera de rango'); }
  return data;
}
const serializeEvidence = row => {
  const { contenido, ...metadata } = row;
  return { ...metadata, urlArchivo: contenido ? `data:${row.tipoMime};base64,${contenido}` : row.urlArchivo, integridadArchivo: contenido ? 'Archivo conservado con SHA-256' : 'Enlace histórico externo sin garantía de integridad' };
};
router.get('/', async (req, res, next) => {
 try { res.json(await prisma.proyecto.findMany({ orderBy: { createdAt: 'desc' }, include: { _count: { select: { evidencias: true } } } })); } catch (err) { next(err); }
});
router.get('/:id', async (req, res, next) => {
 try {
  const row = await prisma.proyecto.findUnique({ where: { id: Number(req.params.id) }, include: { evidencias: { orderBy: { fechaCaptura: 'desc' } } } });
  if (!row) return res.status(404).json({ error: 'Proyecto no encontrado' });
  res.json({ ...row, evidencias: row.evidencias.map(serializeEvidence) });
 } catch (err) { next(err); }
});
router.post('/', requirePermission('proyectos', 'editar'), async (req, res, next) => {
 let data; try { data = projectData(req.body, true); } catch (err) { return res.status(400).json({ error: err.message }); }
 try { res.status(201).json(await prisma.proyecto.create({ data })); } catch (err) { next(err); }
});
router.put('/:id', requirePermission('proyectos', 'editar'), async (req, res, next) => {
 let data; try { data = projectData(req.body); } catch (err) { return res.status(400).json({ error: err.message }); }
 try { res.json(await prisma.proyecto.update({ where: { id: Number(req.params.id) }, data })); } catch (err) { next(err); }
});
router.post('/:id/evidencias', requirePermission('proyectos', 'editar'), async (req, res, next) => {
 const { archivoBase64, tipoMime, latitud, longitud, descripcion, fechaCaptura } = req.body;
 if (typeof archivoBase64 !== 'string' || archivoBase64.length > 7_000_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(archivoBase64)) return res.status(400).json({ error: 'Adjunte una fotografía PNG o JPEG de hasta 5 MB' });
 const buffer = Buffer.from(archivoBase64, 'base64');
 const png = buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 const jpeg = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
 if (buffer.length > 5 * 1024 * 1024 || !((tipoMime === 'image/png' && png) || (tipoMime === 'image/jpeg' && jpeg)) || buffer.toString('base64') !== archivoBase64) return res.status(400).json({ error: 'Contenido de fotografía inválido' });
 const lat = latitud === null || latitud === undefined || latitud === '' ? null : Number(latitud);
 const lon = longitud === null || longitud === undefined || longitud === '' ? null : Number(longitud);
 if ((lat !== null && (!Number.isFinite(lat) || Math.abs(lat) > 90)) || (lon !== null && (!Number.isFinite(lon) || Math.abs(lon) > 180))) return res.status(400).json({ error: 'Coordenadas fuera de rango' });
 const captured = fechaCaptura ? new Date(fechaCaptura) : new Date();
 if (isNaN(captured.getTime())) return res.status(400).json({ error: 'Fecha de captura inválida' });
 try {
  const row = await prisma.evidenciaProyecto.create({ data: { proyectoId: Number(req.params.id), urlArchivo: '', contenido: archivoBase64, tipoMime, sha256: crypto.createHash('sha256').update(buffer).digest('hex'), latitud: lat, longitud: lon, descripcion, fechaCaptura: captured, cargadoPorId: req.user.sub } });
  res.status(201).json(serializeEvidence(row));
 } catch (err) { next(err); }
});
export default router;
