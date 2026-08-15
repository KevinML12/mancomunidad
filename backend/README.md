# SIRH-MFN — Backend

API REST del Sistema de Información para la Gestión de Recursos Humanos de la
Mancomunidad Frontera del Norte (proyecto de graduación, Capítulo V).
Node.js + Express + Prisma. Base de datos real (sin datos hardcodeados en el
frontend) — todo el estado vive en la base de datos y se sirve vía API.

## Stack

Express 4 · Prisma 6 · SQLite (dev) / PostgreSQL (producción) · JWT (jsonwebtoken) · bcryptjs

## Arranque local

```bash
npm install
npx prisma migrate dev   # crea prisma/dev.db y aplica el schema
npm run prisma:seed      # siembra datos de ejemplo (o ya corrió con migrate dev)
npm run dev               # http://localhost:8080
```

### Usuarios de prueba (sembrados por `prisma/seed.js`)

Contraseña para todos: **`mfn2026`**

| Rol | Correo |
|---|---|
| Junta Directiva | juntadirectiva@mfn.gob.gt |
| Gerencia Ejecutiva | gerencia@mfn.gob.gt |
| Recursos Humanos | rrhh@mfn.gob.gt |
| Jefe Inmediato | jefatura@mfn.gob.gt |
| Empleado | empleado@mfn.gob.gt |

## De SQLite (dev) a PostgreSQL (producción / entrega final)

El Capítulo V del proyecto de graduación especifica PostgreSQL. Para hoy
(presentación) se usó SQLite porque no requiere ningún servicio corriendo en
la máquina — mismo `schema.prisma`, cero diferencia funcional. Antes de la
entrega final:

1. Crear un proyecto gratis en [neon.tech](https://neon.tech) o
   [supabase.com](https://supabase.com) (el usuario ya tiene cuenta de Supabase).
2. En `prisma/schema.prisma`, cambiar:
   ```prisma
   datasource db {
     provider = "postgresql"   // antes: "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
3. En `.env`, pegar la cadena de conexión que dé el proveedor.
4. `npx prisma migrate dev --name init_postgres` y `npm run prisma:seed`.

## Despliegue

Incluye `Dockerfile` listo (multi-stage no necesario, imagen simple con
`node:20-slim`). Cualquier plataforma que despliegue desde Dockerfile sirve
(Railway, Render, Fly.io):

1. Completar el paso "SQLite → PostgreSQL" de arriba primero.
2. Variables de entorno a configurar en la plataforma: `DATABASE_URL`,
   `JWT_SECRET` (generar una nueva, no reutilizar la de desarrollo),
   `CLIENT_URL` (la URL del frontend desplegado), `PORT` (normalmente la
   asigna la plataforma).
3. La imagen corre `prisma migrate deploy` automáticamente al arrancar.

## Notas de seguridad para producción

- `JWT_SECRET` de `.env` es solo para desarrollo — generar una nueva con
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
- Las contraseñas demo (`mfn2026`) deben cambiarse antes de dar acceso real
  al personal de la MFN.
- CORS está restringido a `CLIENT_URL` — actualizar ese valor al dominio real
  del frontend en producción.

## Estructura

```
backend/
├── prisma/
│   ├── schema.prisma   # modelo entidad-relación (Cap. V, 5.2)
│   └── seed.js         # datos de ejemplo
├── src/
│   ├── server.js
│   ├── lib/            # prisma client, auditoría, constantes
│   ├── middleware/      # auth (JWT + roles)
│   └── routes/          # un archivo por módulo (auth, dashboard, puestos,
│                         # colaboradores, convocatorias, evaluaciones,
│                         # ausencias, disciplina, capacitaciones)
└── Dockerfile
```
