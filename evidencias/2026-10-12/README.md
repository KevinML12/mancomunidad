# Expediente real de evidencia técnica MFN Digital

Fecha local: 12 de octubre de 2026, America/Guatemala.
Código probado y desplegado: `d3eb396c7f3bde02cf929afa3e07926916cbb8af`.

## Resultado

- 19 resultados aprobados en Node: 18 casos y la suite padre; 0 fallos, 0 omitidos.
- Svelte check: 0 errores y 0 advertencias.
- Frontend build aprobado; cliente Prisma PostgreSQL generado correctamente.
- Backend y frontend publicados en sus proyectos originales de Vercel, conservando URLs.
- HTTP 200 en inicio, login, transparencia, service worker, manifest y API pública; HTTP 401 en proyectos sin sesión; ruta administrativa de migración no publicada (404).
- Navegador recargado: portal nuevo muestra «Registros publicados», «Publicaciones y resoluciones» y «Avance físico reportado»; ya no afirma «EXIF & GPS Validado». Carga un proyecto y cuatro publicaciones desde la API. Evidencia visual: `portal-publicado.jpg`.

## Archivos

| Archivo | Alcance |
| --- | --- |
| `MATRIZ_RF_RNF.md` | Trazabilidad completa de requisitos, evidencia y criterios pendientes. |
| `resultados-locales.json` | Entorno, código y resultados de chequeos locales. |
| `registros/integracion.log` | Ejecución real de rutas HTTP con base SQLite migrada y aislada y datos sintéticos. |
| `registros/frontend-check.log` | Diagnósticos reales de Svelte. |
| `registros/frontend-build.log` | Compilación real del frontend. |
| `registros/backend-build.log` | Generación real del cliente Prisma PostgreSQL, sin migración de datos. |
| `produccion.json` | IDs, commits, estados Vercel y pruebas HTTP públicas, sin cuerpos privados. |
| `portal-publicado.jpg` | Captura real de interfaz pública; no pantalla de demostración con datos inventados por el agente. Los registros mostrados no se certificaron como datos institucionales auténticos. |
| `PROTOCOLO_PENDIENTES.md` | Procedimientos para producir evidencia institucional, de campo y operación. |
| `instrumentos/*.csv` | Plantillas vacías; no representan observaciones ni participantes. |
| `MANIFIESTO_SHA256.json` | Huellas de archivos del expediente y fuentes de pruebas. No es certificación externa ni firma digital. |

## Reproducción local

```bash
npm --prefix backend run test:integration
npm --prefix frontend-svelte run check
npm --prefix frontend-svelte run build
npm --prefix backend run build
```

El último comando restablece el cliente PostgreSQL después de que las pruebas generen el cliente SQLite. Los tests usan una base temporal y no migran producción. No ejecutar seeds ni migraciones como parte de esta reproducción.

Para trazabilidad Git, el código de pruebas está en `backend/tests/integration/routes.test.js`. El commit posterior de este expediente no modifica el runtime desplegado: solo incorpora evidencia y constancia de Misael.

## Límites

La matriz está cerrada documentalmente, no todos los requisitos están aceptados. Recuperación se probó con receptor simulado; no se acredita correo real. No hay mediciones humanas suficientes para sostener resultados SUS, tiempos administrativos o hipótesis del borrador VI. La prueba previa de offline del entorno nube se cita solo como antecedente; no se archivó aquí su ejecución original ni se convierte en una prueba de campo. Publicar service-worker.js acredita que el archivo está disponible, no que el modo offline funcione en todas las situaciones.

No se realizaron escrituras de negocio, migraciones, cambios de contraseña, envío de correo o restauración sobre producción. Las pruebas de creación y actualización se realizaron únicamente en SQLite temporal. No se acredita disponibilidad mensual, normas vigentes CGC, autenticidad EXIF, 3FN formal, inmutabilidad absoluta ni idempotencia concurrente general.

## Privacidad

No contiene `.env`, secretos de Vercel/Stitch, contraseñas reales, tokens de sesión, consentimientos, padrón real ni respaldos de producción. `output/` preexistente y documentos del capítulo VI se conservan sin cambios. Originales institucionales sensibles deberán almacenarse con acceso restringido y anexarse de forma anonimizada.
