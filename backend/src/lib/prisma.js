import { PrismaClient } from '@prisma/client';
import { auditContext, BUSINESS_MODELS, recordHash } from './integrity.js';
export const base = new PrismaClient();
const prisma = base.$extends({ query: { $allModels: { async $allOperations({ model, operation, args, query }) {
  const name = model[0].toLowerCase() + model.slice(1);
  const context = auditContext.getStore();
  if (!context || !BUSINESS_MODELS.includes(name) || !['create', 'update', 'delete'].includes(operation)) return query(args);
  return base.$transaction(async tx => {
    const before = operation === 'create' ? null : await tx[name].findUnique({ where: args.where });
    const result = await tx[name][operation](args);
    const after = operation === 'delete' ? null : await tx[name].findUnique({ where: { id: result.id } });
    await tx.bitacoraAuditoria.create({ data: { usuarioId: context.usuarioId ?? null, accion: operation, entidad: name, entidadId: result.id, antesHash: before ? recordHash(name, before) : null, despuesHash: after ? recordHash(name, after) : null } });
    return result;
  }, { isolationLevel: 'Serializable' });
} } } });
export default prisma;
