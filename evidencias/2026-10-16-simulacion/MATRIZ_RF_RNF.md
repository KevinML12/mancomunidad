# Estado RF/RNF después de la simulación local

**Fecha:** 16 de octubre de 2026. Sustituye como lectura de estado a la matriz fechada el 12 de octubre; conserva esa matriz como historial. Fuente de requisitos: `capítulos/PG Cap IV y V - revisado.txt`. **«Técnico local»** significa que existe implementación y una prueba automatizada específica en entorno aislado; **no** significa aceptación institucional ni despliegue. La base activa de Vercel sigue sin identificarse y esta fase no se ha publicado.

| ID | Estado actual | Comprobado en esta rama | Pendiente para cierre |
| --- | --- | --- | --- |
| RF1 Autenticación y recuperación | Parcial | Cookie de sesión, RBAC, código de un uso y revocación pasan integración. | Servicio de correo HTTPS real, entrega al propietario y decisión sobre enlace frente a código. |
| RF2 Roles y permisos | Técnico local, aceptación pendiente | Panel separado cambia rol y municipios por usuario, exige clave de administración, revoca sesiones y restringe proyectos, ARC, ASH y finanzas. | Cuenta administradora nominativa, matriz de permisos aprobada y política RLS en PostgreSQL si se exige control a nivel de fila. |
| RF3 Fichas de proyecto | Técnico local, aceptación pendiente | Creación, municipio, fechas y presupuestos validados; vista de expediente. | Datos institucionales reales, responsables y aceptación de formularios. |
| RF4 Fotos y geodatos | Técnico local, campo pendiente | R2 simulado verifica bytes/huella; EXIF y GPS del dispositivo se conservan por fuente; intersección municipal y discrepancia se marcan. | Fotos de dispositivos reales, cartografía validada, política de revisión y carga autenticada en producción. EXIF editable no acredita presencia. |
| RF5 Portal público | Parcial | Publicación selectiva, archivos y privacidad de borradores probados localmente; portal disponible en despliegue anterior. | Aprobar contenido real y publicar/verificar la versión integrada. |
| RF6 Avance físico | Técnico local, campo pendiente | Hitos con pesos que suman 100 %, evidencia vinculada y aprobación; avance real aprobado frente a programado; escritura concurrente controlada. | Aprobar plan/pesos reales y ejecutar recorrido con proyectos institucionales. Los expedientes anteriores conservan porcentajes históricos hasta revisión. |
| RF7 Kanban y filtros | Parcial | Arrastre y transiciones están implementados en UI; API persiste estados y filtros por municipio/prioridad/búsqueda. | Prueba manual de arrastre y accesibilidad en navegador/móvil; filtro explícito por responsable si se mantiene ese texto en RF7. |
| RF8 Asignación ARC | Técnico local, aceptación pendiente | Nueva tarea vincula `responsableId` a cuenta con módulo/municipio autorizado, fecha y prioridad. | Migrar asignaciones históricas de texto y validar responsables reales. |
| RF9 Alertas de vencimiento | Parcial | Semáforo de tarea vencida se calcula al consultar y desaparece al finalizar. | Evaluación diaria independiente/notificación programada si esa es la interpretación institucional; zona horaria y límite de día. |
| RF10 Ingreso y comprobante PDF | Técnico local, aceptación pendiente | Movimiento, historial, cuentas separadas y PDF de constancia interna pasan integración. | Conciliación, aceptación del formato y corrección de «seis municipios» a tres activos en tesis; no denominar recibo CGC oficial. |
| RF11 Caja chica con foto | Técnico local, producción pendiente | Rechaza URL externa; exige foto PNG/JPEG subida, verificada y privada en R2 simulado. | Carga real, retención, revisión documental/SAT por personal autorizado. |
| RF12 Informes financieros | Técnico local, aceptación pendiente | Informe anual PDF y sumas por cuenta/mes en rutas privadas; balance agregado desde base. | Conciliación con libros, revisión de formato/impresión y volumen real. |
| RF13 Actas PDF e indexación | Parcial | Archivo PDF privado y permisos probados; actas con fecha, sesión, municipio y folio. | Expedientes autorizados, búsqueda de archivo histórico y política de retención/firma. |
| RF14 Acuerdos | Parcial | Vínculo a acta, cambio de estado y evidencia documental; UI de semáforo. | Aprobación institucional del flujo, revisión de documentos reales y control por municipio si se requiere. |
| RF15 Convenios | Parcial | Umbral 90/91 días y expiración probados localmente; PDF privado. | Vigencias reales, prueba de medianoche/zona horaria, responsable de alerta y aviso externo si se exige. |
| RF16 Censos ASH | Técnico local, campo pendiente | Validaciones y cobertura agregada por municipios autorizados en pruebas sintéticas. | Censos reales y definición/validación institucional de denominadores e indicadores. |

## Requisitos no funcionales

| RNF | Estado y límite comprobable | Para cerrarlo |
| --- | --- | --- |
| Rendimiento y concurrencia | **Parcial.** Dos instancias comparten contador local sobre la misma base; cargas directas evitan pasar archivos grandes por la API; consultas financieras agregan en base. | Medir API y tableros en el entorno final con volumen, carga normal y masiva, latencias p50/p95/p99, errores y red; comprobar el umbral de 2 s. |
| Seguridad | **Parcial.** Contraseñas con bcrypt, cookie HttpOnly, RBAC vigente, revocación y ámbito municipal en servicios. SQL de fase RF añade disparadores de solo inserción a bitácora, sin desplegar. | Identificar/migrar base, probar cuentas reales, correo, CSP, RLS con políticas por usuario/municipio si el requisito permanece, revisión de amenazas y auditoría externa. El propietario de BD puede modificar disparadores. |
| Fiabilidad y modo sin conexión | **Parcial.** Formularios y API validan; borradores locales y reintentos existen; simulación prueba no duplicar confirmaciones. | Dispositivos de campo, pérdida de red/cuota, cierres abruptos, sincronización conflictiva y respaldo del navegador. |
| Disponibilidad y recuperación | **Sin evidencia de cumplimiento 24/7.** Se constató disponibilidad puntual de despliegues previos. | Monitoreo longitudinal, objetivo contractual, alerta 5xx, respaldos de PostgreSQL/R2 y restauración ensayada. |
| Mantenibilidad y datos | **Parcial.** Módulos separados, esquema Prisma válido y compilaciones correctas. | Revisar 3FN y migración PostgreSQL sobre una copia real, comportamiento con registros heredados y procedimiento de reversión. |
| Usabilidad y portabilidad | **Parcial.** Svelte check/build sin errores y algunas capturas de escritorio/móvil previas. | Pruebas humanas por rol y dispositivo, lectores de pantalla, navegadores previstos, instrumento SUS completo; no inferir SUS 88,5. |

Los resultados y límites detallados están en [`RESULTADOS.md`](RESULTADOS.md). No usar esta matriz para afirmar los porcentajes de impacto o la capacitación narrados en el borrador del capítulo VI.
