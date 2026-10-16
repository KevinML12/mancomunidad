# Diagnóstico de los capítulos de la tesis

**Fecha:** 16 de octubre de 2026. **Rama:** `codex/chapter-diagnostic-2026-10-16`. **Base examinada:** `05618df` de `codex/night-release-readiness-2026-10-15`. Este informe examina el texto del repositorio y la evidencia técnica archivada; no certifica hechos institucionales ni sustituye la aprobación del asesor. Los cambios funcionales sin confirmar en la otra rama quedan fuera de esta fotografía y deberán cotejarse al integrar.

## Criterio de lectura y estado general

`CONTROL_DE_VERSIONES.md` identifica como documentos de trabajo `PG Cap 1 .docx`, `CAPÍTULO III.docx` y `PG Cap IV y V.docx`; sus extracciones `- revisado.txt` permiten revisar tablas y texto. Los demás TXT, PDF y DOCX alternativos son antecedentes sin sincronización garantizada. El capítulo II solo tiene una versión de marco teórico identificable; el capítulo VI no aparece entre los tres documentos de trabajo controlados. Se examinó `CAPÍTULO VI - revisado.txt` como **borrador por verificar**, y se constató que `CAPÍTULO VI.docx` contiene cinco tablas cuyo contenido no aparece en la extracción TXT. Antes de entregar una tesis debe decidirse una única versión maestra por capítulo y exportarla de nuevo.

| Capítulo | Estado actual | Riesgo principal | Prioridad |
| --- | --- | --- | --- |
| I. Anteproyecto | Objetivos y alcance de siete módulos definidos; delimitación de tres municipios consignada. | Redacción absoluta y logros anticipados; fechas y alcance no actualizados. | Alta |
| II. Marco teórico | Estructura y fuentes bibliográficas presentes. | Afirmaciones técnicas demasiado categóricas y referencias sin verificación externa completa. | Media |
| III. Metodología | Diseño preexperimental pareado y encuesta descriptiva definidos. | Población de 22 y piloto de 10 sin expediente; texto conserva seis municipios y mezcla instrumentos. | Crítica |
| IV. Análisis y requisitos | RF1–RF16 y RNF especificados; matriz de trazabilidad disponible. | Requisitos y diagnóstico contienen seis municipios y promesas de operación sin evidencia de aceptación. | Alta |
| V. Diseño | Arquitectura y casos de uso descritos. | Diagramas y explicación de almacenamiento, login y navegación ya no representan el sistema. | Alta |
| VI. Pruebas, implementación y resultados | Borrador narrativo y tablas en DOCX. | Presenta datos de campo y producción sin fuentes reproducibles; contradice I, III y el expediente de evidencia. | **Crítica; no presentarlo como resultado final** |

## Hallazgos por capítulo

### Capítulo I

1. La versión revisada distingue adecuadamente el diagnóstico inicial de 2023 del informe final de consultoría y declara tres municipios activos (`PG Cap 1 - revisado.txt`, líneas 1 y 180–182). Mantener esa delimitación y anexar el documento institucional que la confirme.
2. El objetivo general y los específicos son evaluables solo si se separan **entregables del software** de **efectos medidos en la institución** (líneas 128–147). Verbos como «certificar la ejecución real», «erradicar», «garantizar» y «asegurar» exceden lo que una fotografía, una huella SHA-256 o un tablero pueden probar. Reformular como registrar, verificar dentro del sistema y evaluar con indicadores.
3. El alcance temporal termina en agosto de 2026 (línea 186), mientras el repositorio registra desarrollo y diagnósticos de octubre. Distinguir período de investigación, desarrollo posterior y fecha de corte del informe.
4. La sección de estado al final del capítulo (líneas 270–284) ya reconoce que las mediciones pre/post, la usabilidad y los pesos IPIM son pendientes. Homogeneizar el resto del capítulo con esa cautela. La tabla de indicadores debe asociar fuente, fórmula, unidad, línea base, meta, fecha y responsable.

### Capítulo II

1. El marco teórico cubre nube, transacciones, RBAC, BPM, TAM e ISO/IEC 25010 (`CAPÍTULO II.txt`, líneas 8–164). Sirve como base conceptual, pero el control de versiones advierte que las referencias todavía no tienen revisión externa completa.
2. Corregir generalizaciones: un ORM **no impide por sí solo** toda inyección SQL (línea 44); desplegar en nube no garantiza disponibilidad de 99,9 % ni mejora de productividad institucional por sí misma (líneas 38–40); PostGIS se menciona como capacidad de PostgreSQL, pero el esquema del proyecto no acredita su uso (línea 84). Presentar estas posibilidades como propiedades condicionadas, no resultados locales.
3. Revisar que cada cita tenga entrada bibliográfica correcta y que la edición de la norma citada sea la usada. Conectar cada constructo TAM/ISO/SUS a instrumentos y variables que efectivamente se aplicarán en III; SUS y TAM no son una misma escala.

### Capítulo III

