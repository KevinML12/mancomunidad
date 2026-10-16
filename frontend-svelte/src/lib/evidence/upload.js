import { sha256Base64 } from '../offline-field.js';

export async function uploadEvidence(projectId, payload, { api, send = async (url, blob, mime) => {
  const response = await fetch(url, { method: 'PUT', headers: { 'Content-Type': mime }, body: blob });
  if (!response.ok) throw new Error('No se pudo subir la fotografía. Reintente cuando tenga conexión.');
} } = {}) {
  const { archivoBase64, tipoMime, ...metadata } = payload;
  if (typeof archivoBase64 !== 'string' || !['image/png', 'image/jpeg'].includes(tipoMime)) throw new Error('Seleccione una fotografía PNG o JPEG');
  const bytes = Uint8Array.from(atob(archivoBase64), char => char.charCodeAt(0));
  if (bytes.length < 12 || bytes.length > 5 * 1024 * 1024) throw new Error('La fotografía supera el límite de 5 MiB o está incompleta');
  const sha256 = await sha256Base64(archivoBase64);
  const base = `/proyectos/${projectId}/evidencias`;
  const { data: prepared } = await api.post(`${base}/preparar`, { tipoMime, bytes: bytes.length, sha256 });
  if (prepared.existing) return prepared.existing;
  if (!prepared.uploadUrl || !prepared.ticket) throw new Error('No se recibió una autorización de carga válida');
  await send(prepared.uploadUrl, new Blob([bytes], { type: tipoMime }), tipoMime);
  const { data: confirmed } = await api.post(`${base}/confirmar`, { ticket: prepared.ticket, ...metadata }, { timeout: 60000 });
  if (confirmed.sha256 !== sha256 || !confirmed.id) throw new Error('No se confirmó la fotografía. Reintente la sincronización.');
  return confirmed;
}
