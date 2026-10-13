# Matriz de trazabilidad y cierre técnico RF/RNF

Fecha: 12 de octubre de 2026. Código evaluado: `d3eb396c7f3bde02cf929afa3e07926916cbb8af`.

Base de alcance: requisitos funcionales 1–16 y no funcionales del capítulo IV, en `capítulos/PG Cap IV y V - revisado.txt`. El PDF `requerimientos/Formato-IEEE 830-SRS-Lleno ERS.pdf` es un ejemplo de otro sistema académico: no es la ERS contractual de MFN. Municipios activos confirmados: San Pedro Soloma, Santa Eulalia y San Rafael la Independencia.

Esta matriz está cerrada como diagnóstico trazable: cada requisito tiene evidencia, estado y criterio de cierre. **No representa aceptación de todos los requisitos ni aprobación institucional.**

Estados: **Comprobado técnico** = comportamiento probado dentro del alcance indicado; **Parcial** = parte funciona y hay una diferencia respecto del requisito; **Pendiente** = no existe evidencia suficiente o implementación. El expediente no convierte inspección de código en prueba funcional ni prueba local en validación de producción.

| ID | Requisito y estado | Evidencia real disponible | Diferencia / criterio para cerrar aceptación |
| --- | --- | --- | --- |
| RF1 | Autenticación y recuperación: **Parcial** | `registros/integracion.log`: sesiones válidas, rechazo de token fijo/reset, recuperación con receptor simulado, consumo único y revocación. Ver `produccion.json` para alcance publicado. | Correo real no acreditado. Recuperación usa código manual, no enlace clicable como la redacción del PG. Configurar y probar proveedor y actualizar especificación o implementar enlace. |
| RF2 | Roles/permisos: **Parcial** | EMP denegado y revocación efectiva durante sesión; auditoría no puede editar ARC ni acuerdos. Middleware y menú aplican rol. | No se acredita interfaz/endpoint completo para asignar/modificar/revocar roles de usuarios. No se acredita aislamiento general por municipio. Revisión institucional de delegaciones. |
| RF3 | Ficha de proyecto/presupuestos: **Comprobado técnico local** | Prueba de creación, municipio conservado, rechazo de porcentaje >100; presupuesto municipal/cooperación en API. | Aceptación del formulario con responsables, datos de expediente y casos de fechas/montos; revisar edición, campos obligatorios y errores. |
| RF4 | Evidencia y geodatos: **Parcial** | PNG conservado, SHA-256 y coordenadas cero; formato inválido rechazado. | No extracción/validación EXIF. Coordenadas del cliente no autentican ubicación o fecha. Definir política y probar fotos sin EXIF/discordantes. |
| RF5 | Transparencia controlada: **Comprobado técnico en flujo probado** | Publicar/ocultar proyecto cambia respuesta pública; sin fotos/GPS. UIP con código aleatorio sin PII; endpoint público de producción verificable. | Aceptación institucional de contenidos y pruebas de interfaz de gestión. Las estadísticas agregadas se publican sin control granular equivalente al de proyectos; revisar alcance exigido. |
| RF6 | Avance automático por evidencias/metas: **Pendiente** | Código `backend/src/services/projects.js` permite registrar el porcentaje; no es cálculo automático por metas físicas. | Definir metas, unidades, ponderaciones, aprobación de evidencias y cálculo; probar comparación real vs cronograma. No afirmar cumplimiento por mostrar una barra. |
| RF7 | Kanban y filtros: **Parcial** | API persiste En Proceso/En Revisión/Finalizado; filtro municipio/prioridad/búsqueda probado. | Prueba UI del arrastre y filtros explícitos de municipio/responsable. API probada no demuestra drag/drop por sí sola. |
| RF8 | Asignación ARC: **Comprobado técnico local** | Alta de tarea con responsable, municipio, prioridad y fecha; persistencia y transiciones comprobadas. | Responsable es texto, no vínculo probado a un usuario institucional; revisar exigencia de asignación directa y permisos de gerencia. |
| RF9 | Alertas vencidas: **Parcial** | Tarea vencida alerta; deja de alertar al finalizar; métricas coherentes. | Cálculo al consultar, sin acreditación de ejecución diaria programada/notificación independiente. Validar zona horaria y fecha límite. |
| RF10 | Cuotas e ingreso con PDF: **Parcial** | Movimiento persiste y participa en cuenta correcta. Catálogo de tres municipios. | No emisión automática del PDF por transacción acreditada. No denominar oficial Forma 63-A2 sin autorización. Corregir referencia histórica a seis municipalidades. |
| RF11 | Caja chica con fotografía: **Parcial** | API rechaza registro sin `urlComprobante`. | Exigir una URL no valida existencia, contenido, autenticidad ni conservación de factura. Completar carga/validación y cotejo documental. No afirmar verificación SAT. |
| RF12 | Reportes financieros: **Parcial** | Balance probado con segregación de fondos; vistas de movimientos. | Exportación documental/impresión presupuestaria y exactitud con escenarios de ingreso/egreso completos requieren prueba específica. |
| RF13 | Actas PDF/indexación: **Parcial** | Acta se crea, filtro municipio/folio funciona, URL PDF se conserva. | URL de ejemplo no demuestra carga binaria, disponibilidad futura ni autenticidad del PDF. Adjuntar expediente real autorizado y verificar archivo. |
| RF14 | Trazabilidad acuerdos: **Comprobado técnico local en vínculo/estado** | Acuerdo se vincula al acta, cambia a Cumplido y se consulta por estado; AUD no puede editar. | Prueba UI de semáforo, aceptación y evidencia institucional. La API no demuestra bloqueo de Cumplido sin documento; no incluir esa afirmación del borrador VI como resultado. |
| RF15 | Convenios/90 días: **Comprobado técnico local** | Fechas vencida, a 90 y a 91 días producen vencido/proximo/normal; renovación conserva su estado. | Prueba de alerta UI y casos de medianoche/zona horaria; si se exige notificación externa programada, implementarla y probarla. |
| RF16 | Censos/indicadores ASH: **Comprobado técnico local en cálculo** | Dos municipios, 150 viviendas, cobertura 66.7% agua y 50% saneamiento, agregación municipal; municipio histórico rechazado. | Censo real, fuente y aceptación de resultados. Validar rangos/denominadores y entradas inconsistentes; valores sintéticos no son diagnóstico poblacional. |

