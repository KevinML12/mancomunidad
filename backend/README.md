# Backend de MFN Digital

API Express y Prisma. Consulte el README de la raíz para instalación, permisos, recuperación, pruebas y migraciones por proveedor.

`schema.prisma` es SQLite; `schema.production.prisma` es PostgreSQL. El historial de migraciones local no es compatible con PostgreSQL. `production-additions.sql` contiene las adiciones para una base PostgreSQL que ya tenga el esquema anterior.

Las cuentas del seed son ficticias y comparten una contraseña de demostración. El seed borra datos y exige `ALLOW_DEMO_SEED=true`, fuera de producción. Para aplicar los permisos corregidos a cuentas existentes use `npm run permissions:update`.
