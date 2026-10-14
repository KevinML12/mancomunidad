# El recuerdo de Misael

Constancia específica del trabajo realizado el **12 de octubre de 2026**, zona **America/Guatemala**.

## Qué se pidió

Reunir evidencias reales del proyecto MFN Digital, cerrar la matriz de requisitos de manera honesta, preservar el capítulo VI como borrador, mantener las rutas públicas y registrar el trabajo en Git con esta constancia.

## Código y alcance del commit

- Base sincronizada de la laptop: `872cecdc6e876961aaf20463f74e7dd46b2e84aa`.
- Commit de nuevas pruebas: **`d3eb396c7f3bde02cf929afa3e07926916cbb8af`**, publicado en `origin/main`.
- Este archivo pertenece al commit final de **evidencias y constancia**. Ese commit incorpora la carpeta `evidencias/2026-10-12/`, esta memoria y la actualización del estado en `DESPLIEGUE.md`; no modifica el runtime respecto de `d3eb396`.
- Para obtener el hash exacto del commit que contiene esta constancia: `git log -1 --format=%H -- "El recuerdo de Misael.md"`. El hash propio no se incrusta en el archivo porque cambiaría al modificar su contenido; se entrega también en el mensaje final.

## Qué se hizo realmente

1. Se añadieron cinco casos de integración sobre rutas reales: ARC y vencimientos, actas/acuerdos, convenios en la frontera de 90 días, consolidación ASH y publicación/ocultamiento con protección de fotos/GPS.
2. Se ejecutó la batería completa: **19 resultados aprobados**, que corresponden a **18 casos y una suite padre**; no son 19 requisitos íntegramente aceptados ni 19 usuarios evaluados.
3. Se ejecutaron Svelte check (0 errores y 0 advertencias), build del frontend y generación del cliente Prisma PostgreSQL.
4. Se publicaron backend y frontend desde copias limpias del código Git, sin archivos `.env`. No se ejecutaron migraciones ni seeds.
5. Se confirmó READY mediante la API de Vercel para ambos despliegues, con el commit `d3eb396`. El CLI perdió la conexión de seguimiento después de la subida (`fetch failed`); la verificación posterior confirmó que la construcción terminó y los alias se asignaron. No se duplicaron despliegues por ese error.
6. Se comprobaron rutas públicas y API: 200 para contenido público; 401 en proyectos sin autenticación; 404 para la ruta administrativa de migración retirada. Se recargó el navegador y se guardó una captura de la versión nueva.
7. Se elaboró la matriz RF1–RF16 y RNF con evidencia, límites y criterio de aceptación. Se prepararon protocolos y CSV vacíos para levantar datos reales, sin fabricar mediciones.
8. Se conservaron los capítulos y el `output/` preexistente, los entornos y la base local. No se añadieron credenciales ni registros personales privados a Git.

## Rutas conservadas y despliegues

- Frontend: https://frontend-svelte-vert.vercel.app
- Portal: https://frontend-svelte-vert.vercel.app/transparencia
- API: https://backend-eosin-omega-81.vercel.app
- Frontend Vercel: `dpl_2WecrCJEKVm65HuDFY6vh9P4iZgG`.
- Backend Vercel: `dpl_H22JsUVGvF91FdoTmbvVkcinjfro`.

Los estados y respuestas verificadas se encuentran en [produccion.json](evidencias/2026-10-12/produccion.json).

## Evidencias para continuar el PG

- [Índice del expediente](evidencias/2026-10-12/README.md).
- [Matriz RF/RNF](evidencias/2026-10-12/MATRIZ_RF_RNF.md).
- [Resultados locales](evidencias/2026-10-12/resultados-locales.json).
- [Protocolo de pendientes](evidencias/2026-10-12/PROTOCOLO_PENDIENTES.md).
- [Manifestación de huellas](evidencias/2026-10-12/MANIFIESTO_SHA256.json).

## Qué sigue pendiente

