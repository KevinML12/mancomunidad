# MFN Digital

Plataforma de gestión y seguimiento intermunicipal para la Mancomunidad Frontera del Norte. Centraliza proyectos, acciones del plan ARC, movimientos financieros, actas, convenios e indicadores ASH, con un portal de transparencia. Recursos humanos conserva su subsistema SIRH.

La investigación delimita siete módulos funcionales: proyectos, ARC, finanzas, gobernanza, convenios, ASH y transparencia. Autenticación y permisos son transversales. Inteligencia territorial y talento humano son extensiones del prototipo; su existencia no amplía automáticamente el alcance académico aprobado.

## Cobertura territorial

La membresía activa utilizada para esta implementación es **San Pedro Soloma, Santa Eulalia y San Rafael la Independencia**, según la lista del capítulo IV del PG y la confirmación del responsable del proyecto el 3 de octubre de 2026. Los otros municipios mencionados en los antecedentes corresponden a cobertura histórica. El municipio se guarda explícitamente en cada proyecto; los registros históricos sin municipio no se asignan por inferencias del nombre. Los registros de municipios históricos se conservan; el IPIM y los nuevos formularios utilizan el catálogo activo.

## Implementación

- Svelte 5 y SvelteKit 2, Vite 8 y Tailwind CSS 3 en `frontend-svelte/`.
- Node.js, Express 4 y Prisma 6 en `backend/`.
- SQLite para desarrollo; esquema PostgreSQL separado para producción.
- La carpeta React `frontend/` corresponde a la interfaz anterior.
- Go es una alternativa futura, no el backend implementado.

No se ha demostrado en esta entrega un SLA de 99.9%, una mejora estadística de tiempos ni la ausencia de sesgos del índice IPIM. Las mediciones requieren datos y validación institucional.

## Seguridad y alcance del control interno

Las sesiones JWT incluyen tipo y versión. Cada petición autenticada consulta el rol y los permisos vigentes en la base. Restablecer la contraseña revoca las sesiones anteriores. No existen tokens fijos de demostración.

La recuperación utiliza un código aleatorio de un solo uso, almacenado como hash y válido por 15 minutos. El código no se entrega a quien solicita la recuperación: un servicio HTTPS configurado debe enviarlo al correo propietario. Sin configuración, el endpoint devuelve 503.

Las altas, cambios y bajas de los nueve modelos operativos incluidos en el control de integridad se registran junto con su auditoría en una misma transacción. Se guardan huellas del registro antes y después. La verificación reproduce esos eventos desde un punto de control y compara todos los campos de los registros. Un GET no crea puntos de control; el POST exige permiso de aprobación y rechaza discrepancias.

Este control es interno. No es una certificación de la CGC, un árbol de Merkle formal ni un almacenamiento inmutable frente a quien administra la base. La protección y respaldo de la base de datos continúan siendo necesarios.

Las evidencias nuevas conservan el archivo PNG/JPEG y su SHA-256 en la base, con un límite de 5 MB. Las coordenadas proceden del cliente y no prueban la ubicación real. Los enlaces externos históricos se señalan como no verificados. No hay extracción EXIF ni funcionamiento sin conexión implementados.

Las consultas públicas de solicitudes emplean un código aleatorio y solo devuelven estado y fechas, sin contactos ni descripción. Los códigos secuenciales históricos no se consultan por la ruta pública.

## Desarrollo y migraciones

```sh
cd backend
npm ci
# Configurar .env con DATABASE_URL local y JWT_SECRET aleatorio.
npx prisma generate --schema prisma/schema.prisma
npx prisma migrate deploy --schema prisma/schema.prisma
npm run permissions:update
npm run dev
```

En otra terminal:

```sh
cd frontend-svelte
npm ci
npm run dev
```

El script de permisos actualiza los roles existentes sin eliminar cuentas. El seed de datos ficticios es destructivo y exige `ALLOW_DEMO_SEED=true`; no debe ejecutarse sobre datos institucionales.

Para PostgreSQL existente: respaldar la base, revisar `backend/prisma/production-additions.sql` y ejecutar `npm run migrate:production` con la conexión correspondiente. Luego generar el cliente con `npx prisma generate --schema prisma/schema.production.prisma` y ejecutar `npm run permissions:update`. El historial `prisma/migrations/` es SQLite y no debe aplicarse a PostgreSQL. Para una base nueva e identificada de MFN, usar `npm run migrate:production:bootstrap`; crea el esquema sin cuentas ni datos ficticios y habilita RLS para impedir acceso directo a las tablas privadas mediante la API de Supabase. La conexión del backend debe utilizar el propietario de las tablas.

## Entrega del correo de recuperación

Configurar `RESET_DELIVERY_URL` y `RESET_DELIVERY_SECRET` en el backend. El servicio recibe un POST HTTPS con `{correo, token, expira}` y `Authorization: Bearer <secreto>`. Debe enviar el código solamente al correo indicado y no registrar el token en logs. Las pruebas usan un receptor local simulado y no envían correos.

## Verificación

```sh
cd backend
npm test
npm run test:integration
```

Las 120 pruebas históricas comprueban funciones aisladas. Las pruebas en `tests/integration/` ejercitan las rutas Express con una base temporal migrada y cubren permisos, recuperación, archivos, privacidad, persistencia y auditoría. No constituyen por sí mismas la evaluación institucional de la investigación.

## Documentación académica

Consultar `capítulos/CONTROL_DE_VERSIONES.md` para identificar los documentos de trabajo y las verificaciones institucionales pendientes. El diagnóstico inicial de 2023 debe distinguirse del informe final de consultoría y de los avances del plan de mejoras: el problema de investigación se formula como integración y seguimiento de procesos existentes.
