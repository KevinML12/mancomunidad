import prisma from './prisma.js';
export async function logAction(usuarioId, accion, entidad, entidadId) {
  return prisma.bitacoraAuditoria.create({ data: { usuarioId: usuarioId ?? null, accion, entidad: entidad ?? null, entidadId: entidadId ?? null } });
}