- Correo real para recuperación y prueba de entrega completa en producción.
- Administración integral de roles y aislamiento municipal según alcance acordado.
- Extracción/validación EXIF; cálculo automático del avance por metas/evidencias.
- Carga y conservación verificable de comprobantes/PDF; exportación requerida y cotejo CGC institucional.
- Validaciones de entradas y aceptación funcional completa por responsable.
- Sincronización ante concurrencia, respaldo/restauración y pruebas reales en comunidades.
- Pretest/postest, respuestas SUS/TAM, asistencia a talleres y análisis reproducible de datos originales.

**Decisión de cierre:** quedó preparado un expediente técnico trazable y la matriz de diagnóstico. No se declaró terminado el capítulo VI ni aceptación institucional del proyecto. Las cifras del borrador (93.9%, SUS 88.5, t=18.74, disponibilidad 100%, etc.) no forman parte de los resultados acreditados aquí.

## Corrección de formularios y navegación por rol — 13 de octubre de 2026

Se corrigieron los saltos de 1,000 en montos de convenios, el prompt de prórroga, formularios poco legibles y acciones de edición visibles para roles de consulta en Convenios y ASH. Se aclararon las referencias PDF, se habilitaron enlaces en tarjetas de actas y el registro de acuerdos desde la interfaz; la API valida fechas, cantidades, estados y referencias documentales de cumplimiento.

Se priorizaron áreas por rol, con accesos complementarios en un panel superior Otras áreas, sin ampliar permisos. Se ejecutaron recorridos de navegador con Gerencia y Junta Directiva sobre datos sintéticos aislados, además de integración HTTP y verificación de navegación. Véase `evidencias/2026-10-13-formularios/RESULTADOS_E2E.md`.

Esta corrección se preparó desde main para poder publicar sin incluir la migración de hitos pendiente de la rama codex/field-evidence-workflow. La base de producción fue identificada por el propietario como Neon, no Supabase. La carga privada de documentos en Cloudflare y el traslado de alojamiento del backend siguen pendientes; estos formularios todavía registran enlaces externos. No se modificaron capítulos, credenciales ni esquemas de producción.

Publicación de esta corrección: commit de código `6ef09ee04cefb64bdcdb9a94b23611839e4ab077`, frontend y backend READY en las URLs existentes. Login GE/JD y consultas de actas, convenios y censos con HTTP200; integridad sin discrepancias. Navegación de Junta Directiva comprobada en el navegador publicado. Detalles en `evidencias/2026-10-13-formularios/produccion.json`. No se ejecutaron migraciones ni altas de negocio en producción.

## PDF privados en Cloudflare R2 — preparación del 13 de octubre de 2026

Se preparó la carga directa privada de PDF para actas, evidencias de acuerdos y convenios, con permisos de edición, verificación de tamaño/formato básico/SHA-256, copia final protegida frente a reutilización de la URL temporal y apertura autorizada por enlaces de 120 segundos. La interfaz reemplaza la solicitud de pegar una URL por un selector de archivo; los enlaces externos históricos se conservan. No se incluyen fotos de proyectos, comprobantes financieros ni adendas versionadas.

Las 26 comprobaciones de integración pasaron; también el chequeo y build del frontend y la generación PostgreSQL. Se probaron archivos mayores de 5 MiB con almacenamiento simulado. Se guardó un acta sintética desde el navegador local. La prueba contra Cloudflare real y la apertura visual final del PDF siguen pendientes. Véanse `evidencias/2026-10-13-cloudflare/RESULTADOS.md` y `docs/cloudflare/README.md` para evidencia y límites.

No se conectó una cuenta R2: el panel solicita iniciar sesión. No se crearon claves ni buckets, no se contrataron servicios, no se modificó la base de producción y no se desplegó esta entrega. Se conserva la versión publicada anterior mientras se configura y prueba R2. El código se guarda en `codex/private-r2-documents`; el hash exacto de esta constancia se obtiene con `git log -1 --format=%H -- "El recuerdo de Misael.md"`. Ningún secreto ni archivo de entorno privado forma parte del commit.
