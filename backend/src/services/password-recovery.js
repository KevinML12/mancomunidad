import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { tokenHash } from '../lib/integrity.js';
import prisma from '../lib/prisma.js';
import { deliverResetCode } from './reset-delivery.js';

export async function requestPasswordReset(correo) {
  const usuario = await prisma.usuario.findUnique({ where: { correo: correo.trim().toLowerCase() } });
  if (!usuario) return;

  const token = crypto.randomBytes(32).toString('hex');
  const record = await prisma.$transaction(async tx => {
    await tx.recuperacionClave.updateMany({ where: { usuarioId: usuario.id, usado: false }, data: { usado: true } });
    return tx.recuperacionClave.create({
      data: { usuarioId: usuario.id, tokenHash: tokenHash(token), expira: new Date(Date.now() + 15 * 60_000) },
    });
  });

  try {
    await deliverResetCode({ correo: usuario.correo, token, expira: record.expira });
  } catch {
    await prisma.recuperacionClave.update({ where: { id: record.id }, data: { usado: true } });
    // Keep the response identical whether an account exists or delivery fails.
  }
}

export async function completePasswordReset(token, nuevaContrasena) {
  const passwordHash = await bcrypt.hash(nuevaContrasena, 10);
  return prisma.$transaction(async tx => {
    const record = await tx.recuperacionClave.findUnique({ where: { tokenHash: tokenHash(token) } });
    if (!record) return false;
    const consumed = await tx.recuperacionClave.updateMany({
      where: { id: record.id, usado: false, expira: { gt: new Date() } },
      data: { usado: true },
    });
    if (consumed.count !== 1) return false;
    await tx.usuario.update({
      where: { id: record.usuarioId },
      data: { hashContrasena: passwordHash, sessionVersion: { increment: 1 } },
    });
    await tx.recuperacionClave.updateMany({ where: { usuarioId: record.usuarioId, usado: false }, data: { usado: true } });
    await tx.bitacoraAuditoria.create({
      data: { usuarioId: record.usuarioId, accion: 'restablecer_clave', entidad: 'usuario', entidadId: record.usuarioId },
    });
    return true;
  });
}
