# Flujo de trabajo local

Ejecute estos pasos desde la carpeta `mancomunidad` de su laptop. Use Node.js 20.19 o una versión 22.12 o posterior, y npm. Las cuentas y los datos de demostración son exclusivamente locales.

## 1. Traer la versión publicada en Git

```sh
git status --short --branch
git fetch origin
git switch main
git pull --ff-only origin main
```

Si `git status` muestra cambios propios, guárdelos primero mediante un commit en su rama de trabajo. `git pull --ff-only` se detendrá si la historia local diverge; no descarte cambios para forzarlo.

## 2. Preparar el backend local

```sh
cd backend
npm ci
if [ ! -f .env ]; then cp .env.example .env; fi
```

Si `backend/.env` ya existe, consérvelo y compruebe que `DATABASE_URL="file:./dev.db"`, `PORT=8080` y `CLIENT_URL="http://localhost:5173"`. Reemplace `JWT_SECRET` de ejemplo con un valor local generado mediante `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. No comparta ni confirme el archivo `.env` en Git.

```sh
npx prisma generate --schema prisma/schema.prisma
npx prisma migrate deploy --schema prisma/schema.prisma
npm run permissions:update
```

Para crear **una base de demostración nueva y desechable**, y solo cuando no haya datos que conservar en `backend/prisma/dev.db`:

```sh
ALLOW_DEMO_SEED=true npm run prisma:seed
```

El seed borra los datos de esa base. Las cuentas ficticias se enumeran en `backend/prisma/seed.js`; no son accesos para producción.

Arranque la API y mantenga abierta esta terminal:

```sh
npm run dev
```

Compruebe que `http://localhost:8080/api/v1/health` devuelve `ok: true`.

## 3. Preparar el frontend local

En otra terminal, desde la raíz del repositorio:

```sh
cd frontend-svelte
npm ci
if [ ! -f .env ]; then cp .env.example .env; fi
npm run dev
```

Si `frontend-svelte/.env` ya existe, consérvelo y ajuste `VITE_API_URL` a `http://localhost:8080`. El archivo de ejemplo ya apunta a esa URL. Abra `http://localhost:5173/login`. El navegador necesita una visita con conexión y una sesión iniciada antes de usar el modo de campo.

## 4. Comprobar antes de publicar

En las carpetas correspondientes:

```sh
cd backend
npm test
```

```sh
cd frontend-svelte
npm run check
npm run build
```

Después del login, abra la cartera y un expediente de proyectos con conexión. En DevTools active *Offline* y recargue: deben verse las copias y su fecha. Añada una fotografía como borrador; restablezca la red y confirme que se sincroniza una sola vez. Cierre sesión y compruebe que se eliminan las copias del usuario. El login no debe iniciar servicios ni consultas de módulos antes de autenticar.

Si los cambios locales pasan las pruebas, confirme los archivos modificados, envíe su rama al remoto y publique desde esa revisión. La guía [DESPLIEGUE.md](DESPLIEGUE.md) contiene los comandos de Vercel. El push a `main` no demuestra por sí solo que Vercel haya publicado la misma revisión: compruebe el despliegue y repita una prueba de login allí.
