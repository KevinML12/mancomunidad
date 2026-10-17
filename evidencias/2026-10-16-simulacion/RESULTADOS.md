# Simulación local de RF/RNF y ubicación de fotografías

**Fecha:** 16 de octubre de 2026. **Rama:** `codex/night-release-readiness-2026-10-15`. Se usaron cuentas y registros ficticios, SQLite temporal migrada y un servidor S3 local que simula el transporte de R2. No se escribieron datos institucionales ni se modificó producción.

## Ejecución registrada

| Comprobación | Resultado | Registro |
| --- | --- | --- |
| Backend `npm test` | 68 resultados unitarios y 41 resultados de integración; 0 fallos | [`backend.log`](backend.log) |
| Svelte `npm run test:unit` | 46 resultados; 0 fallos | [`frontend-unit.log`](frontend-unit.log) |
| Svelte `npm run check` | 0 errores, 0 advertencias | [`frontend-check.log`](frontend-check.log) |
| Svelte `npm run build` | Compilación completa | [`frontend-build.log`](frontend-build.log) |
| Administración `npm run build` | Compilación completa | [`admin-build.log`](admin-build.log) |
| Backend `npm audit --omit=dev --audit-level=high` | 0 vulnerabilidades reportadas al momento de la ejecución | [`backend-audit.log`](backend-audit.log) |
| Esquema Prisma PostgreSQL | `prisma validate` válido con URL ficticia de formato PostgreSQL; no conectó a producción | Comando: `DATABASE_URL='postgresql://tester:tester@localhost:5432/mfn?schema=public' npx prisma validate --schema prisma/schema.production.prisma` |

Los 41 resultados de integración incluyen pruebas padre/hijo del ejecutor de Node; no equivalen a 41 requisitos aceptados ni a pruebas de campo.

## Escenarios simulados y observación

| Escenario | Entrada / condición | Resultado observado |
| --- | --- | --- |
| Acceso municipal | Cuenta técnica con Santa Eulalia; proyecto y censo de San Pedro Soloma; posterior ampliación de permisos | Listado restringido, detalle ajeno 404, escritura ajena rechazada; al cambiar municipios se revocó la sesión anterior y la nueva pudo leer el registro autorizado. |
| Hitos ponderados | Dos hitos de 60 % y 40 %; intento de exceder 100 % y de cambiar el porcentaje manualmente | Se rechazaron pesos excesivos y avance manual. El hito sin evidencia no pudo aprobarse. Con evidencia, su aprobación produjo 60 %; al reabrir volvió a 0 %. |
| Concurrencia de hitos | Dos solicitudes simultáneas para crear hitos de 60 % en el mismo proyecto | Una creación obtuvo 201 y la otra 400; quedó un solo hito y el total no excedió 100 %. Se reintentan conflictos serializables antes de responder. |
| EXIF + GPS del dispositivo | JPEG sintético con EXIF de Santa Eulalia, carga directa al S3 simulado y GPS declarado de San Pedro Soloma | La API verificó bytes y SHA-256, guardó ambos municipios y marcó `Revisar`. La fuente primaria registrada fue `EXIF`; no reemplazó la coordenada del dispositivo. |
| Foto sin EXIF | PNG sintético con GPS del dispositivo en Santa Eulalia | Se guardó municipio del dispositivo, EXIF nulo y estado `Coincide` para un punto interior. |
| Punto cerca del límite | Coordenada interior a menos de 500 m del límite cartográfico | Aunque la intersección indicó Santa Eulalia, el estado fue `Revisar`. |
| Caja chica | URL externa como factura, luego PNG verificado en R2 simulado | La URL externa se rechazó; la foto verificada se vinculó a la cuenta que la subió. Una cuenta sin permiso no pudo abrirla. |
| PDF financiero | Movimiento de ingreso e informe anual con fondos públicos/cooperación | Las rutas autenticadas devolvieron PDF; el acceso sin rol financiero se rechazó. Los documentos indican que son constancias internas sujetas a conciliación. |
| Límites compartidos | Ocho solicitudes concurrentes entre dos instancias con cupo de tres | Tres respuestas 200 y cinco 429. |
| Documentos y fotos directos | Carga simulada, confirmaciones paralelas, ticket ajeno/caducado y archivo con tipo falso | No se duplicó la referencia en las confirmaciones; se rechazaron permisos/tickets inválidos y contenido incongruente. |

## Qué no demuestra esta simulación

- El servidor S3 local **no** valida firma real de Cloudflare R2, costos, disponibilidad, privacidad configurada ni latencia de producción. La prueba de CORS/PUT real ya está documentada en `DIAGNOSTICO_PRODUCCION_2026-10-15.md`; falta el flujo autenticado completo con una cuenta institucional.
- El JPEG EXIF es sintético y mínimo. Hace falta una muestra de dispositivos reales: Android/iPhone, fotos sin GPS, metadatos retirados por aplicaciones, orientación, formatos distintos y posiciones cerca de fronteras.
- El polígono RIC es una copia local de tres municipios y genera una sugerencia; no demuestra visita ni titularidad de la fotografía. Los puntos de borde requieren revisión humana.
- SQLite local no reproduce todas las características ni la concurrencia de PostgreSQL en Vercel. La migración SQL de esta fase y sus disparadores no se ejecutaron sobre la base activa.
- No hubo medición de 50 peticiones por segundo durante diez minutos, disponibilidad 24/7, restauración de copias, prueba de penetración, encuesta SUS ni pretest/postest institucional. Tampoco se acreditaron políticas RLS por usuario en la base.

**Resultado de aceptación:** la implementación supera estas simulaciones locales. RF/RNF continúan sujetos a las verificaciones de producción y de campo descritas en `docs/RELEASE_PRODUCCION.md` y en la matriz actualizada.
