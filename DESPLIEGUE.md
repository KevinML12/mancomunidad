# Estado y Guía de Despliegue de MFN Digital

**Última verificación del despliegue:** 12 de octubre de 2026.
**Estado:** Backend y frontend publicados con el código `d3eb396c7f3bde02cf929afa3e07926916cbb8af`, ambos READY en Vercel y con sus URLs originales. Evidencia de estados y consultas HTTP en [produccion.json](evidencias/2026-10-12/produccion.json). La tabla histórica del 3 de octubre se conserva como antecedente; no sustituye esta verificación ni acredita aceptación institucional.

---

## 🔍 Diagnóstico y Resolución del Esquema de Base de Datos

En la base de datos PostgreSQL alojada en Neon conviven dos esquemas independientes:
- **`public`**: Utilizado por otra aplicación (`cursos`, `marcajes`, `matriculas`, etc.).
- **`mancomunidad`**: Esquema institucional exclusivo de la Mancomunidad Frontera del Norte que contiene las 27 tablas oficiales del sistema.

### Acciones ejecutadas en producción:
1. Se aplicaron las migraciones DDL directamente sobre el esquema `mancomunidad`:
   - `Usuario.sessionVersion` (soporte de revocación de sesiones concurrentes al restablecer contraseña).
   - `BitacoraAuditoria.antesHash` y `BitacoraAuditoria.despuesHash` (auditoría forense de mutaciones con hashes pre y post-escritura).
   - `Proyecto.municipio` (asignación explícita a la jurisdicción canónica).
   - `EvidenciaProyecto.contenido`, `sha256`, `tipoMime` (carga binaria de evidencias en Base64 con verificación de huella digital SHA-256).
   - Tabla `RecuperacionClave` (tokens criptográficos expirables de un solo uso).
   - Tabla `PuntoControlIntegridad` (puntos de control de huellas internas; no es una certificación externa ni un árbol Merkle formal).
2. Se actualizaron los permisos institucionales en la tabla `Rol` según el catálogo RBAC `ROLE_PERMISSIONS`.
3. Se generó y selló el primer punto de control criptográfico en `PuntoControlIntegridad`.

---

## 🌐 URLs de producción (estado observado el 3 de octubre de 2026)

| Componente | URL de Producción | Estado |
|---|---|---|
| **Frontend Web** (Svelte 5 / SvelteKit 2) | [https://frontend-svelte-vert.vercel.app](https://frontend-svelte-vert.vercel.app) | En línea (200 OK) |
| **Backend API** (Node.js/Express) | [https://backend-eosin-omega-81.vercel.app](https://backend-eosin-omega-81.vercel.app) | En línea (200 OK) |
| **Integridad Criptográfica** | `GET https://backend-eosin-omega-81.vercel.app/api/v1/inteligencia/sello-forense` | COINCIDE CON PUNTO DE CONTROL |
| **Portal Ciudadano Público** | `GET https://backend-eosin-omega-81.vercel.app/api/v1/transparencia/publico` | En línea (200 OK) |

---

## 🚀 Instrucciones para Desplegar Tú Mismo

Si en el futuro deseas desplegar tú mismo los cambios realizados en el frontend o backend, sigue estos pasos:

Primero actualiza la copia local y ejecuta las verificaciones de [FLUJO_LOCAL.md](FLUJO_LOCAL.md). Los comandos siguientes parten de la raíz del repositorio.

### 1. Despliegue del Frontend (SvelteKit)
Desde la terminal en tu máquina:
```bash
cd frontend-svelte
# Verificar compilación local
npm run build

# Desplegar directamente a producción en Vercel
CI=1 npx vercel --prod --yes
```

### 2. Despliegue del Backend (API REST)
Desde la terminal en tu máquina:
```bash
cd backend
# Generar cliente de Prisma para producción
npm run build

# Ejecutar pruebas de integración
npm test

# Desplegar directamente a producción en Vercel
CI=1 npx vercel --prod --yes
```

> **Nota:** El prefijo `CI=1` evita que la interfaz de línea de comandos de Vercel se bloquee solicitando confirmaciones interactivas de actualización.

### 3. Ejecución de Pruebas de Integración Locales
```bash
cd backend
npm run test:integration
```
> Ejecuta las pruebas de integración con SQLite aislado que validan login, permisos, integridad de hashes y recuperación. Las pruebas autocontenidas históricas se ejecutan aparte con `npm run test:legacy`; no prueban las rutas actuales.

---

## 🔐 Acceso institucional

Las contraseñas que figuraban en versiones anteriores de este archivo quedaron expuestas en el historial de Git. Si corresponden a cuentas activas, deben rotarse individualmente y revocarse las sesiones vigentes. No registrar nuevas contraseñas ni tokens en el repositorio o en esta guía. La administración debe entregar cada acceso por un canal privado y configurar la recuperación mediante el servicio HTTPS descrito en el README.

Las migraciones y la actualización de permisos se ejecutan desde los comandos de `backend/package.json`, con respaldo previo y la conexión correcta al esquema `mancomunidad`. No existe una ruta HTTP para ejecutar DDL ni una clave administrativa predeterminada.

## Cambios de escalabilidad preparados en la rama de trabajo

Estos cambios no se han aplicado a Neon ni a los despliegues de Vercel. Antes de publicarlos, respaldar la base, comprobar que `DATABASE_URL` use el esquema `mancomunidad` y aplicar desde `backend/` los scripts `migrate:evidence-dedupe:production`, `migrate:query-indexes:production` y `migrate:correlatives:production`, en ese orden. El backend nuevo requiere la columna de deduplicación y la tabla de correlativos. Configurar en R2 el permiso CORS para PUT desde el frontend y la expiración de `mfn/pendientes/evidencias/`; comprobarlo con el origen publicado. Luego desplegar y validar una carga real de foto y las métricas con una cuenta autorizada.

## Evidencia del 12 de octubre de 2026

Se publicaron los cambios de arquitectura, controles y modo de campo de `main`. Las rutas públicas, manifest y service worker responden 200; proyectos sin sesión responde 401 y la ruta administrativa de migración retirada responde 404. No se ejecutaron migraciones, seeds, restablecimientos ni escrituras de negocio en producción. La recuperación por correo, pruebas de campo, carga y restauración siguen pendientes. Ver [matriz RF/RNF](evidencias/2026-10-12/MATRIZ_RF_RNF.md) y [El recuerdo de Misael](El%20recuerdo%20de%20Misael.md).
