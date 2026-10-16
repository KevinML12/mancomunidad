ALTER TABLE "TareaARC" ADD COLUMN "responsableId" INTEGER REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "TareaARC_responsableId_idx" ON "TareaARC"("responsableId");
