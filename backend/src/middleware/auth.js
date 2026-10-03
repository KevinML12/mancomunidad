import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { auditContext } from '../lib/integrity.js';
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'No autenticado' });
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (payload.type !== 'session' || !Number.isInteger(payload.sub)) return res.status(401).json({ error: 'Token inválido para una sesión' });
    const user = await prisma.usuario.findUnique({ where: { id: payload.sub }, include: { rol: true } });
    if (!user || payload.version !== user.sessionVersion) return res.status(401).json({ error: 'Sesión revocada' });
    req.user = { sub: user.id, rol: user.rol.codigo, permisos: user.rol.permisos, nombre: payload.nombre, colaboradorId: user.colaboradorId };
    return auditContext.run({ usuarioId: user.id }, next);
  } catch (err) {
    if (['JsonWebTokenError','TokenExpiredError','NotBeforeError'].includes(err.name)) return res.status(401).json({ error: 'Token inválido o expirado' });
    return next(err);
  }
}
export function requirePermission(modulo, accion = null) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    const permisos = req.user.permisos;
    if (!permisos?.modulos?.includes(modulo) || (accion && !permisos[accion]?.includes(modulo))) return res.status(403).json({ error: 'No autorizado para esta operación' });
    next();
  };
}
