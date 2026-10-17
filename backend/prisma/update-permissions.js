import { PrismaClient } from '@prisma/client';
import { ROLE_PERMISSIONS } from '../src/lib/roles.js';
const prisma = new PrismaClient();
try {
 const roles = await prisma.rol.findMany({ select: { id: true, codigo: true, permisos: true } });
 const pending = roles.filter(role => ROLE_PERMISSIONS[role.codigo] &&
   (!Object.hasOwn(role.permisos || {}, 'alcance') || role.permisos?.editar?.includes('transparencia') || role.permisos?.aprobar?.includes('transparencia')));
 await prisma.$transaction(async tx => {
  for (const role of pending) {
   const defaults = ROLE_PERMISSIONS[role.codigo];
   const previous = role.permisos || {};
   const base = Object.hasOwn(previous, 'prioritarios')
     ? { ...previous, alcance: defaults.alcance }
     : defaults;
   const permisos = { ...base, editar: base.editar.filter(key => key !== 'transparencia'), aprobar: base.aprobar.filter(key => key !== 'transparencia') };
   await tx.rol.update({ where: { id: role.id }, data: { permisos } });
   await tx.usuario.updateMany({ where: { rolId: role.id }, data: { sessionVersion: { increment: 1 } } });
  }
 }, { timeout: 30000 });
 console.log(`Permisos inicializados en ${pending.length} roles; las personalizaciones existentes se conservaron.`);
} finally { await prisma.$disconnect(); }
