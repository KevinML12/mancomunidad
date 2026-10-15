# Diagnóstico de producción — 15 de octubre de 2026

## Alcance y evidencia

Se revisaron el portal `https://frontend-svelte-vert.vercel.app`, la aplicación separada `https://admin-app-kappa-red.vercel.app` y la API `https://backend-eosin-omega-81.vercel.app`. La revisión incluyó respuestas HTTP, cabeceras, rutas públicas y privadas, variables de entorno por nombre, código, compilaciones, pruebas y auditorías de dependencias. No se creó ni modificó contenido institucional en producción.

El portal y la administración responden 200 por HTTPS; HTTP del portal redirige con 308 a HTTPS. Las tres aplicaciones entregan HSTS. Las rutas `/`, `/login`, `/inicio`, `/transparencia`, `/proyectos` y `/convenios` cargan la aplicación. La API pública devuelve 4 publicaciones, 1 proyecto y 2 censos; `/api/v1/proyectos` y `/api/v1/admin/overview` responden 401 sin sesión. La cuenta de gerencia de demostración pudo iniciar sesión en ambos dominios, pero recibió 403 en administración. La cookie de sesión fue `HttpOnly` y `Secure`, sin token en el cuerpo de login. Las auditorías `npm audit --omit=dev --audit-level=high` de backend, frontend y administración no reportaron vulnerabilidades.

Estos resultados acreditan disponibilidad y controles básicos, pero no sustituyen una prueba de aceptación con cuentas y datos institucionales. El portal muestra datos existentes de demostración o históricos; su exactitud institucional no fue validada en esta revisión.

## Correcciones priorizadas

| Prioridad | Hallazgo | Corrección verificable |
| --- | --- | --- |
| P0 | Las cuentas de demostración comparten una contraseña conocida y todavía permiten iniciar sesión en producción. | Antes de entregar el sistema a usuarios reales, crear cuentas personales, cambiar o deshabilitar las cuentas de demostración, revocar sus sesiones y comprobar que ya no ingresan. No asignarles `APP_ADMIN_EMAILS`. |
| P0 | No existe aún una cuenta con permiso especial de administración: `APP_ADMIN_EMAILS` no está configurada. El bloqueo actual es intencional. | Cuando se entregue la cuenta nominativa, agregar solo su correo exacto, desplegar el backend y probar creación, edición, publicación y retiro de un borrador. |
| P1 | La recuperación de contraseña responde 503 mientras falten `RESET_DELIVERY_URL` y `RESET_DELIVERY_SECRET` en producción. | Conectar un servicio de correo HTTPS, probar entrega al propietario, caducidad, uso único y revocación de sesiones. |
| P1 | Evidencias de proyectos aceptan fotos de 5 MB y las envían como base64 por la función. Un archivo de más de aproximadamente 3.3 MB puede exceder el límite de cuerpo de 4.5 MB de Vercel y devolver 413 antes de llegar a R2. | Hacer carga directa al R2 mediante URL temporal, siguiendo el flujo ya usado para PDF: preparación, subida, verificación de tamaño, tipo y SHA-256, y confirmación. Mantener el comportamiento de borradores sin conexión. [Límite oficial de Vercel](https://vercel.com/docs/functions/limitations). |
| P1 | Las fotos y PDF de publicaciones usan R2 en código y pasaron con R2 simulado; no se hizo una carga real en producción porque no existe una cuenta administradora autorizada. | Con la cuenta especial, cargar una imagen y un PDF, verificar lectura pública solo al publicarlos y acceso privado a borradores, y comprobar la política CORS del bucket. |
| P1 | La portada publica registros y cifras de la base actual sin una validación institucional documentada para esta entrega. | Revisar los cuatro registros visibles, el proyecto y los dos censos con sus responsables; retirar o corregir datos de demostración antes de anunciar el portal como fuente oficial. |
| P2 | Las evidencias antiguas con contenido base64 permanecen en la base de datos; las nuevas guardan referencia y huella en la base y bytes en R2. | Inventariar filas heredadas, respaldar, copiar a R2, comparar SHA-256, sustituir referencias y liberar el contenido solo después de una verificación y un plan de reversión. |
| P2 | La política CSP del portal principal protege marcos y objetos, pero aún no restringe explícitamente orígenes de scripts, conexiones e imágenes. | Definir una CSP compatible con Svelte, fuentes y R2; aplicarla primero en vista previa y revisar errores del navegador antes de producción. |
| P2 | No se acreditó un procedimiento de restauración de PostgreSQL y R2 ni alertas operativas de fallos de login, API o almacenamiento. | Documentar responsables, retención y restauración; ejecutar una restauración de prueba y configurar alertas de disponibilidad, errores 5xx y capacidad. |
| P2 | La tabla del límite compartido y `mediaRef` se aseguran mediante SQL en cada compilación del backend; el límite también crea la tabla al primer uso. | Consolidar estos cambios en una migración de PostgreSQL con versión, respaldo previo y verificación posterior; retirar la creación de esquema durante solicitudes. |

## Pruebas repetidas

1. **Rutas e HTTPS:** portal, administración y API 200; portal HTTP → HTTPS 308; rutas privadas 401 sin sesión; CORS rechaza origen ajeno.
2. **Sesión y permisos:** login de demostración 200, cookie `HttpOnly` y `Secure`, `/auth/me` 200 con cookie y administración 403 para la cuenta sin permiso especial.
3. **Concurrencia e integración:** las pruebas locales verifican contadores compartidos entre dos instancias, dos aprobaciones simultáneas con un solo descuento, R2 simulado y contenido nulo en la base para evidencias nuevas. Pasaron 64 pruebas unitarias y 36 de integración del backend y 46 unitarias del frontend. La compilación de los tres proyectos pasó.

**Estado:** apto para seguir puliendo y para una prueba piloto controlada con datos de demostración. La entrega institucional requiere resolver los P0, recuperar cuentas por correo, acreditar cargas R2 reales y probar respaldo y restauración.
