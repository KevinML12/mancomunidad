# Publicación segura de MFN Digital

Estado al 16 de octubre de 2026: la API, el portal y la administración siguen en sus alias anteriores. Los proyectos de Vercel no están conectados a Git. La API publicada inició sesión con la cuenta de demostración de gerencia como `id = 2` y su vista pública devolvió 4 publicaciones, 1 proyecto y 2 censos. La conexión `DATABASE_URL` que se incorpora a **nuevos** despliegues de Vercel apunta a una base Neon sin la tabla `Usuario`; por ello, una publicación directa del backend fallaría. La base Neon entregada por el usuario contiene la misma cuenta como `id = 178` y sus tablas institucionales estaban ausentes antes de migrarla. No cambiar el alias público ni sustituir `DATABASE_URL` hasta identificar y preservar los registros de la API publicada.

La base Neon entregada ya tiene un respaldo en `/Users/kevv/Documents/Backups/mancomunidad/mfn-neon-candidate-before-rf-20261016T153637Z.dump` (SHA-256 `40e999b5c8fcb992df3f2acab82c16fbc58fe639257a2eaed8f1d40bde734a4d`, permisos `0600`). Se restauró en PostgreSQL local y conservó sus 8 cuentas. Sobre esa copia se ensayaron, en orden, `production-legacy-neon-20261016.sql`, `production-release-20261015.sql` y `production-rf-20261016.sql`. Después se aplicaron a la Neon entregada: esquema compatible, 8 cuentas conservadas, 2 versiones y 2 disparadores de bitácora. Una API de Vercel aislada, sin promover dominios, respondió salud 200 e inició sesión con `id = 178`; se eliminó al terminar. Esto valida esa base como candidata técnica, no como reemplazo de los datos publicados.

La comprobación real de R2 desde el origen HTTPS del portal pasó: CORS, PUT firmado y metadatos del objeto; el archivo temporal fue eliminado. La contraseña de la base Neon entregada se compartió en una conversación y deberá rotarse antes de un eventual uso estable en producción.

## 1. Identificar y respaldar la base activa

1. Identificar la conexión utilizada por el **despliegue asociado al alias actual**, no solo la variable del proyecto que usarán despliegues nuevos. Vercel conserva las variables del momento de cada despliegue. No copiar la contraseña a incidencias, chats ni registros.
2. Comparar un dato no sensible de esa base con la API: la cuenta de demostración de gerencia debe tener `id = 2`, y la vista pública debe contener 4 publicaciones, 1 proyecto y 2 censos según la comprobación de esta fecha. La Neon entregada tiene `id = 178` y no debe tratarse como la base activa.
3. Crear un snapshot de la base **activa** y comprobar que puede restaurarse. Registrar el identificador y la hora del respaldo fuera del repositorio. Respaldar también el bucket R2 antes de migrar archivos históricos.

## 2. Migrar y verificar

Desde `backend/`, con `DATABASE_URL` apuntando únicamente a la base activa identificada y restaurable:

```sh
npm run migrate:release:production
npm run migrate:rf:production
npx prisma generate --schema prisma/schema.production.prisma
node scripts/check-production-schema.js
```

La migración `prisma/production-release-20261015.sql` añade `mustChangePassword`, `mediaRef` y `RateLimitBucket` y registra `2026-10-15-release` en `SchemaVersion`. La migración `prisma/production-rf-20261016.sql` añade la relación cuenta–municipio, hitos, campos EXIF/GPS y responsable ARC; también impide actualizar o borrar filas de bitácora y puntos de control mediante disparadores de base. La nueva `prisma/production-legacy-neon-20261016.sql` solo corresponde a la Neon heredada entregada, donde faltaban todos los módulos institucionales; **ya fue aplicada allí** y no debe ejecutarse sobre la base del alias actual. Antes de aplicar cualquier SQL a la **base activa**, ensayarlo sobre su propia copia restaurada y comprobar registros históricos y permisos. Si la verificación indica otras columnas o tablas ausentes, revisar su esquema real y `prisma/production-additions.sql` antes de continuar. No ejecutar el bootstrap sobre una base existente. La compilación de Vercel solo lee el esquema y falla si sigue incompleto. Los disparadores no hacen la bitácora inmutable frente al propietario o administrador de la base.

## 3. Publicar y probar

Publicar primero la API, luego el portal y al final la administración desde un commit revisado. Como Vercel no está conectado a Git, comprobar el contenido local que recibirá cada `vercel deploy --prod`. Conservar los identificadores de despliegue anteriores para reversión.

Repetir tres grupos de pruebas:

1. **Rutas y HTTPS:** portada, login, módulos públicos y administración 200; HTTP redirige a HTTPS; salud de la API 200; rutas privadas 401 sin sesión; CORS rechaza orígenes ajenos.
2. **Sesión y permisos:** iniciar sesión con una cuenta autorizada, verificar cookie `HttpOnly` y `Secure`, acceso por rol y administración 403 para cuentas sin permiso especial. Tras logout, reutilizar la cookie anterior debe devolver 401. Una cuenta nueva debe cambiar su clave inicial antes de entrar a módulos.
3. **Concurrencia y almacenamiento:** ejecutar pruebas locales de límites compartidos, confirmaciones dobles, pesos simultáneos de hitos y doble aprobación de ausencias. En el entorno real, subir una imagen y un PDF autorizados; verificar su lectura, privacidad de borradores y CORS de R2. Registrar GPS EXIF y del navegador por separado, incluido el caso sin EXIF y una discrepancia municipal. Confirmar que una cuenta solo ve los municipios asignados. `node scripts/check-r2-browser-upload.js` comprueba el PUT firmado del origen público y elimina su objeto temporal.

Si falla una prueba, revertir los tres alias de Vercel a los despliegues anteriores y comprobar login y rutas públicas. La migración de este release es aditiva y permite volver al backend anterior sin restaurar la base; una restauración completa debe reservarse para pérdida o corrupción de datos.

## 4. Activación institucional pendiente

Crear una cuenta nominativa para la primera persona administradora y añadir solo su correo exacto a `APP_ADMIN_EMAILS`. Las cuentas de demostración no pueden recibir ese permiso. La administración debe asignar los municipios permitidos a las cuentas operativas antes de probar sus módulos; inicialmente la lista vacía niega registros municipales. Cambiar o deshabilitar las cuentas con contraseña conocida antes de la entrega. La recuperación de claves seguirá deshabilitada hasta configurar y probar un servicio de correo HTTPS. Revisar con la institución los datos públicos antes de presentarlos como oficiales. La aceptación RF/RNF requiere pruebas de campo, mediciones de rendimiento, respaldo/restauración y revisión de RLS; las pruebas locales no acreditan esos resultados.
