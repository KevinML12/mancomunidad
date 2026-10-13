# Captura, revisión de evidencias y avance por hitos

Fecha: 13 de octubre de 2026. Alcance: aplicación web y API; capítulos académicos sin modificar.

## Comportamiento incorporado

- La fotografía se guarda primero en IndexedDB, con identificador de envío estable. Solo se retira el borrador cuando la API confirma un ID y la huella esperada. Los fallos conservan el borrador y muestran su motivo; puede descargarse el original.
- Sincronización al abrir el expediente con conexión, al recuperar conexión o mediante botón. No se promete envío con el navegador cerrado ni sincronización general de todos los módulos.
- El servidor evita duplicados por proyecto y fotografía y por identificador de envío, con transacción serializable, restricciones únicas y reintentos. No mueve automáticamente una fotografía a otro hito.
- Los planes contienen 1–30 hitos con nombre, criterio de aceptación y pesos de dos decimales que suman 100%. Se definen una sola vez en esta versión; no se pueden editar ni reemplazar después de activarlos.
- Activar el plan reemplaza el avance manual por cero. Cada hito aporta su peso cuando tiene al menos una evidencia aprobada. Varias fotos del mismo hito no suman avance adicional. Revocar la aprobación recalcula el avance.
- Aprobar/rechazar exige el permiso proyectos/aprobar y un motivo. El servidor registra autor de revisión, fecha, versión e historial de decisiones. Una versión antigua devuelve 409. El archivo original no se modifica. La versión no impone separación entre quien carga y quien revisa; esto requiere política institucional.
- Escritura, historial, cálculo del avance y auditoría se confirman en la misma transacción. El proyecto no admite edición manual del porcentaje después de activar los hitos.
- Los proyectos anteriores siguen con avance manual. Los campos nuevos neutros no cambian sus huellas históricas; no se reinician puntos de control ni se certifica su contenido.

## Comprobaciones realizadas

1. Integración HTTP con base SQLite temporal migrada: 24 casos hijos y la suite principal, 25 resultados aprobados, cero fallos.
2. Envíos simultáneos iniciales con el mismo identificador generan una sola evidencia. Reenvío con otro identificador y el mismo archivo devuelve la evidencia conservada.
3. Dos revisiones simultáneas de la misma versión: una se confirma y otra recibe 409. Prueba de permisos: Dirección de Proyectos no puede aprobar.
4. Plan con total incorrecto rechazado; plan existente no reemplazable; porcentaje manual bloqueado en modo hitos. Aprobación aporta 60%; rechazo posterior retorna a cero.
5. Fallo provocado al escribir historial revierte la revisión y conserva versión y avance anteriores.
6. Nuevos campos neutros conservan la huella de registros históricos; una decisión de revisión sí la modifica.
7. Navegador con API real local y datos sintéticos: plan de un hito al 100%; interrupción de la API; carga PNG; borrador pendiente conservado tras recarga; restauración de la API; sincronización de una sola evidencia; revisión aprobada; avance calculado 100%.
8. Chequeo Svelte sin errores ni advertencias y compilación del frontend correctos. Prisma de producción generado correctamente.

Estas pruebas no acreditan concurrencia en PostgreSQL, pérdida total de red con navegador cerrado, almacenamiento lleno, equipos reales en comunidades, autenticidad EXIF ni autorización CGC.

## Publicación pendiente

Debe aplicarse `backend/prisma/field-workflow.sql` una sola vez, sobre el esquema **mancomunidad** de la base correcta, después de comprobar respaldo y el punto de control vigente. La migración agrega tablas y columnas; no elimina datos ni cambia porcentajes existentes. HitoProyecto y RevisionEvidencia se crean con RLS.

La conexión local es SQLite; la variable sensible DATABASE_URL de Vercel no puede descargarse para migrar. El proyecto Supabase inicialmente abierto en Brave no contiene mancomunidad. No se aplicó SQL de escritura allí.

Orden de publicación: respaldo y migración correcta; despliegue backend; comprobar expediente e integridad sin discrepancias; despliegue frontend; repetir recorrido en producción con expediente de prueba autorizado. No publicar el backend nuevo sobre una base sin migrar.
