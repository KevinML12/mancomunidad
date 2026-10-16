# Estado de producción de MFN Digital

Actualizado el 16 de octubre de 2026 a las 15:54 UTC. El portal público, la API y el panel independiente están publicados desde la rama `codex/night-release-readiness-2026-10-15`:

| Servicio | URL | Despliegue |
| --- | --- | --- |
| Portal | https://frontend-svelte-vert.vercel.app/ | `dpl_rZTAF6ZXdr8xrXv7NUmQpfWiw9vL` |
| API | https://backend-eosin-omega-81.vercel.app/ | `dpl_EMsNYS2emPSR131TbdtQUCEv7LeM` |
| Administración | https://admin-app-kappa-red.vercel.app/ | `dpl_7MZFMruNjYUFzW6hqJaNPxNfFctF` |

Los proyectos de Vercel no están conectados a Git; los tres despliegues se crearon desde el árbol local revisado. Los despliegues anteriores eran API `dpl_HKGM5JH8fRJFsMFHnPSYpLbfs7ei`, portal `dpl_3ssCvZojS42Xf1zeEbBrbrwjdAb9` y administración `dpl_5WyZNwUSDVaFzxCqjRzKCurqdEoT`. **Volver a la API anterior reabriría su base y las credenciales de demostración conocidas; no usarla como reversión automática sin asegurar primero esas cuentas.**

## Datos y credenciales

El usuario autorizó expresamente usar la Neon entregada aunque dejaran de aparecer los registros públicos de la base anterior. El portal nuevo empieza con 0 publicaciones, 0 proyectos públicos y 0 censos. Antes del cambio se guardó una copia privada de la respuesta pública anterior, que contenía 4 publicaciones, 1 proyecto y estadísticas de 2 censos:

- `/Users/kevv/Documents/Backups/mancomunidad/mfn-live-public-20261016T154658Z.json`, SHA-256 `ab24b6ec3d1b463439ac447c6a332c70b53acf55545aaa9b0b75da90286ba7f9`, permisos `0600`. Este archivo **no es un respaldo completo** de la base anterior. Los registros anteriores no se borraron; su base ya no está conectada al portal.
- `/Users/kevv/Documents/Backups/mancomunidad/mfn-neon-candidate-before-rf-20261016T153637Z.dump`, SHA-256 `40e999b5c8fcb992df3f2acab82c16fbc58fe639257a2eaed8f1d40bde734a4d`, permisos `0600`. Se restauró y probó antes de migrar. Contiene claves antiguas de demostración y no debe restaurarse directamente sobre producción.
- `/Users/kevv/Documents/Backups/mancomunidad/mfn-neon-live-after-release-20261016T155609Z.dump`, SHA-256 `761e573af509f61228be0202295b060626c9d9555447124811a58d6280cc2397`, permisos `0600`. Respaldo posterior al despliegue y a la revocación de claves; se restauró en PostgreSQL temporal y conservó 8 cuentas, 13 registros de bitácora y 2 versiones de esquema.
- `/Users/kevv/Documents/Backups/mancomunidad/mfn-r2-live-20261016T160214093Z/`, permisos `0700`. Copia local de 19 objetos R2 (52.4 MB) con manifiesto y SHA-256 individual; se verificaron los 19 archivos. Es un respaldo puntual, no una sincronización continua.

La Neon entregada conservó sus 8 cuentas. Primero se ensayaron en una copia restaurada y después se aplicaron `production-legacy-neon-20261016.sql`, `production-release-20261015.sql` y `production-rf-20261016.sql`. El esquema quedó compatible, con 2 versiones registradas y 2 disparadores de bitácora. La contraseña de Neon expuesta en la conversación se rotó; la conexión vigente está en un archivo privado local fuera de Git y como `DATABASE_URL` sensible en Vercel. Las 8 claves de demostración se sustituyeron por valores aleatorios descartados y sus sesiones se revocaron. La contraseña antigua de demostración devuelve 401.

`APP_ADMIN_EMAILS` está vacío. Ninguna cuenta de demostración recibió permiso administrativo. La operación institucional queda cerrada hasta crear cuentas nominativas, entregar sus claves por un canal seguro, asignar municipios y designar el primer administrador. No hay proveedor de correo para recuperación de claves; esa función continúa deshabilitada.

## Comprobaciones reales tras publicar

| Grupo | Resultado |
| --- | --- |
| Rutas y HTTPS | Portal, transparencia, login, convenios, panel y API respondieron 200. El panel sin sesión respondió 401. HTTP redirigió a HTTPS con 308; las respuestas HTTPS incluyeron HSTS. CORS autorizó el origen del portal y no autorizó uno ajeno. |
| Sesión y permisos | Una clave temporal produjo login 200 y cookie `HttpOnly`/`Secure`; el panel devolvió 403 para esa cuenta; logout 200; reutilizar la cookie devolvió 401. La clave temporal se revocó al terminar. |
| Concurrencia y archivos | 14 intentos simultáneos con cuenta inexistente dieron 10 respuestas 401 y 4 respuestas 429. R2 pasó CORS, PUT firmado y verificación de metadatos; el objeto temporal se eliminó. |

Las pruebas locales anteriores también pasaron: 68 unitarias y 41 de integración del backend, 46 del frontend, chequeo y compilación de Svelte y compilación de administración. Los resultados y la matriz RF/RNF están en `evidencias/2026-10-16-simulacion/`. Esto no acredita todavía pruebas de campo ni aceptación institucional de todos los RF/RNF.

## Pendiente para la entrega institucional

1. Recibir el correo exacto de una persona administradora, crear su cuenta personal y configurar solo ese correo en `APP_ADMIN_EMAILS`. No reactivar las cuentas de demostración.
2. Cargar y aprobar publicaciones y registros reales; el contenido anterior no se migró por decisión expresa del usuario.
3. Contratar o configurar un proveedor de correo, probar la recuperación de claves y documentar la entrega de credenciales.
4. Ejecutar con usuarios reales las pruebas de campo de RF/RNF, rendimiento, permisos municipales, EXIF/GPS, hitos ponderados y respaldo/restauración. Revisar las políticas RLS antes de considerar el tratamiento de datos plenamente aceptado.

La ruta de administración es independiente del portal institucional, pero su nombre de dominio no sustituye el control de acceso: la autorización depende de sesión y de `APP_ADMIN_EMAILS`.
