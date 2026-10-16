-- Ejecutar una vez en Neon antes de desplegar el backend que usa estos índices.
CREATE INDEX IF NOT EXISTS "Proyecto_createdAt_id_idx" ON "Proyecto"("createdAt", "id");
CREATE INDEX IF NOT EXISTS "TareaARC_estado_fechaLimite_idx" ON "TareaARC"("estado", "fechaLimite");
CREATE INDEX IF NOT EXISTS "TransaccionFinanciera_cuentaBancaria_tipo_idx" ON "TransaccionFinanciera"("cuentaBancaria", "tipo");
CREATE INDEX IF NOT EXISTS "TransaccionFinanciera_fecha_id_idx" ON "TransaccionFinanciera"("fecha", "id");
CREATE INDEX IF NOT EXISTS "CensoComunitarioASH_municipio_fechaLevantamiento_idx" ON "CensoComunitarioASH"("municipio", "fechaLevantamiento");
CREATE INDEX IF NOT EXISTS "PublicacionTransparencia_visibilidad_tipo_fechaPublicacion_idx" ON "PublicacionTransparencia"("visibilidad", "tipo", "fechaPublicacion");
