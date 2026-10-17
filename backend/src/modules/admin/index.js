import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import prisma from '../../lib/prisma.js';
import { requireAuth, requireAppAdmin } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { mediaExists, mediaUrl, saveMedia } from '../../services/media.js';
import { ValidationError } from '../../services/errors.js';
import { logAction } from '../../lib/audit.js';
import { hash } from '../../lib/integrity.js';
import { MUNICIPIOS_MFN } from '../../lib/municipios.js';
import { MODULE_KEYS, MODULE_LABELS, validRolePermissions } from '../../lib/roles.js';
import { pageWindow, sendPage } from '../../lib/pagination.js';

const router = Router();
router.use(requireAuth, requireAppAdmin);

const TYPES = new Set(['Aviso', 'Proyecto', 'Acta', 'Estadística', 'Finanzas', 'Convocatoria', 'Documento']);
function validateMunicipios(value) {
  if (!Array.isArray(value) || value.length > MUNICIPIOS_MFN.length ||
      value.some(municipio => typeof municipio !== 'string' || !MUNICIPIOS_MFN.includes(municipio)) ||
      new Set(value).size !== value.length) throw new ValidationError('Seleccione municipios activos sin duplicados');
  return value;
}
function publicationData(body, partial = false) {
  const data = {};
  for (const field of ['tipo', 'titulo', 'resumen']) {
    if (body[field] === undefined && partial) continue;
    if (typeof body[field] !== 'string' || !body[field].trim()) throw new ValidationError(`${field} es obligatorio`);
    data[field] = body[field].trim();
  }
  if (data.tipo && !TYPES.has(data.tipo)) throw new ValidationError('Tipo de publicación inválido');
  if (data.titulo?.length > 160 || data.resumen?.length > 3000) throw new ValidationError('El texto de la publicación es demasiado largo');
  if (body.referenciaId !== undefined) {
    const id = Number(body.referenciaId);
    if (body.referenciaId !== null && (!Number.isSafeInteger(id) || id < 1)) throw new ValidationError('Referencia inválida');
    data.referenciaId = body.referenciaId === null ? null : id;
  }
  if (body.visibilidad !== undefined) {
    if (typeof body.visibilidad !== 'boolean') throw new ValidationError('Visibilidad inválida');
    data.visibilidad = body.visibilidad;
  }
  if (body.mediaRef !== undefined) {
    if (body.mediaRef !== null && (typeof body.mediaRef !== 'string' || !body.mediaRef.startsWith('r2media://publicaciones/'))) throw new ValidationError('Archivo inválido');
    data.mediaRef = body.mediaRef;
  }
  return data;
}

router.get('/overview', async (_req, res, next) => {
  try {
    const [usuarios, roles, publicaciones, visibles] = await Promise.all([
      prisma.usuario.count(), prisma.rol.count(), prisma.publicacionTransparencia.count(),
      prisma.publicacionTransparencia.count({ where: { visibilidad: true, tipo: { not: 'SolicitudUIP' } } }),
    ]);
    res.json({ usuarios, roles, publicaciones, visibles });
  } catch (error) { next(error); }
});

router.get('/users', async (req, res, next) => {
  try {
    const page = pageWindow(req.query);
    const rows = await prisma.usuario.findMany({
      select: { id: true, correo: true, createdAt: true, rol: { select: { codigo: true, nombre: true } }, municipios: { select: { municipio: true } } },
      orderBy: { id: 'asc' }, skip: page.skip, take: page.take,
    });
    sendPage(res, rows, page);
  } catch (error) { next(error); }
});

router.get('/roles', async (_req, res, next) => {
  try {
    res.json(await prisma.rol.findMany({ select: { id: true, codigo: true, nombre: true, descripcion: true, permisos: true }, orderBy: { nombre: 'asc' } }));
  } catch (error) { next(error); }
});

router.get('/modules', (_req, res) => res.json(MODULE_KEYS.map(key => ({ key, label: MODULE_LABELS[key] }))));

