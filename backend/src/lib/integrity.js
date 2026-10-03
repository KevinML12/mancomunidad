import crypto from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
export const auditContext = new AsyncLocalStorage();
export const BUSINESS_MODELS = ['proyecto', 'evidenciaProyecto', 'tareaARC', 'transaccionFinanciera', 'actaAsamblea', 'acuerdoGobernanza', 'convenioInstitucional', 'censoComunitarioASH', 'publicacionTransparencia'];
function canonical(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
export const hash = value => crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
export const tokenHash = value => crypto.createHash('sha256').update(value).digest('hex');
export async function integritySnapshot(tx) {
  const snapshot = {}; const bloques = {};
  for (const model of BUSINESS_MODELS) {
    const rows = await tx[model].findMany({ orderBy: { id: 'asc' } });
    for (const row of rows) snapshot[`${model}:${row.id}`] = hash(row);
    bloques[model] = { count: rows.length, hashSha256: hash(rows) };
  }
  return { snapshot, bloques, rootHash: hash(snapshot) };
}
export async function verifyIntegrity(tx) {
  const current = await integritySnapshot(tx);
  const checkpoint = await tx.puntoControlIntegridad.findFirst({ orderBy: { id: 'desc' } });
  if (!checkpoint) return { ...current, checkpoint: null, discrepancias: [], estadoIntegridad: 'SIN PUNTO DE CONTROL' };
  const expected = { ...checkpoint.snapshot }; const discrepancies = new Set();
  if (hash(checkpoint.snapshot) !== checkpoint.rootHash) discrepancies.add('puntoControl');
  const events = await tx.bitacoraAuditoria.findMany({ where: { id: { gt: checkpoint.auditoriaId }, entidad: { in: BUSINESS_MODELS } }, orderBy: { id: 'asc' } });
  for (const event of events) {
    const key = `${event.entidad}:${event.entidadId}`;
    if ((expected[key] ?? null) !== event.antesHash) discrepancies.add(key);
    if (event.despuesHash === null) delete expected[key]; else expected[key] = event.despuesHash;
  }
  for (const key of new Set([...Object.keys(expected), ...Object.keys(current.snapshot)])) if (expected[key] !== current.snapshot[key]) discrepancies.add(key);
  return { ...current, checkpoint, discrepancias: [...discrepancies], estadoIntegridad: discrepancies.size ? 'ALERTA / DISCREPANCIA DETECTADA' : current.rootHash === checkpoint.rootHash ? 'COINCIDE CON PUNTO DE CONTROL' : 'CAMBIOS CON TRAZABILIDAD VERIFICADA' };
}