1. El diseño principal —un solo grupo con mediciones antes y después— y la encuesta posterior descriptiva están definidos (`CAPÍTULO III - revisado.txt`, líneas 40–47). Falta el padrón, selección final, consentimiento, equivalencia de tareas y datos originales. Los CSV de `evidencias/2026-10-12/instrumentos/` solo contienen encabezados; por ello **N = 22 es población propuesta, no muestra ejecutada**.
2. La sección 3.3.1 dice «tres municipios activos» y acto seguido enumera seis, además de otros dos en coordinación (líneas 55–57). También habla de seis alcaldes (línea 57). Corregir con la delimitación de I/IV y con organigrama/padrón institucional; no conservar ambas cifras.
3. La prueba piloto con diez funcionarios se relata como ejecutada (líneas 160–166), sin registros, consentimiento ni cálculo de alfa de Cronbach archivados. Redactarla como protocolo pendiente hasta contar con evidencia.
4. El cuestionario de 20 reactivos TAM/ISO (líneas 130–146 y 224–226) no acredita una puntuación SUS. Si se usará SUS, agregar su instrumento de diez ítems, reglas de cómputo y respuestas individuales; analizar TAM aparte. Conservar la prueba pareada elegida antes de ver datos y reportar supuestos, tamaño del efecto, intervalos y límites causales.
5. La fase VI presupone dos meses de uso y encuesta a los 22 funcionarios (líneas 192–194). Cambiar a plan condicionado y registrar fechas de inicio/fin de operación cuando existan.

### Capítulo IV

1. La especificación identifica RF1–RF16 y RNF de rendimiento, seguridad, fiabilidad, disponibilidad, mantenibilidad y usabilidad (`PG Cap IV y V - revisado.txt`, líneas 463–615). La matriz `evidencias/2026-10-12/MATRIZ_RF_RNF.md` documenta implementación y brechas, pero fue cerrada con el commit `d3eb396` y debe actualizarse después del trabajo funcional actual.
2. RF10 aún menciona aportes de **seis** municipalidades (línea 533) frente a tres activas. Resolver la discrepancia en el requisito, datos de prueba y catálogo. RF6 debe especificar el cálculo con **hitos ponderados aprobados**, decisión confirmada para el desarrollo posterior; registrar pesos, aprobación, evidencias y tratamiento de modificaciones. RF4 debe distinguir coordenadas EXIF y del dispositivo, fuente, precisión, ausencia y discrepancia. Una coordenada no prueba presencia física auténtica.
3. La narrativa de campo menciona CommCare y captura sin conexión (líneas 128–152 y 378). La integración CommCare no está acreditada; el modo local tiene restricciones documentadas en `README.md` (líneas 39–41). Precisar si se exige intercambio automático o solo importación manual, y el comportamiento esperado ante desconexión, pérdida del dispositivo y conflictos.
4. Los RNF de menos de dos segundos, 24/7, respaldo, restauración, bitácora inmutable y políticas RLS deben conservarse como **criterios de aceptación pendientes**. Las pruebas locales y una respuesta HTTP puntual no los acreditan. En el SQL se habilita RLS, pero no se hallaron políticas `CREATE POLICY` que apliquen la restricción por usuario/municipio a nivel de base.

### Capítulo V

1. Las figuras 5.10–5.12 y sus notas describen propuestas anteriores de Go/Supabase/R2 o evidencias binarias en base (`PG Cap IV y V - revisado.txt`, líneas 789–831). El código confirmado en `05618df` ya contiene flujo R2 para nuevos archivos, mientras otros registros pueden ser heredados. Sustituir figuras por el flujo **cliente → URL temporal → R2 → confirmación API → metadatos/huella en PostgreSQL**, indicar excepciones históricas y validar la topología real.
2. La explicación del login habla de `/dashboard` y una barra lateral oscura (línea 863); el producto actual usa portal público y navegación priorizada por rol. Redibujar pantallas y rutas con capturas verificadas de escritorio/móvil, sin presentar mockups como resultado de usabilidad.
3. El capítulo delimita siete módulos de tesis y deja talento humano e IPIM como extensiones (líneas 899–911). Conservar esa frontera. El capítulo VI no debe contar ocho módulos ni declarar válidos los pesos de IPIM sin aprobación institucional.
4. Revisar las figuras 4.1–4.7 y 5.1–5.14 en el DOCX maestro: numeración, texto alternativo, leyendas, referencias cruzadas y correspondencia con el código. Las notas de «dibujo pendiente de sustituir» no son apropiadas para versión final.

### Capítulo VI — hallazgo de mayor gravedad

