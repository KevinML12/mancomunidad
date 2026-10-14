# Pruebas y rediseño documental — 14 de octubre de 2026

## Alcance

Actas, acuerdos, convenios y su flujo PDF. Los diálogos se rediseñaron con azul marino, blanco, vidrio discreto en el fondo y superficies legibles. La carga muestra selección, tamaño, porcentaje de transferencia y etapa de verificación; distingue documento privado, enlace externo y ausencia de respaldo. Se mantiene el máximo de 10 MiB sin compresión automática.

No es una auditoría completa de todos los módulos del sistema ni una certificación de seguridad o accesibilidad.

## Pirámide aplicada

Primero se ejecutaron las unitarias, luego integración y por último recorridos E2E de navegador. Al corregir hallazgos de interfaz se volvieron a ejecutar las pruebas afectadas y los chequeos finales.

- **104 pruebas unitarias aprobadas:** 61 del backend y 43 del frontend (incluida la navegación por rol). Cubren cantidades y decimales, calendario, vigencias, enlaces inseguros, ámbitos, tickets inválidos/vencidos, límites exactos y superiores, MIME vacío, orden de carga, interrupciones de API/transferencia, referencia no confirmada, ventana bloqueada y cierre de ventana al rechazar una apertura.
- **31 resultados de integración aprobados**, incluidos los contenedores padre. No equivalen a 31 requisitos completos independientes. Usan rutas HTTP reales, SQLite migrada aislada y transporte S3 simulado. Se añadieron confirmaciones simultáneas, rechazo de otra cuenta editora, permisos retirados después de emitir un ticket y un archivo renombrado PDF cuya huella coincide pero cuyo encabezado no es PDF.
- Chequeo Svelte: **0 errores, 0 advertencias**. Frontend compilado y cliente Prisma PostgreSQL generado correctamente.

`pruebas.json` conserva los conteos finales. `backend/npm test` ejecuta ahora unitarias antes de integración; el frontend dispone de `npm run test:unit`.

## Recorridos E2E observados

Se realizaron en el navegador de Codex, con usuarios sintéticos GE y JD, aplicación local y bucket Cloudflare real. Son recorridos dirigidos con sus comprobaciones, no una suite de navegador integrada en CI.

1. Gerencia: rechazo de PDF mayor de 10 MiB; se detectó y corrigió el redondeo que podía mostrar 10 MiB para un archivo apenas mayor.
2. Gerencia: acta sintética con PDF de más de 5 MiB, porcentaje real, verificación, guardado y apertura en otra pestaña.
3. Cancelación: después de cargar un PDF, Escape cierra el diálogo y reabrir ya no conserva el documento previo. Se comprobó modal nativo, foco dentro y fondo inerte.
4. Acuerdos: creación En Proceso; guardar cumplimiento deshabilitado sin respaldo; carga de PDF y cambio posterior a Cumplido.
5. Convenios: montos 1330.25 y 123.45; fecha final anterior rechazada con error dentro del diálogo; fecha corregida y PDF permiten guardar.
6. Prórroga: acortar vigencia rechazado; extensión hasta 2028-10-14 guardada en el convenio sintético local.
7. Junta Directiva, Gobernanza: cero botones para registrar acta/acuerdo o cambiar estado; apertura privada del PDF autorizada.
8. Junta Directiva, Convenios: cero botones de crear/prorrogar; conserva consulta del instrumento privado.
9. Vista de 390 × 844: diálogo de Convenios con una columna y sin desbordamiento horizontal; después se restableció el tamaño normal.
10. Revisión de teclado: Escape y foco contenidos en el diálogo. No se observaron errores de ejecución inesperados; el HTTP400 de la prueba de vigencia fue deliberado.

## Correcciones funcionales

Cancelar restablece el formulario de registro y su referencia PDF. El modal nativo contiene el foco y bloquea el fondo, sin quedar debajo del encabezado móvil. Los cierres se bloquean mientras hay carga/guardado. Errores del servidor se muestran dentro del formulario y se limpian al editar. Archivos con MIME vacío se admiten si tienen extensión PDF; se envían como application/pdf y el backend mantiene la comprobación de bytes.

Los ámbitos heredados como `constructor` se rechazan también al validar tickets firmados. No se ampliaron permisos ni se cambió el esquema de producción.

## Límites y pendientes

No se ejecutó pentesting externo, estrés sostenido, revisión antimalware, lector de pantalla real ni una matriz física de Safari/iOS/Android. La vista móvil es emulada. Las interrupciones de red se cubrieron de forma unitaria; no se acredita un E2E bajo cobertura móvil intermitente. Las dos confirmaciones simultáneas verifican este flujo concreto, no la concurrencia de todos los módulos.

Permanecen documentos sintéticos en R2. Los registros de negocio del E2E se crearon solo en SQLite local; no se generaron actas ni convenios ficticios en Neon. Los enlaces históricos no se migran automáticamente y los objetos finales privados sin vínculo requieren limpieza supervisada. Se conservan las limitaciones previas de firmas, CGC, respaldo y retención.

Los archivos nuevos de diseño `.pen` y `design/previews/` que aparecieron en el workspace durante la tarea no forman parte de este cambio.
