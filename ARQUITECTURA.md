# Arquitectura de MFN Digital

## Límites actuales

| Capa | Responsabilidad | Ubicación |
| --- | --- | --- |
| Presentación | Pantallas SvelteKit y cliente HTTP; la visibilidad en la UI no sustituye permisos del servidor | `frontend-svelte/src/routes`, `frontend-svelte/src/lib/apiClient.js` |
| Composición HTTP | CORS, JSON, salud, errores y montaje de módulos | `backend/src/app.js` |
| Identidad | Sesiones, roles y recuperación | `backend/src/modules/identity/` |
| Módulos institucionales | Proyectos, ARC, finanzas, gobernanza, convenios, ASH/estadísticas y transparencia; inteligencia territorial es una extensión | `backend/src/modules/institutional/` |
| Personal | Tablero SIRH, puestos, colaboradores, reclutamiento, evaluaciones, ausencias, disciplina y capacitaciones | `backend/src/modules/personnel/` |
| Servicios | Reglas y datos de proyectos y finanzas; recuperación y entrega a un servicio HTTPS externo | `backend/src/services` |
| Datos y control transversal | Prisma, permisos, alcance, auditoría e integridad | `backend/src/lib`, `backend/src/middleware` |
| Operación | Migraciones y actualización de permisos ejecutadas por CLI, fuera del proceso HTTP | `backend/prisma`, `backend/package.json` |

Las rutas conservan los paths `/api/v1/*`. El backend de desarrollo usa SQLite. Producción usa un esquema PostgreSQL separado; el historial de migraciones SQLite no se aplica a PostgreSQL. El esquema `public` aloja otra aplicación y debe permanecer intacto.

## Auditoría y decisiones

1. **Migración administrativa por HTTP:** `app.js` exponía DDL con una clave predeterminada y devolvía detalles de errores. Se retiró la ruta completa. Las operaciones de base quedan en scripts de administración revisables, ejecutados con la conexión correspondiente y respaldo previo.
2. **Credenciales en documentación:** `DESPLIEGUE.md` contenía una contraseña compartida. Se retiró del archivo actual. Sigue presente en el historial de Git; las cuentas activas que la hayan usado requieren rotación individual y revocación de sesiones. Cambiar la documentación no rota credenciales.
3. **Composición de módulos:** el montaje de 17 rutas estaba mezclado con configuración HTTP y DDL en `app.js`. Ahora las rutas viven en tres directorios de dominio, cada uno con su compositor. La autorización sigue en cada ruta mediante `requireAuth` y `requirePermission`.
4. **Recuperación:** la ruta mezclaba validación HTTP, transacciones, tokens y el envío HTTPS. La ruta conserva la validación y respuesta; `password-recovery.js` coordina la transacción y `reset-delivery.js` aísla el proveedor externo. La prueba de integración cubre entrega, uso único y revocación de sesión.
5. **Proyectos y finanzas:** sus rutas contenían validación, cálculos, acceso a datos y forma de la respuesta. Las reglas y operaciones de datos pasaron a `services/projects.js` y `services/finance.js`; las rutas conservan permisos, estado HTTP y manejo de errores. Las pruebas de integración recorren las rutas reales y la base migrada.

## Trabajo pendiente antes de considerar la separación completa

- Los módulos ARC, gobernanza, convenios, estadísticas, transparencia, inteligencia y personal aún contienen reglas de negocio y acceso Prisma directo. Extraer servicios por módulo de forma incremental, comenzando por transparencia y gobernanza, junto con pruebas de sus invariantes. Evitar mover código solo para cambiar nombres de carpetas.
- El código financiero sigue generando correlativos con `count() + 1` y el año fijo 2024. Dos solicitudes simultáneas pueden generar el mismo código; se requiere un mecanismo transaccional de secuencia y una regla institucional para el año antes de cambiar códigos existentes. Las pruebas unitarias históricas del módulo financiero usan funciones definidas en el propio archivo de prueba y no ejercitan el servicio real.
- `frontend/` es la interfaz React anterior y `frontend-svelte/src/lib/api.js` contiene hooks de SIRH sin consumidores en las rutas Svelte actuales. Confirmar dependencias externas antes de archivarlos o retirarlos.
- El limitador de intentos en memoria (`backend/src/middleware/rate-limit.js`) se reinicia por instancia. Para producción distribuida requiere almacenamiento compartido y pruebas de límite efectivo.
- Verificar en Vercel que `CLIENT_URL`, `JWT_SECRET`, la conexión PostgreSQL y la entrega de recuperación están configurados. Probar respaldos y restauración, y ejecutar recorridos por rol con cuentas individuales. Las pruebas SQLite no acreditan el estado de producción.