1. Se afirman 120 pruebas unitarias «15 por módulo», 12 de integración y 132 aprobadas (`CAPÍTULO VI - revisado.txt`, líneas 27–81 y 223). `README.md` (línea 93) aclara que las 120 pruebas de `tests/legacy/` ensayan funciones definidas dentro de las propias pruebas, no la implementación. Deben sustituirse por resultados actuales, comando, commit, fecha, entorno, log y denominador correcto; el total de subpruebas de Node no equivale a casos de aceptación independientes.
2. Se afirman carga sostenida de 50 peticiones por segundo, 100 % de disponibilidad, 184 ms de media y p95/p99 (línea 99), pero el expediente de evidencia no contiene el artefacto reproducible de esa prueba. Medir en entorno y ventana definidos, con distribución de latencias, errores y reporte bruto antes de escribir cifras.
3. Se afirma auditoría en vivo del 3 de octubre con raíz Merkle, 35 registros y punto de control inmutable (líneas 119–129). El diseño revisado de IV/V describe una comprobación **interna** de huellas SHA-256, no certificación externa ni inmutabilidad ante quien administra la base. La base activa de Vercel sigue sin identificarse (`DIAGNOSTICO_PRODUCCION_2026-10-15.md`, líneas 38–42). Eliminar raíz, cantidad, fecha y alcance «oficial» hasta tener consulta, entorno, registro y verificación reproducibles. No atribuir conformidad a la CGC sin acto formal.
4. Se declaran cinco talleres ejecutados, 22 personas capacitadas, 21 aprobadas y 72,7 % de resistencia previa (líneas 137–159), pero `capacitacion.csv` y `usabilidad.csv` están vacíos. Mantener únicamente **plan de capacitación**, con actas, listas, instrumentos y resultados pendientes.
5. Se publican mejora del 93,9 %, SUS 88,5, t = 18,74 y p < 0,0001 (líneas 169–223) sin observaciones pareadas ni respuestas individuales. `pretest-postest.csv` solo tiene encabezado. Retirar tablas de resultados y conclusiones numéricas hasta disponer de datos anonimizados, fórmula reproducible y análisis independiente. Además, una prueba t sobre tiempo solo evalúa ese indicador: no demuestra por sí misma control financiero, transparencia ni causalidad de la intervención.
6. Se afirma recibo oficial Forma 63-A2, eliminación del 100 % de inconsistencias, políticas RLS por fila, 27 tablas en esquema aislado y CI/CD automático (líneas 109–135 y 215–223). Esas garantías no se desprenden del código ni del expediente: no hay flujo de autorización CGC, el SQL no define políticas RLS por municipio y no hay archivos de workflow en `.github/` en esta base. Verificar cada hecho antes de incluirlo. Llamar a los comprobantes del sistema «constancias internas» mientras no exista autorización institucional para otra denominación.
7. El capítulo VI `.docx` tiene cinco tablas, pero la extracción `- revisado.txt` solo conserva títulos/notas de las tablas 6.1–6.5. La edición final debe revisar el DOCX directamente, comprobar cálculos y regenerar una extracción íntegra; ninguna tabla de resultados debe rellenarse con cifras supuestas.

## Orden de corrección recomendado

1. **Bloquear el uso académico del capítulo VI como resultados.** Convertir las secciones 6.1–6.4 en plan, resultados técnicos verificables y espacios pendientes; retirar porcentajes, raíz, estadísticas, talleres y conclusiones no sustentadas.
2. **Unificar alcance y sujetos** en I, III, IV y VI: tres municipios activos; 22 personas solo como población propuesta hasta padrón y consentimiento; siete módulos del estudio, con extensiones separadas.
3. **Actualizar IV/V con el código confirmado**, la nueva matriz RF/RNF y las decisiones de hitos ponderados, EXIF + GPS del dispositivo y varios municipios por usuario. Los cambios no confirmados de la rama de desarrollo no deben describirse como desplegados.
4. **Completar expediente empírico**: versiones de instrumentos, observaciones crudas, condiciones de medición, consentimientos, talleres y análisis reproducible. Sin evidencia, informar «pendiente».
5. **Cerrar validación de producción**: identificar la base activa, respaldar/restaurar, migrar, probar cuentas reales autorizadas, correo de recuperación, carga R2, seguridad y rendimiento en entorno declarado. El estado local de la aplicación no equivale a producción.
6. **Control editorial final**: elegir DOCX maestro por capítulo; revisar bibliografía, citas, numeración de tablas/figuras, diagramas, anexos y formato de plantilla; generar PDF solo después de cotejarlo visualmente.

## Evidencia y límites de este informe

- Control documental: `capítulos/CONTROL_DE_VERSIONES.md`.
- Alcance funcional: `capítulos/PG Cap IV y V - revisado.txt` y `evidencias/2026-10-12/MATRIZ_RF_RNF.md`.
- Instrumentos vacíos y protocolo: `evidencias/2026-10-12/instrumentos/*.csv`, `evidencias/2026-10-12/README.md`, `PROTOCOLO_PENDIENTES.md`.
- Estado de despliegue: `DIAGNOSTICO_PRODUCCION_2026-10-15.md` y `docs/RELEASE_PRODUCCION.md`.
- Código y pruebas: `backend/src/`, `backend/prisma/`, `backend/tests/`, `frontend-svelte/src/` en el commit base indicado.

Este diagnóstico no verificó ante la institución membresía, plantilla laboral, resultados de campo, autorización de formatos financieros ni validez bibliográfica externa. Una ausencia de evidencia en el repositorio significa **no acreditado aquí**, no que el evento necesariamente no haya ocurrido.
