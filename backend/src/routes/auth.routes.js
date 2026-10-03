import { Router } from 'express';
import { rateLimit } from '../middleware/rate-limit.js';
import crypto from 'node:crypto';
import { tokenHash } from '../lib/integrity.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { logAction } from '../lib/audit.js';

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
  };
}

router.post('/login', rateLimit(30), async (req, res, next) => {
  try {
  const { correo, contrasena } = req.body;
  if (!correo || !contrasena) return res.status(400).json({ error: 'Correo y contraseña son requeridos' });

  const usuario = await prisma.usuario.findUnique({
    where: { correo },
    include: { colaborador: { include: { puesto: true } }, rol: true },
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

  res.json({ token, user: serialize(usuario) });
  } catch (err) { next(err); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.user.sub },
    include: { colaborador: { include: { puesto: true } }, rol: true },
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


// Tokens are delivered only to the account owner's configured email channel.
router.post('/recuperar', rateLimit(10), async (req, res, next) => {
  const { correo } = req.body;
  if (typeof correo !== 'string' || !correo.trim()) return res.status(400).json({ error: 'Correo requerido' });
  if (!process.env.RESET_DELIVERY_URL || !process.env.RESET_DELIVERY_SECRET) return res.status(503).json({ error: 'La recuperación por correo aún no está configurada. Contacte a la administración.' });
  try {
    const usuario = await prisma.usuario.findUnique({ where: { correo: correo.trim().toLowerCase() } });
    if (usuario) {
      const token = crypto.randomBytes(32).toString('hex');
      const record = await prisma.$transaction(async tx => {
        await tx.recuperacionClave.updateMany({ where: { usuarioId: usuario.id, usado: false }, data: { usado: true } });
        return tx.recuperacionClave.create({ data: { usuarioId: usuario.id, tokenHash: tokenHash(token), expira: new Date(Date.now() + 15 * 60_000) } });
      });
      try {
        const endpoint = new URL(process.env.RESET_DELIVERY_URL);
        if (endpoint.protocol !== 'https:' && process.env.NODE_ENV !== 'test') throw new Error('Entrega requiere HTTPS');
        const delivery = await fetch(endpoint, { method: 'POST', signal: AbortSignal.timeout(10000), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESET_DELIVERY_SECRET}` }, body: JSON.stringify({ correo: usuario.correo, token, expira: record.expira }) });
        if (!delivery.ok) throw new Error('Entrega fallida');
      } catch {
        await prisma.recuperacionClave.update({ where: { id: record.id }, data: { usado: true } });
        // Never reveal account existence or a reset secret to the requester.
      }
    }
    res.json({ mensaje: 'Si la cuenta existe y la entrega está disponible, recibirá un código por correo. Válido por 15 minutos.' });
  } catch (err) { next(err); }
});
router.post('/restablecer', rateLimit(10), async (req, res, next) => {
  const { token, nuevaContrasena } = req.body;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token) || typeof nuevaContrasena !== 'string' || nuevaContrasena.length < 12 || Buffer.byteLength(nuevaContrasena, 'utf8') > 72) return res.status(400).json({ error: 'Código válido y contraseña de al menos 12 caracteres y hasta 72 bytes requerida' });
  try {
    const passwordHash = await bcrypt.hash(nuevaContrasena, 10);
    const changed = await prisma.$transaction(async tx => {
      const record = await tx.recuperacionClave.findUnique({ where: { tokenHash: tokenHash(token) } });
      if (!record) return false;
      const consumed = await tx.recuperacionClave.updateMany({ where: { id: record.id, usado: false, expira: { gt: new Date() } }, data: { usado: true } });
      if (consumed.count !== 1) return false;
      await tx.usuario.update({ where: { id: record.usuarioId }, data: { hashContrasena: passwordHash, sessionVersion: { increment: 1 } } });
      await tx.recuperacionClave.updateMany({ where: { usuarioId: record.usuarioId, usado: false }, data: { usado: true } });
      await tx.bitacoraAuditoria.create({ data: { usuarioId: record.usuarioId, accion: 'restablecer_clave', entidad: 'usuario', entidadId: record.usuarioId } });
      return true;
    });
    if (!changed) return res.status(401).json({ error: 'Código inválido, usado o expirado' });
    res.json({ ok: true, mensaje: 'Contraseña actualizada. Inicie una nueva sesión.' });
  } catch (err) { next(err); }
});
export default router;