router.patch('/roles/:id/permissions', rateLimit(10, 15 * 60_000, { scope: 'admin-role-permissions', keyFrom: req => req.user.sub }), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { permisos, contrasenaAdministrador } = req.body || {};
    if (!Number.isSafeInteger(id) || id < 1 || !validRolePermissions(permisos) || typeof contrasenaAdministrador !== 'string') {
      throw new ValidationError('Seleccione un rol, módulos y prioridades válidos; confirme con su contraseña');
    }
    const actor = await prisma.usuario.findUnique({ where: { id: req.user.sub }, select: { hashContrasena: true, rolId: true } });
    if (!actor || !(await bcrypt.compare(contrasenaAdministrador, actor.hashContrasena))) {
      return res.status(403).json({ error: 'Contraseña de administración incorrecta' });
    }
    const previous = await prisma.rol.findUnique({ where: { id }, select: { permisos: true } });
    if (!previous) throw new ValidationError('Rol no encontrado');
    const updated = await prisma.$transaction(async tx => {
      const role = await tx.rol.update({ where: { id }, data: { permisos }, select: { id: true, codigo: true, nombre: true, descripcion: true, permisos: true } });
      await tx.usuario.updateMany({ where: { rolId: id }, data: { sessionVersion: { increment: 1 } } });
      await tx.bitacoraAuditoria.create({ data: { usuarioId: req.user.sub, accion: 'cambiar_permisos_rol', entidad: 'rol', entidadId: id,
        antesHash: hash(previous.permisos), despuesHash: hash(permisos) } });
      return role;
    });
    res.json({ ...updated, requiresReauth: actor.rolId === id });
  } catch (error) { next(error); }
});

router.get('/municipalities', (_req, res) => res.json(MUNICIPIOS_MFN));

router.post('/users', rateLimit(5, 15 * 60_000, { scope: 'admin-create-user', keyFrom: req => req.user.sub }), async (req, res, next) => {
  try {
    const { correo, contrasena, rolId, contrasenaAdministrador } = req.body || {};
    const municipios = validateMunicipios(req.body?.municipios ?? []);
    const normalizedEmail = typeof correo === 'string' ? correo.trim().toLowerCase() : '';
    if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
        typeof contrasena !== 'string' || contrasena.length < 12 || Buffer.byteLength(contrasena, 'utf8') > 72 ||
        !Number.isSafeInteger(rolId) || rolId < 1 || typeof contrasenaAdministrador !== 'string') {
      throw new ValidationError('Correo, rol y contraseña nueva de 12 a 72 bytes válidos son requeridos');
    }
    const actor = await prisma.usuario.findUnique({ where: { id: req.user.sub }, select: { hashContrasena: true } });
    if (!actor || !(await bcrypt.compare(contrasenaAdministrador, actor.hashContrasena))) return res.status(403).json({ error: 'Contraseña de administración incorrecta' });
    const rol = await prisma.rol.findUnique({ where: { id: rolId }, select: { id: true } });
    if (!rol) throw new ValidationError('Rol no encontrado');
    const hashContrasena = await bcrypt.hash(contrasena, 10);
    const user = await prisma.$transaction(async tx => {
      const created = await tx.usuario.create({ data: { correo: normalizedEmail, hashContrasena, rolId, mustChangePassword: true,
        municipios: { create: municipios.map(municipio => ({ municipio })) } },
      select: { id: true, correo: true, rol: { select: { nombre: true, codigo: true } }, municipios: { select: { municipio: true } } } });
      await tx.bitacoraAuditoria.create({ data: { usuarioId: req.user.sub, accion: 'crear_usuario', entidad: 'usuario', entidadId: created.id } });
      return created;
    });
    res.status(201).json(user);
  } catch (error) { next(error); }
});

router.post('/users/:id/revoke-sessions', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1 || id === req.user.sub) throw new ValidationError('Seleccione otra cuenta válida');
    const user = await prisma.usuario.update({ where: { id }, data: { sessionVersion: { increment: 1 } }, select: { id: true, correo: true } });
    await logAction(req.user.sub, 'revocar_sesiones', 'usuario', id);
    res.json({ ok: true, usuario: user.correo });
  } catch (error) { next(error); }
});

