# Verificación de alcance: CGC, Forma 63-A2 y EXIF

Fecha de revisión: 11 de octubre de 2026. Esta nota distingue una fuente normativa incluida en el repositorio, la descripción institucional del proyecto y el comportamiento comprobable del código. No acredita autorización de la CGC ni sustituye la revisión de normas vigentes y documentos institucionales.

## Fuentes consultadas y límite de vigencia

| Fuente | Lo que permite afirmar | Límite |
|---|---|---|
| `requerimientos/CÓDIGO MUNICIPAL.pdf`, Decreto 12-2002, arts. 49–51, 136–137 | Las mancomunidades son entidades de derecho público con personalidad propia, órganos de gobierno y estatutos; estos deben definir cuotas y mecanismos de control. La CGC fiscaliza los recursos municipales. | La copia tiene metadatos de 2017. No se pudo contrastar en línea su texto vigente ni determinar por estos artículos, por sí solos, el procedimiento de autorización de una Forma 63-A2 o un libro específico de la mancomunidad. |
| `capítulos/PG Cap IV y V - revisado.txt`, apartados del diagnóstico y descripción técnica | El trabajo identifica recibos físicos Serie AG/Forma 63-A2, libros de hojas movibles autorizados y evidencias con metadatos como parte del contexto y de los requisitos. También aclara que la versión descrita no extrae EXIF. | Es documentación del proyecto, no una resolución o certificación de la CGC. |
| Código de `backend/src/` y `frontend-svelte/src/` | Permite comprobar las funciones y permisos que ejecuta la aplicación. | No acredita cumplimiento legal ni la configuración de cuentas y despliegue en producción. |

Se intentó consultar `www.contraloria.gob.gt` y `portal.sat.gob.gt` desde este entorno, incluso con ejecución de red ampliada. El proxy respondió **HTTP 403 CONNECT**. Por tanto, la vigencia y el trámite actual de CGC/SAT siguen sin verificación externa; no se deben presentar como confirmados.

## Resultado por requisito

| Requisito | Comprobado en el sistema | Pendiente para afirmar cumplimiento |
|---|---|---|
| Forma 63-A2 | Se guardan tipo y número del comprobante en cada transacción. La cuota puede registrarse como `Recibo CGC 63-A2`. | Confirmar con la CGC el régimen aplicable a esta mancomunidad y obtener autorización/serie y documento real; definir responsable, correlativo y cotejo con recibo físico. El sistema no emite una Forma oficial. |
| Libro y actas | Se guarda `libroCGCFolio` y puede enlazarse un PDF escaneado. | Obtener libro autorizado y verificar folio, firmas y facultades del firmante. Un texto ingresado no prueba autorización de la CGC. |
| Evidencia EXIF | Se conservan PNG/JPEG, se calcula SHA-256 del archivo y se admiten coordenadas del cliente. | Implementar extracción y comprobación de EXIF, política para fotos sin metadatos o con datos discordantes y evidencia de pruebas reales. El GPS del navegador y el hash no validan la ubicación o fecha de toma. |

## Permisos de la aplicación

Los permisos provienen del rol almacenado en la base y se vuelven a comprobar en cada petición (`backend/src/middleware/auth.js`). Las operaciones de escritura requieren `editar` en el módulo correspondiente:

| Operación | Ruta | Roles con `editar` según `backend/src/lib/roles.js` |
|---|---|---|
| Registrar transacción/recibo consignado | `POST /api/v1/financiero/transacciones` | GE, DIRADMIN |
| Registrar acta/folio y cambiar acuerdos | `POST /api/v1/gobernanza/actas`, `PUT /api/v1/gobernanza/acuerdos/:id` | GE |
| Crear proyecto y subir evidencia | `POST /api/v1/proyectos`, `POST /api/v1/proyectos/:id/evidencias` | GE, DIRPROY |

AUD tiene lectura de estos módulos y facultad de aprobar únicamente el punto de control de inteligencia; la aplicación no contiene un rol de aprobación externa de la CGC. La interfaz ahora oculta las acciones de escritura a roles sin `editar`, pero la barrera efectiva es la API. Esta matriz técnica debe compararse con estatutos, nombramientos y delegaciones vigentes de la mancomunidad antes de tratarla como autorización institucional.

## Documentos necesarios para cerrar la verificación normativa

1. Estatutos vigentes y acuerdos de Asamblea sobre cuotas, responsables y mecanismos de control.
2. Constancia o instrucción vigente de la CGC para el uso de Forma 63-A2 por la mancomunidad, con serie, folios y procedimiento de emisión o digitalización.
3. Autorización del libro de actas aplicable, hojas/folios y reglas de firma y archivo.
4. Política institucional de evidencias fotográficas: quién captura, quién revisa, tratamiento de EXIF y acceso a coordenadas exactas.

## Alcance territorial y SvelteKit

La contribución propuesta combina trazabilidad documental ante la CGC con captura y consulta desde comunidades alejadas. SvelteKit es la tecnología de la interfaz, pero no demuestra por sí mismo cobertura de red ni trabajo sin conexión. El frontend actual usa `adapter-static` con fallback SPA, solicita datos a la API remota y guarda únicamente la sesión en `localStorage`. No hay service worker, caché de datos de campo, cola local ni sincronización diferida. La documentación revisada del capítulo IV y V también describe esas capacidades como pendientes.

Para validar la contribución territorial se necesitan pruebas de campo por municipio y comunidad: dispositivo y navegador, tipo/intensidad de conexión, éxito de ingreso y consulta, tiempo y tamaño de carga, envío de fotografía, tasa de fallos y recuperación tras interrupción. Si se requiere captura sin señal, debe implementarse almacenamiento local cifrado según sensibilidad, cola con identificadores idempotentes, resolución de conflictos, reintentos y confirmación visible de sincronización. Hasta entonces, la afirmación verificable es acceso web remoto **cuando existe conectividad**.
