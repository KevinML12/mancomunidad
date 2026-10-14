# Formularios, documentos y navegación por rol

Fecha: 13 de octubre de 2026 (Guatemala). Pruebas de navegador realizadas manualmente con la interfaz real, API Express local y SQLite aislada. No se sembró ni modificó información institucional en producción.

## Problemas reproducidos y corregidos

- Convenios y ASH mostraban acciones de escritura a usuarios de consulta, aunque la API las denegaba. Ahora la interfaz exige el permiso de edición correspondiente. No se otorgaron permisos nuevos.
- Los montos de convenios usaban step=1000 y rechazaban 1330.00. Ahora admiten centavos; la API rechaza negativos y más de dos decimales.
- La prórroga usaba un prompt del navegador y ocultaba el error real. Ahora tiene formulario propio, fecha explícita, validación y error visible. Solo registra una extensión autorizada; no firma ni aprueba una adenda.
- Los formularios de Convenios y Gobernanza ahora usan una superficie blanca legible y desplazamiento cuando falta altura.
- El nombre ficticio de coordinador de Convenios se eliminó. Los totales ya no se redondean a millones ni se presentan como garantía legal de vigencia.
- ASH explica que se cuentan viviendas, no personas ni porcentajes. Agua y saneamiento pueden coincidir; cada cantidad está entre cero y el total. El aviso es inmediato y bloquea el guardado si exceden el total.
- El texto PDF de las tarjetas de actas ahora es un enlace funcional. Las fechas se presentan como fechas, no cadenas ISO.
- Se añadió registro de acuerdos desde el acta seleccionada. Cumplimiento usa un formulario para la referencia documental; la API exige esa referencia y rechaza protocolos distintos de HTTP/HTTPS. Una referencia no acredita autenticidad, disponibilidad ni firmas.

## Flujos de navegador comprobados

| Escenario | Resultado observado |
|---|---|
| GE registra acta sintética con referencia a PDF local | Registro persistido, seleccionado y visible en el repositorio |
| Abrir PDF del acta | Se abrió otra pestaña con la URL del PDF; el servidor de archivos entregó el PDF de prueba |
| GE crea acuerdo desde el acta | Acuerdo En Proceso conservado y vinculado al acta |
| GE registra cumplimiento con referencia | Acuerdo Cumplido, enlace visible y métricas actualizadas |
| GE registra convenio de USD 1330.25 y GTQ 123.45 | Ambas cantidades aceptadas y mostradas exactamente |
| Prórroga con fecha anterior al vencimiento | Error visible; no se guardó |
| Prórroga con fecha posterior | Nueva fecha persistida y visible |
| ASH: total31, agua32, saneamiento39 | Aviso visible y botón deshabilitado |
| ASH: total31, agua20, saneamiento15 | Guardado válido; coberturas64.5% y48.4%; los grupos pueden coincidir |
| JD accede al inicio | Gobernanza, Finanzas y Proyectos como principales; demás áreas en panel Otras áreas |
| JD abre Convenios, ASH y Gobernanza | Lectura disponible; no se muestran registrar/prorrogar/capturar ni registrar acuerdos |

Son pruebas locales con datos sintéticos y navegador de escritorio; no equivalen a una batería E2E automatizada completa, pruebas móviles, campo real, ni validación de todos los roles en producción.

## Flujo documental actual y pendiente

| Documento | Registro actual | Quién registra según el catálogo de permisos |
|---|---|---|
| Acta escaneada | Gerencia consigna datos y enlace de PDF previamente alojado; abre en otra pestaña | GE |
| Evidencia de cumplimiento | Referencia externa asociada al acuerdo | GE |
| Instrumento de convenio/adenda | Enlace externo del documento; prórroga modifica la vigencia registrada | GE |

La aplicación todavía no ofrece carga privada de estos PDF en Cloudflare R2 ni garantiza la conservación de sus enlaces externos. `storage.mfn.gob.gt` era una dirección de ejemplo en los formularios y está consignada en registros de producción; en esta sesión no resolvió por DNS. No se eliminaron esos registros. Se retiraron los ejemplos del formulario para evitar confundirlos con almacenamiento operativo.

Siguiente entrega documental: carga privada R2, autorización de descarga temporal y verificación del archivo conservado. Esa entrega requiere la cuenta/bucket y configuración de Cloudflare. No forma parte del resultado acreditado aquí.

## Navegación

La prioridad organiza accesos ya autorizados, sin sustituir RBAC:

- GE: Proyectos, ARC, Finanzas, Gobernanza.
- JD: Gobernanza, Finanzas, Proyectos.
- DIRADMIN: Finanzas, Convenios, Gobernanza, siempre que su permiso permita consultar.
- DIRPROY: Proyectos, ARC, ASH.
- AUD: Integridad, Finanzas, Gobernanza, Proyectos.
- RRHH y otros roles: Talento humano solo cuando esté autorizado. No se inventaron rutas de autoservicio para roles sin área implementada.

El inicio consulta las fuentes principales del rol y el panel superior Otras áreas contiene los accesos complementarios. Una prueba automatizada verifica que la separación conserva todos los accesos autorizados y no añade otros.

## Comprobaciones técnicas

24 casos de integración HTTP más su suite principal (25 resultados), una prueba de navegación por permisos, chequeo Svelte y compilaciones. Los registros adjuntos contienen únicamente pruebas locales con datos sintéticos. No se aplicaron migraciones ni cambios de esquema.
