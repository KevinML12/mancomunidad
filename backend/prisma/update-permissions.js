import { PrismaClient } from '@prisma/client';
import { ROLE_PERMISSIONS } from '../src/lib/roles.js';
const prisma = new PrismaClient();
try {
 for (const [codigo, permisos] of Object.entries(ROLE_PERMISSIONS)) await prisma.rol.updateMany({ where: { codigo }, data: { permisos } });
 console.log('Permisos actualizados sin borrar usuarios ni registros.');
} finally { await prisma.$disconnect(); }