## Requisitos no funcionales

| ID de control | Estado y evidencia | Pendiente / criterio de cierre |
| --- | --- | --- |
| RNF-REN | **Pendiente** en garantía de <2 s. Logs HTTP locales contienen tiempos de peticiones de integración. | No equivalen a benchmarking de producción. Registrar escenario, carga, red, percentiles, errores y código. |
| RNF-SEG | **Parcial**. Bcrypt/JWT, RBAC fresco, expiración/consumo único/reset y transacciones auditadas comprobados localmente. | Aislamiento por municipio, configuración producción y revisión de permisos. Huellas internas no son bitácora absolutamente inmutable ni certificación CGC. |
| RNF-FIA | **Parcial**. Rollback ante fallo de auditoría y detección de modificación directa comprobados. IndexedDB/borradores inspeccionados. | Persistencia frente a cierres, cuota llena, concurrencia y sincronización en dispositivos reales. Sin idempotencia atómica general del servidor ni resolución completa de conflictos. |
| RNF-DIS | **Parcial**. Disponibilidad puntual HTTP y despliegues verificados en `produccion.json`. | Monitoreo longitudinal, respaldo automatizado y restauración aislada documentada. HTTP 200 puntual no demuestra disponibilidad 24/7. |
| RNF-MAN | **Comprobado técnico en modularidad/build**. Rutas separadas por dominio y servicios; check/build correctos. | No acredita matemáticamente 3FN ni garantiza futuras ampliaciones sin impacto; revisión del modelo y documentación final. |
| RNF-USA | **Pendiente** de evaluación humana. UI y permisos existen. | Aplicar instrumento completo con respuestas individuales; no presentar SUS 88.5 ni TAM como obtenidos sin datos originales. |

## Evidencias que NO equivalen a aceptación

- 19 resultados de Node incluyen 18 casos hijos y la suite padre; no son 19 requisitos completos ni 19 funcionarios.
- Pruebas HTTP de integración usan SQLite temporal y datos sintéticos. Hay prueba de recuperación con receptor simulado, no correo real.
- No se verificaron talleres, mejora del 93.9%, encuesta SUS, prueba t, carga concurrente sostenida, autorización CGC, EXIF ni restauración de backup.
- El capítulo VI permanece borrador. `PROTOCOLO_PENDIENTES.md` define cómo generar evidencia faltante; los CSV están vacíos deliberadamente.
