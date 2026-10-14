# PDF privados en Cloudflare R2

Estado al 14 de octubre: bucket privado `mancomunidad`, credencial de objetos restringida a ese bucket y CORS configurados. Ida y vuelta real del PDF comprobada; publicación y evidencia de producción se registran en `evidencias/2026-10-14-cloudflare/`. No se migraron documentos históricos.

## Alcance y flujo

1. Una persona con permiso de edición en Gobernanza o Convenios selecciona un PDF de hasta 10 MiB. Con los permisos actuales, Gerencia tiene esa edición; los demás roles conservan sus permisos de consulta. No se amplía el catálogo de permisos.
2. El navegador calcula SHA-256. La API autenticada autoriza una carga temporal por 10 minutos. Los bytes viajan directamente del navegador a R2, evitando el límite de cuerpo de Vercel.
3. La API descarga el objeto temporal, comprueba tamaño, cabecera/cierre PDF y huella; escribe los mismos bytes en una clave final separada. Reutilizar la URL temporal no modifica el objeto final.
4. Al guardar el formulario se vincula una referencia firmada en el campo documental existente. No se guardan URLs de descarga que caduquen ni se necesita una migración SQL.
5. Abrir PDF consulta el registro y los permisos actuales; el servidor emite una URL de lectura por 120 segundos. Quien reciba esa URL puede usarla hasta su vencimiento: no equivale a un visor que impida compartir o descargar.

Cubre `ActaAsamblea.urlPdfEscaneado`, `AcuerdoGobernanza.evidenciaUrl` y `ConvenioInstitucional.urlDocumento`. Los enlaces HTTP históricos se conservan, identificados como externos. Fotos de proyectos, comprobantes financieros y adendas versionadas quedan fuera de esta entrega.

## Preparación de la cuenta

- Habilitar R2 en la cuenta del propietario. El propietario debe completar cualquier aceptación de términos y configuración de pago requerida por Cloudflare.
- Crear un bucket dedicado, por ejemplo `mfn-documentos-privados`, con acceso público y dominio r2.dev deshabilitados. No publicar el bucket ni conectar un dominio público.
- Crear credenciales S3 con lectura/escritura de objetos limitadas a ese bucket. No usar claves globales ni permiso de administración de toda la cuenta.
- Definir CORS para el origen exacto del frontend. `r2-cors.example.json` usa el formato S3 `PutBucketCors`; adaptar la envoltura a la interfaz elegida. Agregar localhost solo para desarrollo y retirarlo al finalizar las pruebas.
- Configurar una regla de ciclo de vida que elimine **solo** `mfn/pendientes/` después de un día. Nunca aplicar esa caducidad a `mfn/documentos/`.

## Variables del backend

Copiar los nombres vacíos de `backend/.env.example` a la configuración privada del alojamiento:

- `R2_ENDPOINT`: endpoint S3 HTTPS oficial de la cuenta.
- `R2_BUCKET`: nombre exacto del bucket privado.
- `R2_ACCESS_KEY_ID` y `R2_SECRET_ACCESS_KEY`: credenciales restringidas.

Nunca definirlas con prefijo `VITE_`, enviarlas al frontend, pegarlas en el chat, subirlas a Git ni incluirlas en capturas. Para desarrollo se pueden agregar al `backend/.env` ya ignorado. El SDK requiere Node 20 o posterior. Se conserva el backend actual en Vercel; no se contrata ni migra Railway por esta integración.

Las referencias persistentes están firmadas con `JWT_SECRET`: conservar esa clave y respaldarla de forma segura. Rotarla invalida también las referencias existentes; antes de hacerlo se necesita un procedimiento de transición de claves. Migrar el bucket requiere actualizar o regenerar las referencias bajo un procedimiento controlado.

## Puesta en producción y comprobaciones

1. Configurar las cuatro variables en el backend y desplegarlo; verificar `/documentos/estado` con sesión autorizada.
2. Desplegar el frontend cuando R2 esté configurado. Mientras tanto, mantener la versión pública anterior para conservar sus formularios.
3. En un entorno de prueba conectado al bucket real, adjuntar un PDF sintético; guardar, recargar y abrir como Gerencia y como un rol autorizado de consulta. Probar denegación para una cuenta sin acceso al módulo.
4. Probar CORS, archivos de más de 4.5 MB, máximo de 10 MiB, URL vencida, interrupción de red y reintento. Las pruebas simuladas no acreditan las firmas S3 de Cloudflare, la facturación, la configuración del bucket ni su disponibilidad.
5. Revisar en R2 que tanto el objeto temporal como el final sean privados y que la regla de ciclo de vida afecte únicamente al prefijo temporal.

## Límites operativos

- Comprobar formato básico y SHA-256 no valida firmas electrónicas, autenticidad institucional, contenido completo del PDF ni ausencia de malware. No es certificación de CGC.
- Si se abandona el formulario después de la carga, puede quedar un objeto final privado sin vínculo. No hay recolección automática de esos objetos para evitar eliminar respaldos válidos; se necesita inventario y limpieza supervisada.
- Los límites de frecuencia en memoria se aplican por proceso, no son una cuota distribuida entre funciones de Vercel. Se necesitan límites/costos de cuenta e infraestructura según el volumen real.
- La validación de bytes consume memoria del backend (hasta 10 MiB por solicitud más buffers) y tiempo de transferencia. Medir carga concurrente antes de ampliar usuarios.
- La clave administrativa de R2 puede modificar objetos; no hay Object Lock ni garantía de inmutabilidad jurídica. Respaldos, retención legal, auditoría institucional y recuperación deben acordarse por separado.

## Configuración aplicada el 14 de octubre de 2026

La conexión local se conserva en `backend/.env.r2.local`, ignorado por Git y con permisos 0600. Para usarla en desarrollo debe cargarse explícitamente además de las variables normales; no se incorpora a los builds. Las cuatro variables R2 se configuraron como sensibles en producción del backend de Vercel. CORS permite el frontend público y `http://127.0.0.1:5178` para pruebas autorizadas. No se habilitó acceso público, dominio r2.dev ni administración de otros buckets.

No se configuró borrado automático de objetos: permanece únicamente la regla predeterminada de abortar cargas multipart incompletas a los siete días. La propuesta de eliminar el prefijo temporal después de un día requiere definir la retención y autorizar esa política antes de activarla.
