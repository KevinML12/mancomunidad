CREATE INDEX "Proyecto_createdAt_id_idx" ON "Proyecto"("createdAt", "id");
CREATE INDEX "TareaARC_estado_fechaLimite_idx" ON "TareaARC"("estado", "fechaLimite");
CREATE INDEX "TransaccionFinanciera_cuentaBancaria_tipo_idx" ON "TransaccionFinanciera"("cuentaBancaria", "tipo");
CREATE INDEX "TransaccionFinanciera_fecha_id_idx" ON "TransaccionFinanciera"("fecha", "id");
CREATE INDEX "CensoComunitarioASH_municipio_fechaLevantamiento_idx" ON "CensoComunitarioASH"("municipio", "fechaLevantamiento");
CREATE INDEX "PublicacionTransparencia_visibilidad_tipo_fechaPublicacion_idx" ON "PublicacionTransparencia"("visibilidad", "tipo", "fechaPublicacion");
