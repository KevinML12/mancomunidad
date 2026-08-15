import prisma from './prisma.js';

// RNF-01/03: toda escritura queda trazada (bitacora_auditoria, Cap. V 5.2).
export async function logAction(usuarioId, accion, entidad, entidadId) {
  try {
    await prisma.bitacoraAuditoria.create({
      data: { usuarioId: usuarioId ?? null, accion, entidad: entidad ?? null, entidadId: entidadId ?? null },
    });
  } catch (err) {
    console.error('No se pudo escribir la bitácora:', err.message);
  }
}