router.patch('/users/:id/role', rateLimit(10, 15 * 60_000, { scope: 'admin-change-role', keyFrom: req => req.user.sub }), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { rolId, contrasenaAdministrador } = req.body || {};
    if (!Number.isSafeInteger(id) || id < 1 || id === req.user.sub ||
        !Number.isSafeInteger(rolId) || rolId < 1 || typeof contrasenaAdministrador !== 'string') {
      throw new ValidationError('Seleccione otra cuenta, un rol válido y confirme con su contraseña');
    }
    const actor = await prisma.usuario.findUnique({ where: { id: req.user.sub }, select: { hashContrasena: true } });
    if (!actor || !(await bcrypt.compare(contrasenaAdministrador, actor.hashContrasena))) {
      return res.status(403).json({ error: 'Contraseña de administración incorrecta' });
    }
    const [target, role] = await Promise.all([
      prisma.usuario.findUnique({ where: { id }, select: { rolId: true } }),
      prisma.rol.findUnique({ where: { id: rolId }, select: { id: true } }),
    ]);
    if (!target || !role) throw new ValidationError('Cuenta o rol no encontrado');
    if (target.rolId === rolId) throw new ValidationError('La cuenta ya tiene ese rol');
    const changed = await prisma.$transaction(async tx => {
      const user = await tx.usuario.update({
        where: { id }, data: { rolId, sessionVersion: { increment: 1 } },
        select: { id: true, correo: true, rol: { select: { codigo: true, nombre: true } } },
      });
      await tx.bitacoraAuditoria.create({
        data: { usuarioId: req.user.sub, accion: 'cambiar_rol_usuario', entidad: 'usuario', entidadId: id,
          antesHash: hash({ rolId: target.rolId }), despuesHash: hash({ rolId }) },
      });
      return user;
    });
    res.json(changed);
  } catch (error) { next(error); }
});

router.patch('/users/:id/municipalities', rateLimit(10, 15 * 60_000, { scope: 'admin-change-municipalities', keyFrom: req => req.user.sub }), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const municipios = validateMunicipios(req.body?.municipios);
    const contrasenaAdministrador = req.body?.contrasenaAdministrador;
    if (!Number.isSafeInteger(id) || id < 1 || id === req.user.sub || typeof contrasenaAdministrador !== 'string') {
      throw new ValidationError('Seleccione otra cuenta y confirme con su contraseña');
    }
    const actor = await prisma.usuario.findUnique({ where: { id: req.user.sub }, select: { hashContrasena: true } });
    if (!actor || !(await bcrypt.compare(contrasenaAdministrador, actor.hashContrasena))) {
      return res.status(403).json({ error: 'Contraseña de administración incorrecta' });
    }
    const target = await prisma.usuario.findUnique({ where: { id }, select: { municipios: { select: { municipio: true } } } });
    if (!target) throw new ValidationError('Cuenta no encontrada');
    const previous = target.municipios.map(row => row.municipio).sort();
    const updated = await prisma.$transaction(async tx => {
      await tx.usuarioMunicipio.deleteMany({ where: { usuarioId: id } });
      if (municipios.length) await tx.usuarioMunicipio.createMany({ data: municipios.map(municipio => ({ usuarioId: id, municipio })) });
      const user = await tx.usuario.update({ where: { id }, data: { sessionVersion: { increment: 1 } },
        select: { id: true, correo: true, municipios: { select: { municipio: true } } } });
      await tx.bitacoraAuditoria.create({ data: { usuarioId: req.user.sub, accion: 'cambiar_municipios_usuario', entidad: 'usuario', entidadId: id,
        antesHash: hash({ municipios: previous }), despuesHash: hash({ municipios: [...municipios].sort() }) } });
      return user;
    });
    res.json(updated);
  } catch (error) { next(error); }
});

