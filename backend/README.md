# Backend de MFN Digital

API Express y Prisma. Consulte el README de la raíz para instalación, permisos, recuperación, pruebas y migraciones por proveedor.

`schema.prisma` es SQLite local; `schema.production.prisma` es PostgreSQL en Neon. El historial de migraciones local no es compatible con PostgreSQL. `production-additions.sql` contiene las adiciones para la base Neon que ya tenga el esquema anterior.

Los cambios de escalabilidad sobre una base Neon existente se aplican con `migrate:evidence-dedupe:production`, `migrate:query-indexes:production` y `migrate:correlatives:production`, en ese orden y antes de desplegar el backend que los usa. No se ejecutan desde `build:vercel`. La conexión debe apuntar al esquema `mancomunidad`.

Las cuentas del seed son ficticias y comparten una contraseña de demostración. El seed borra datos y exige `ALLOW_DEMO_SEED=true`, fuera de producción. Para aplicar los permisos corregidos a cuentas existentes use `npm run permissions:update`.
