import { Prisma, PrismaClient } from '@prisma/client';
import { missingProductionColumns } from '../src/lib/production-schema.js';

if (!process.env.DATABASE_URL || process.env.DATABASE_URL === '[SENSITIVE]') {
  console.error('DATABASE_URL de producción no está disponible para comprobar el esquema.');
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const rows = await prisma.$queryRaw`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `;
  const missing = missingProductionColumns(rows, Prisma.dmmf.datamodel.models);
  if (missing.length) {
    console.error(`Esquema de producción incompleto: ${missing.join(', ')}.`);
    console.error('Identifique y respalde la base activa; aplique las migraciones PostgreSQL pendientes antes de desplegar.');
    process.exitCode = 1;
  } else {
    console.log('Esquema de producción compatible con esta versión.');
  }
} catch (error) {
  console.error(`No se pudo comprobar el esquema de producción (${error.code || error.name || 'error de conexión'}).`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
