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

Las sesiones JWT incluyen tipo y versión y se entregan en una cookie `HttpOnly`, `Secure` en producción y `SameSite=Lax`. El navegador no guarda el token en `localStorage`. Cada petición autenticada consulta el rol y los permisos vigentes en la base. Restablecer la contraseña revoca las sesiones anteriores. No existen tokens fijos de demostración.

La administración de la aplicación vive en `admin-app/`, con despliegue y dominio propios. Las rutas `/api/v1/admin/*` exigen una cuenta cuyo correo exacto aparezca en `APP_ADMIN_EMAILS`; la lista vacía no autoriza a nadie. Las cuentas de demostración no reciben este permiso. Configurar `ADMIN_CLIENT_URL` con el origen HTTPS de la aplicación de administración. Cuando se entregue una cuenta real para esta función, agregar solo ese correo a la lista y volver a desplegar el backend.

La recuperación utiliza un código aleatorio de un solo uso, almacenado como hash y válido por 15 minutos. El código no se entrega a quien solicita la recuperación: un servicio HTTPS configurado debe enviarlo al correo propietario. Sin configuración, el endpoint devuelve 503.

Las altas, cambios y bajas de los nueve modelos operativos incluidos en el control de integridad se registran junto con su auditoría en una misma transacción. Se guardan huellas del registro antes y después. La verificación reproduce esos eventos desde un punto de control y compara todos los campos de los registros. Un GET no crea puntos de control; el POST exige permiso de aprobación y rechaza discrepancias.

Este control es interno. No es una certificación de la CGC, un árbol de Merkle formal ni un almacenamiento inmutable frente a quien administra la base. La protección y respaldo de la base de datos continúan siendo necesarios.

Las evidencias nuevas conservan la foto PNG/JPEG en Cloudflare R2. La base guarda solo la referencia, el SHA-256 y los metadatos; no guarda nuevos archivos en base64. Las publicaciones creadas desde la administración también guardan imágenes y PDF en R2. Los PDF de actas, acuerdos y convenios se suben directamente a R2 mediante una URL temporal. Las evidencias antiguas que ya tenían contenido base64 en la base siguen siendo legibles y requieren una migración aparte si se desea liberar ese espacio. Las coordenadas proceden del cliente y no prueban la ubicación real. Los enlaces externos históricos se señalan como no verificados. No hay extracción EXIF implementada.

### Modo de campo con conexión previa

La aplicación activa el service worker después de iniciar sesión y conserva los archivos de la interfaz. Tras abrir la cartera y el expediente de un proyecto con conexión, guarda una copia local de esos datos en IndexedDB. Al perder la señal puede mostrar esa copia con su fecha de actualización. Una evidencia nueva puede guardarse como borrador local y se intenta enviar al restablecerse la conexión; antes de reintentar, el cliente compara su SHA-256 con las evidencias del proyecto para evitar duplicados por una respuesta de red perdida. Los borradores no forman parte del servidor hasta que la pantalla confirme su sincronización. Cerrar sesión borra las copias locales y solicita confirmación si hay borradores sin enviar.

El modo de campo requiere una primera visita en línea y el mismo navegador y dispositivo. No replica toda la base, no permite iniciar una sesión nueva sin señal y no sustituye la validación EXIF ni una prueba de conectividad en cada comunidad. Use un dispositivo de confianza: las copias y fotos pendientes permanecen en el almacenamiento local del navegador mientras la sesión sigue abierta.

Para probarlo manualmente: inicie sesión, abra `/proyectos` y un expediente, active *Offline* en DevTools y recargue ambas páginas. El aviso debe mostrar la fecha de la copia. Desde el expediente, registre una fotografía y compruebe que figure como pendiente local; vuelva a activar la red y confirme que aparece en el expediente y desaparece de los pendientes. Repita con el mismo archivo para comprobar que no se duplica. Cierre sesión y verifique que el service worker se desregistra y se borran las copias del usuario.

Las consultas públicas de solicitudes emplean un código aleatorio y solo devuelven estado y fechas, sin contactos ni descripción. Los códigos secuenciales históricos no se consultan por la ruta pública.

## Desarrollo y migraciones

### HTTPS y peticiones simultáneas

El portal público está en `https://frontend-svelte-vert.vercel.app`, la administración en `https://admin-app-kappa-red.vercel.app` y la API en `https://backend-eosin-omega-81.vercel.app`; usan los subdominios incluidos por Vercel, sin compra de dominio. `/` muestra el portal público y `/inicio` el panel del usuario autenticado. Ambos frontends llaman a `/api/v1` en su propio origen mediante una reescritura HTTPS hacia la API, de modo que la cookie de sesión no viaja entre dominios distintos. La interfaz publica cabeceras HSTS, protección frente a marcos y actualización de recursos inseguros. Los enlaces nuevos a documentos externos también exigen HTTPS. Si se adopta un dominio propio, actualizar las reescrituras, `CLIENT_URL` y `ADMIN_CLIENT_URL` y comprobar la redirección HTTP, el certificado y las cabeceras en los tres servicios.

El inicio limita a tres sus consultas paralelas y descarta respuestas de intentos anteriores. La aprobación de vacaciones cambia el estado y descuenta el saldo en una transacción; una segunda aprobación devuelve 409. Las pruebas de integración envían dos aprobaciones simultáneas y verifican un solo descuento. El límite de peticiones utiliza contadores atómicos en la base compartida, incluidos un límite por IP y otro por cuenta para el login; funciona entre instancias del backend.

Para actualizar una laptop desde `main`, preparar los dos servicios y probar el modo de campo, siga [FLUJO_LOCAL.md](FLUJO_LOCAL.md). Los comandos siguientes son la referencia breve para un entorno ya configurado.

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
```

La validación predeterminada ejecuta las pruebas en `tests/integration/`: ejercitan las rutas Express y una base temporal migrada, incluidos permisos, recuperación, archivos, privacidad, persistencia y auditoría. Las 120 pruebas de `tests/legacy/` definen funciones dentro de los propios archivos de prueba; se conservan como antecedentes con `npm run test:legacy`, pero no verifican la implementación de la aplicación. Estas pruebas tampoco sustituyen la evaluación institucional de la investigación.

## Documentación académica

Consultar `capítulos/CONTROL_DE_VERSIONES.md` para identificar los documentos de trabajo y las verificaciones institucionales pendientes. El diagnóstico inicial de 2023 debe distinguirse del informe final de consultoría y de los avances del plan de mejoras: el problema de investigación se formula como integración y seguimiento de procesos existentes.
