# Cloudflare R2 real y publicación — 14 de octubre de 2026

## Resultado

Backend y frontend publicados READY desde el commit indicado en `despliegues.json`, en las URLs conservadas. La conexión real de R2 usa el bucket privado `mancomunidad`; el acceso público y r2.dev siguen deshabilitados. El propietario autorizó expresamente la credencial limitada a objetos de ese bucket, las variables privadas del backend en Vercel, el archivo local ignorado y CORS para MFN y localhost.

No se modificó el esquema Neon ni se crearon registros de negocio ficticios en producción. Permanecen PDF sintéticos de prueba en almacenamiento privado, incluidos objetos temporales y finales; no se aplicó eliminación permanente sin autorización.

## Evidencia real

- S3: subida y recuperación del PDF sintético de 615 bytes con igualdad exacta. Lectura firmada HTTP200; petición sin firma rechazada (HTTP400). `r2-real.json` conserva huella y estados, sin claves ni enlaces temporales.
- Navegador local con R2 real: Gerencia de prueba adjuntó PDF, guardó un acta solo en SQLite local y abrió el PDF en el visor de otra pestaña. `pdf-real-r2.jpg` muestra el documento sintético, no un acta oficial.
- Backend público: login GE/JD HTTP200, almacenamiento configurado HTTP200, preparación y confirmación HTTP200, carga directa a R2 HTTP200. Archivo de **5,243,497 bytes**, superior al límite de cuerpo de Vercel, verificado contra su objeto final por SHA-256. Junta Directiva sin permiso de carga recibió HTTP403; apertura sin sesión recibió HTTP401.
- CORS real: preflight desde frontend y localhost HTTP204 con el origen esperado; origen ajeno HTTP403 sin autorización CORS. La primera edición del panel había conservado el ejemplo predeterminado; se corrigió y se verificó la política guardada y la respuesta HTTP real.
- API con Neon: lectura de actas HTTP200; control de integridad HTTP200, `COINCIDE CON PUNTO DE CONTROL`, sin discrepancias.
- Interfaz publicada: login Gerencia, apertura de Gobernanza, selector PDF habilitado, carga del archivo de más de 5 MB y mensaje de comprobación completada. Se canceló y recargó el formulario, sin guardar un acta ficticia. `carga-publicada-r2.jpg` muestra ese resultado.

## Validación del código

La entrega de código tiene 26 resultados de integración aprobados (25 subpruebas más su prueba padre), chequeo Svelte sin errores ni advertencias y compilaciones correctas. Esos resultados corresponden al mismo runtime que se publicó; después se añadieron configuración privada y evidencia, sin cambios funcionales adicionales. Ambos builds de Vercel terminaron READY. Se restauró el cliente Prisma PostgreSQL local mediante el build del backend.

La auditoría de dependencias de producción reportó cero vulnerabilidades; permanecen tres avisos altos de herramientas de desarrollo nodemon/chokidar/braces, documentados en la entrega anterior. No se aplicó `audit --force`.

## Alcance y pendientes

- Actas, respaldos de acuerdos y convenios tienen carga privada PDF de hasta 10 MiB. Quien tenga edición puede adjuntar; quien tenga consulta del módulo puede pedir la apertura temporal. No se ampliaron roles.
- Los enlaces externos anteriores permanecen como estaban: **no se migraron ni se comprobó que sus dominios o archivos existan**. Deben sustituirse por los PDF originales cuando estén disponibles; esta entrega no fabrica esos documentos.
- La vinculación, recarga y apertura se comprobaron con base local y R2 real; la carga del sitio publicado se comprobó sin dar de alta un registro de negocio. Falta aceptación con un expediente institucional real autorizado.
- No incluye fotos de proyectos, comprobantes financieros, adendas versionadas, validación de firmas, antimalware ni certificación CGC.
- No se configuró eliminación automática del prefijo temporal; solo permanece la regla predeterminada de abortar multipart incompletos a los siete días. Definir retención y limpieza supervisada de objetos huérfanos y de prueba.
- Respaldos, recuperación, rotación controlada de claves y concurrencia sostenida necesitan pruebas operativas adicionales.
