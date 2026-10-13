# Protocolo de cierre de evidencias pendientes

Fecha: 12 de octubre de 2026. Instrumentos vacíos, no resultados obtenidos.

## Evaluación institucional y académica

1. Confirmar padrón de participantes, municipios y consentimiento. No asumir N=22 sin padrón actual. Usar identificadores anónimos; conservar consentimientos fuera del repositorio público.
2. Definir tareas equivalentes antes/después, instrucciones, recursos y condiciones. Registrar cada observación en `instrumentos/pretest-postest.csv`, incluidos errores y tareas no completadas. Conservar originales de medición y explicar aprendizaje/capacitación como factores concurrentes.
3. Aplicar un instrumento SUS íntegro y versionado. Registrar las diez respuestas 1–5 por participante, sin sustituirlas por promedios TAM. Calcular puntuación individual mediante la regla correspondiente al instrumento; conservar hoja de cálculo y fórmulas verificables. Analizar TAM por separado si se aplica.
4. Reportar asistencia y desempeño reales en `instrumentos/capacitacion.csv`. No llenar asistentes o éxitos por previsión.
5. Definir unidad de análisis. No usar seis promedios de procesos como si fueran 22 diferencias individuales. Recalcular la prueba estadística solo con mediciones pareadas válidas y supuestos revisados; no interpretar p como porcentaje de certeza de la hipótesis.

## Campo y sincronización

Ejecutar y documentar en San Pedro Soloma, Santa Eulalia y San Rafael la Independencia. Registrar comunidad, navegador/dispositivo y conexión real en `instrumentos/campo.csv`.

- Con conexión: iniciar sesión, visitar cartera y expediente, esperar instalación del service worker y confirmar copia local.
- Sin conexión: recargar cartera y expediente visitados; distinguir datos locales, fecha de copia y datos inexistentes. Guardar fotografía de prueba autorizada, comprobar borrador después de cerrar/reabrir navegador.
- Recuperar conexión: sincronizar, comprobar archivo y SHA-256 en servidor y eliminación local solo después de aceptación. Interrumpir la respuesta y reintentar; contar duplicados.
- Dos pestañas/dispositivos: envío simultáneo del mismo archivo y borrador; documentar resultado. La deduplicación del cliente no garantiza idempotencia atómica del servidor.
- Permiso revocado, token expirado, cambio de usuario y cierre de sesión: comprobar que no se suben borradores con identidad equivocada ni se revelan datos a otra cuenta; registrar política de limpieza local.

No publicar fotografías, coordenadas, tokens ni registros personales como anexos abiertos.

## Operación

- Correo: configurar proveedor/servicio HTTPS real y probar solicitud, recepción, expiración, uso único y revocación con una cuenta de prueba autorizada. No cambiar contraseñas de funcionarios para probar.
- Respaldo: documentar servicio/plan, retención, responsable y cifrado. Restaurar un respaldo a una base aislada, comparar conteos y huellas; no restaurar sobre producción. Registrar tiempo real y resultados.
- Rendimiento: definir escenarios, duración, carga y límites aprobados; guardar resultados crudos, errores, percentiles y versión. Una respuesta HTTP 200 no acredita 24/7 ni 99.9% mensual.
- CGC: obtener series/folios, estatutos y autorizaciones vigentes aplicables; cotejar con responsables. No emitir un documento con apariencia de autorización oficial sin soporte.

## Capítulo VI

Mantener como borrador. Incorporar solo resultados de este expediente y evidencia institucional que efectivamente exista. Reemplazar o marcar pendientes las cifras 93.9%, SUS 88.5, 21/22 asistentes exitosos, 184 ms, disponibilidad 100% y t=18.74 hasta poder reproducirlas desde originales. Evitar afirmar Merkle, inmutabilidad absoluta o certificación externa cuando el mecanismo es un control interno SHA-256.
