import { Router } from 'express';
import { rateLimit } from '../../middleware/rate-limit.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { logAction } from '../../lib/audit.js';
import { resetDeliveryConfigured } from '../../services/reset-delivery.js';
import { requestPasswordReset, completePasswordReset } from '../../services/password-recovery.js';
import { setSessionCookie, clearSessionCookie } from '../../lib/session-cookie.js';

const router = Router();

const displayName = (usuario) => usuario.colaborador?.nombre || usuario.rol.nombre;

function serialize(usuario) {
  return {
    id: usuario.id,
    correo: usuario.correo,
    rol: usuario.rol.codigo,
    rolNombre: usuario.rol.nombre,
    permisos: usuario.rol.permisos,
    nombre: displayName(usuario),
    puesto: usuario.colaborador?.puesto?.nombre || null,
    colaboradorId: usuario.colaboradorId,
    municipios: usuario.municipios.map(row => row.municipio),
    mustChangePassword: usuario.mustChangePassword,
  };
}

router.post('/login', rateLimit(30, undefined, { scope: 'login-ip' }), rateLimit(10, undefined, { scope: 'login-account', keyFrom: req => req.body?.correo }), async (req, res, next) => {
  try {
  const { correo, contrasena } = req.body;
  if (!correo || !contrasena) return res.status(400).json({ error: 'Correo y contraseña son requeridos' });

  const usuario = await prisma.usuario.findUnique({
    where: { correo },
    include: { colaborador: { include: { puesto: true } }, rol: true, municipios: { select: { municipio: true } } },
  });
  if (!usuario) return res.status(401).json({ error: 'Credenciales inválidas' });

  const ok = await bcrypt.compare(contrasena, usuario.hashContrasena);
  if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

  const token = jwt.sign(
    { type: 'session', version: usuario.sessionVersion, sub: usuario.id, rol: usuario.rol.codigo, permisos: usuario.rol.permisos, nombre: displayName(usuario), colaboradorId: usuario.colaboradorId },
    process.env.JWT_SECRET,
    { expiresIn: '12h' },
  );

  await logAction(usuario.id, 'login', 'usuario', usuario.id);

  setSessionCookie(res, token);
  res.json({ user: serialize(usuario) });
  } catch (err) { next(err); }
});

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    // The cookie is only one copy of the JWT. Incrementing the version also
    // rejects a copied cookie or bearer token after logout.
    await prisma.$transaction(async tx => {
      await tx.usuario.update({ where: { id: req.user.sub }, data: { sessionVersion: { increment: 1 } } });
      await tx.bitacoraAuditoria.create({ data: { usuarioId: req.user.sub, accion: 'cerrar_sesiones', entidad: 'usuario', entidadId: req.user.sub } });
    });
    clearSessionCookie(res);
    res.json({ ok: true });
  } catch (error) { next(error); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.user.sub },
    include: { colaborador: { include: { puesto: true } }, rol: true, municipios: { select: { municipio: true } } },
  });
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(serialize(usuario));
  } catch (err) { next(err); }
});

router.get('/roles', requireAuth, async (req, res, next) => {
  try {
  const roles = await prisma.rol.findMany({ select: { id: true, codigo: true, nombre: true, descripcion: true } });
  res.json(roles);
  } catch (err) { next(err); }
});

router.post('/password', requireAuth, rateLimit(5, 15 * 60_000, { scope: 'change-password', keyFrom: req => req.user.sub }), async (req, res, next) => {
  try {
    const { contrasenaActual, nuevaContrasena } = req.body || {};
    if (typeof contrasenaActual !== 'string' || typeof nuevaContrasena !== 'string' || nuevaContrasena.length < 12 || Buffer.byteLength(nuevaContrasena, 'utf8') > 72 || contrasenaActual === nuevaContrasena) {
      return res.status(400).json({ error: 'Indique la contraseña actual y una nueva de 12 caracteres como mínimo y 72 bytes como máximo' });
    }
    const usuario = await prisma.usuario.findUnique({ where: { id: req.user.sub }, select: { hashContrasena: true } });
    if (!usuario || !(await bcrypt.compare(contrasenaActual, usuario.hashContrasena))) return res.status(400).json({ error: 'Contraseña actual incorrecta' });
    const hashContrasena = await bcrypt.hash(nuevaContrasena, 10);
    await prisma.$transaction(async tx => {
      await tx.usuario.update({ where: { id: req.user.sub }, data: { hashContrasena, mustChangePassword: false, sessionVersion: { increment: 1 } } });
      await tx.recuperacionClave.updateMany({ where: { usuarioId: req.user.sub, usado: false }, data: { usado: true } });
      await tx.bitacoraAuditoria.create({ data: { usuarioId: req.user.sub, accion: 'cambiar_clave', entidad: 'usuario', entidadId: req.user.sub } });
    });
    clearSessionCookie(res);
    res.json({ ok: true });
  } catch (error) { next(error); }
});


// Tokens are delivered only to the account owner's configured email channel.
router.post('/recuperar', rateLimit(10), async (req, res, next) => {
  const { correo } = req.body;
  if (typeof correo !== 'string' || !correo.trim()) return res.status(400).json({ error: 'Correo requerido' });
  if (!resetDeliveryConfigured()) return res.status(503).json({ error: 'La recuperación por correo aún no está configurada. Contacte a la administración.' });
  try {
    await requestPasswordReset(correo);
    res.json({ mensaje: 'Si la cuenta existe y la entrega está disponible, recibirá un código por correo. Válido por 15 minutos.' });
  } catch (err) { next(err); }
});
router.post('/restablecer', rateLimit(10), async (req, res, next) => {
  const { token, nuevaContrasena } = req.body;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token) || typeof nuevaContrasena !== 'string' || nuevaContrasena.length < 12 || Buffer.byteLength(nuevaContrasena, 'utf8') > 72) return res.status(400).json({ error: 'Código válido y contraseña de al menos 12 caracteres y hasta 72 bytes requerida' });
  try {
    const changed = await completePasswordReset(token, nuevaContrasena);
    if (!changed) return res.status(401).json({ error: 'Código inválido, usado o expirado' });
    res.json({ ok: true, mensaje: 'Contraseña actualizada. Inicie una nueva sesión.' });
  } catch (err) { next(err); }
});
export default router;