router.post('/users/:id/password', rateLimit(5, 15 * 60_000, { scope: 'admin-reset-password', keyFrom: req => req.user.sub }), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { nuevaContrasena, contrasenaAdministrador } = req.body || {};
    if (!Number.isSafeInteger(id) || id < 1 || id === req.user.sub || typeof nuevaContrasena !== 'string' || nuevaContrasena.length < 12 || Buffer.byteLength(nuevaContrasena, 'utf8') > 72 || typeof contrasenaAdministrador !== 'string') {
      throw new ValidationError('Seleccione otra cuenta e indique una contraseña nueva de 12 a 72 bytes');
    }
    const actor = await prisma.usuario.findUnique({ where: { id: req.user.sub }, select: { hashContrasena: true } });
    if (!actor || !(await bcrypt.compare(contrasenaAdministrador, actor.hashContrasena))) return res.status(403).json({ error: 'Contraseña de administración incorrecta' });
    const hashContrasena = await bcrypt.hash(nuevaContrasena, 10);
    await prisma.$transaction(async tx => {
      await tx.usuario.update({ where: { id }, data: { hashContrasena, mustChangePassword: true, sessionVersion: { increment: 1 } } });
      await tx.recuperacionClave.updateMany({ where: { usuarioId: id, usado: false }, data: { usado: true } });
      await tx.bitacoraAuditoria.create({ data: { usuarioId: req.user.sub, accion: 'rotar_clave_usuario', entidad: 'usuario', entidadId: id } });
    });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

router.get('/publicaciones', async (req, res, next) => {
  try {
    const page = pageWindow(req.query);
    sendPage(res, await prisma.publicacionTransparencia.findMany({
      where: { tipo: { not: 'SolicitudUIP' } }, orderBy: [{ fechaPublicacion: 'desc' }, { id: 'desc' }], skip: page.skip, take: page.take,
    }), page);
  } catch (error) { next(error); }
});

router.post('/media', rateLimit(20, undefined, { scope: 'admin-media', keyFrom: req => req.user.sub }), async (req, res, next) => {
  try {
    const { archivoBase64, tipoMime } = req.body;
    if (typeof archivoBase64 !== 'string' || archivoBase64.length > 7_000_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(archivoBase64)) throw new ValidationError('Seleccione un archivo válido de hasta 5 MB');
    const buffer = Buffer.from(archivoBase64, 'base64');
    if (buffer.toString('base64') !== archivoBase64) throw new ValidationError('Archivo inválido');
    res.status(201).json(await saveMedia(buffer, tipoMime, 'publicaciones'));
  } catch (error) { next(error); }
});

router.post('/publicaciones', async (req, res, next) => {
  try {
    const data = publicationData(req.body);
    if (data.mediaRef && !(await mediaExists(data.mediaRef))) throw new ValidationError('El archivo no está disponible en R2');
    const created = await prisma.publicacionTransparencia.create({ data: {
      ...data, codigo: `PUB-${new Date().getFullYear()}-${randomBytes(5).toString('hex').toUpperCase()}`,
      visibilidad: false, autorizadoPor: req.user.nombre || req.user.correo,
    } });
    res.status(201).json(created);
  } catch (error) { next(error); }
});

router.patch('/publicaciones/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) throw new ValidationError('Publicación inválida');
    const existing = await prisma.publicacionTransparencia.findUnique({ where: { id } });
    if (!existing || existing.tipo === 'SolicitudUIP') return res.status(404).json({ error: 'Publicación no encontrada' });
    const data = publicationData(req.body, true);
    if (!Object.keys(data).length) throw new ValidationError('No hay cambios');
    if (data.mediaRef && !(await mediaExists(data.mediaRef))) throw new ValidationError('El archivo no está disponible en R2');
    res.json(await prisma.publicacionTransparencia.update({ where: { id }, data }));
  } catch (error) { next(error); }
});

router.get('/publicaciones/:id/media', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) throw new ValidationError('Publicación inválida');
    const row = await prisma.publicacionTransparencia.findUnique({ where: { id }, select: { mediaRef: true, tipo: true } });
    if (!row?.mediaRef || row.tipo === 'SolicitudUIP') return res.status(404).json({ error: 'Archivo no encontrado' });
    res.set('Cache-Control', 'no-store').redirect(302, await mediaUrl(row.mediaRef));
  } catch (error) { next(error); }
});

export default router;
