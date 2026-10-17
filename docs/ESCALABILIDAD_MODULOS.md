# Escalabilidad de los módulos · 16 de octubre de 2026

## Lo que quedó aplicado

| Área | Cambio aplicado | Límite que sigue vigente |
| --- | --- | --- |
| Acceso, roles y menú | Permisos, prioridades, tipo de tablero y alcance territorial/personal se leen del rol en PostgreSQL. El panel separado permite editarlos con contraseña, auditoría y revocación de sesiones. | Agregar un módulo nuevo exige implementar su ruta y pantalla; la administración cambia asignaciones existentes. El catálogo de tres municipios y sus polígonos todavía se mantiene en código porque cambiar límites requiere datos geográficos verificados. |
| Inicio | Obtiene métricas por módulo con máximo dos consultas simultáneas; muestra cada resultado al llegar. No descarga listas completas. | Los indicadores se actualizan cada 2 minutos con la pestaña visible, o cada 5 minutos si el navegador indica ahorro de datos/conexión muy lenta. No son tiempo real. |
| Proyectos | Lista en páginas de hasta 100 registros; el portal pide 50 o 20 según la conexión. Conteos y presupuesto usan agregación en PostgreSQL. | El detalle de un proyecto aún carga todas sus evidencias e hitos; expedientes de miles de archivos requerirán paginación secundaria. |
| ARC | Lista paginada y métricas por estado calculadas en PostgreSQL. | La búsqueda de responsables sigue consultando todas las cuentas con acceso ARC; al crecer la plantilla conviene buscar en servidor por texto. |
| Finanzas | Movimientos paginados; saldo por cuenta calculado en PostgreSQL. Archivos privados en R2. | El PDF anual reúne el ejercicio en memoria; si un año crece mucho, pasarlo a exportación por lotes. |
| Gobernanza | Actas y acuerdos paginados; conteos independientes para inicio. | Cada acta aún incluye todos sus acuerdos; separar la paginación de los acuerdos cuando un acta tenga muchos. |
| Convenios | Lista paginada y alertas de vencimiento calculadas con `count`. | Los importes y filtros de la pantalla se calculan sobre lo recibido; en volúmenes grandes, mover los totales filtrados a una consulta agregada. |
| Indicadores ASH | Censos paginados; consolidados y dictamen usan `groupBy`, sin cargar todos los registros en Node. | Exportaciones completas deben producirse como archivo, no como respuesta JSON única. |
| Control de integridad | El dictamen usa agregados; la revisión criptográfica completa se ejecuta al pedirla. | La revisión debe recorrer todos los registros para comparar huellas. Con gran volumen requerirá una tarea de fondo y checkpoints por lote. |
| Transparencia pública | Publicaciones en páginas de 30; estadísticas de cobertura calculadas en PostgreSQL. Archivos en R2. | El portal sigue reuniendo páginas sucesivas para búsqueda local; una búsqueda pública grande necesitará filtro y paginación en servidor. La ruta interna heredada `/transparencia/gestion` todavía carga listas completas; usar la administración separada para gestión. |
| Personal | Puestos, colaboradores, reclutamiento, ausencias, evaluaciones, disciplina y capacitación paginados. Los tableros usan conteos y hasta ocho alertas. El directorio y expediente respetan alcance propio/equipo/global. | El expediente individual y la lista de certificaciones de una capacitación pueden crecer; faltan páginas anidadas. |
| Administración | Cuentas y publicaciones paginadas; roles y módulos son un catálogo pequeño. | El cambio masivo de permisos cierra todas las sesiones del rol. Programarlo cuando no interrumpa trabajo en curso. |

Todas las listas paginadas ordenan con `id` como desempate. Se añadieron índices para filtros territoriales, fechas, relaciones y publicaciones. Los archivos nuevos siguen en R2; PostgreSQL guarda referencias y metadatos. El navegador actualiza únicamente la pantalla visible y conectada. Las solicitudes son secuenciales por lista; el inicio limita la concurrencia a dos.

## Pruebas de esta entrega

- 68 pruebas unitarias de backend, 43 de integración y 47 de frontend.
- Navegación real de los ocho roles contra la base aislada `mfn_e2e_20261016`: ingreso, tablero, 13 módulos y rechazo del panel especial. Se verificó el primer módulo de cada rol en Chromium y el acceso a 390 y 768 px.
- Migración de permisos e índices aplicada primero a la base aislada, luego a producción tras un respaldo privado. En producción: ocho roles válidos, una cuenta administradora nominativa con cambio de clave pendiente y cero cuentas QA.

## Antes de aumentar mucho el volumen

Medir con datos representativos la latencia de las páginas, el costo del PDF anual y la revisión de integridad. Si las listas pasan de miles de registros, cambiar la paginación por desplazamiento a cursores y mover las búsquedas locales a filtros del servidor. Verificar el plan de conexiones de Neon antes de aumentar instancias de Vercel. Estos cambios no se pueden declarar resueltos con una base casi vacía.
