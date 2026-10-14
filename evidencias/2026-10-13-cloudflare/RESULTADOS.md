# Integración PDF privada — 13 de octubre de 2026

## Resultado acreditado

Código preparado para Cloudflare R2; **no se conectó a un bucket real ni se desplegó esta entrega**. El panel de Cloudflare mostró inicio de sesión y Wrangler no tenía autenticación. No se crearon credenciales, buckets ni suscripciones.

- Integración: 26 resultados aprobados (25 subpruebas y su prueba padre), 0 fallos. La subprueba R2 contiene múltiples aserciones; no equivale a 26 escenarios independientes de R2.
- Se verificó autorización 401/403, almacenamiento ausente 503, rechazo de MIME/tamaño, ticket de carga inválido como sesión, objeto no cargado, contenido alterado, referencia falsificada, tipo documental incorrecto, registro inexistente y confirmación idempotente.
- La descarga con un rol de consulta autorizado devuelve los bytes originales; reusar la carga temporal con bytes distintos conserva el objeto final verificado.
- Se cargaron PDF sintéticos de más de 5 MiB directamente al almacenamiento simulado, con vinculación y autorización de apertura para Convenio y Acuerdo. El acta también se vinculó y descargó en la prueba de integración.
- Navegador local: Gerencia de prueba seleccionó `mfn-r2-prueba.pdf`, confirmó el estado de carga completada y guardó `ACTA-R2-SIMULADA-001`. La lista mostró PDF privado y el botón de apertura pidió autorización HTTP200. La pestaña/visor del PDF no se pudo acreditar en el inventario del navegador de esta sesión: no se declara ese recorrido visual completo.
- Frontend: chequeo con 0 errores y 0 advertencias; compilación correcta.
- Backend: generación de cliente Prisma PostgreSQL correcta. No se ejecutaron migraciones ni seeds en producción.
- Auditoría de dependencias de producción: 0 vulnerabilidades reportadas por npm al momento de la revisión. La auditoría completa conserva 3 avisos altos en la cadena de desarrollo nodemon/chokidar/braces. No se aplicó la degradación mayor que sugería `audit --force`.

Se corrigió un dato incompleto de la prueba ampliada (faltaba la descripción obligatoria del acuerdo) antes de obtener el resultado final aprobado. No se omitió una validación para hacer pasar el caso.

## Límites de esta evidencia

El simulador implementa transporte S3, no comprueba SigV4 ni credenciales de Cloudflare. Los resultados no acreditan CORS real, vencimiento de URLs aplicado por R2, privacidad configurada en la cuenta, ciclo de vida, costos, latencia, concurrencia de producción, análisis antimalware, firmas o cumplimiento CGC. La advertencia preexistente del service worker en el servidor de desarrollo tampoco se considera una validación del modo sin conexión.

Los usuarios, actas y PDF empleados son sintéticos y locales. La foto `carga-local-simulada.jpg` muestra ese entorno, no producción. Las URLs temporales y referencias de los archivos no se incorporan al expediente.

## Reproducción

Desde `backend`: `npm test`, seguido por `npm run build`. Las pruebas crean una base SQLite aislada y el build restaura el cliente PostgreSQL para producción. Desde `frontend-svelte`: `npm run check` y `npm run build`. Para la auditoría del backend: `npm audit --omit=dev`.

Configuración y aceptación real pendientes: [Guía R2](../../docs/cloudflare/README.md).
