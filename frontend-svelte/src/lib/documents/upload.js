export const MAX_PDF_BYTES = 10 * 1024 * 1024;
export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const unit=bytes < 1024*1024 ? 'KiB' : 'MiB';
  const divisor=unit==='KiB' ? 1024 : 1024*1024;
  return `${new Intl.NumberFormat('es-GT',{maximumFractionDigits:2}).format(bytes/divisor)} ${unit}`;
}
export function pdfSelectionError(file) {
  if (!file) return 'Seleccione un documento PDF';
  if (typeof file.name!=='string' || !file.name.trim() || file.name.length>180) return 'Use un nombre de archivo de hasta 180 caracteres';
  if (!/\.pdf$/i.test(file.name) || !['','application/pdf'].includes(file.type)) return 'Este archivo no es un PDF. Seleccione el documento original';
  if (!Number.isSafeInteger(file.size) || file.size<8) return 'El archivo está vacío o incompleto';
  if (file.size>MAX_PDF_BYTES) return `El archivo supera el máximo de 10 MiB (${file.size.toLocaleString('es-GT')} bytes seleccionados). Seleccione una copia más pequeña`;
  return '';
}
export function documentKind(reference) {
  if (!reference) return 'missing';
  if (typeof reference!=='string') return 'invalid';
  if (reference.startsWith('r2://') && reference.length>5) return 'private';
  try {const url=new URL(reference);if(url.protocol==='https:'&&!url.username&&!url.password)return 'external';}catch{}
  return 'invalid';
}
export async function uploadPdf(file,{tipo,api,send,hash,onStage=()=>{}}) {
  const error=pdfSelectionError(file);if(error)throw new Error(error);
  onStage('preparing');
  const sha256=await hash(await file.arrayBuffer());
  const {data:upload}=await api.post('/documentos/preparar',{tipo,nombre:file.name,tipoMime:'application/pdf',bytes:file.size,sha256});
  onStage('uploading');await send(upload.uploadUrl,file);
  onStage('verifying');
  const {data}=await api.post('/documentos/confirmar',{ticket:upload.ticket},{timeout:60000});
  if(typeof data.reference!=='string'||!data.reference.startsWith('r2://'))throw new Error('No se recibió la confirmación del archivo. Vuelva a intentarlo');
  return data;
}
export async function uploadInvoicePhoto(file, api) {
  if (!file || !['image/png','image/jpeg'].includes(file.type) || file.size < 12 || file.size > 5 * 1024 * 1024 ||
      !(/\.png$/i.test(file.name) && file.type === 'image/png' || /\.(jpg|jpeg)$/i.test(file.name) && file.type === 'image/jpeg')) {
    throw new Error('Seleccione una fotografía PNG o JPEG de la factura, hasta 5 MB');
  }
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  const sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2,'0')).join('');
  const { data: upload } = await api.post('/documentos/preparar', { tipo:'factura', nombre:file.name, tipoMime:file.type, bytes:file.size, sha256 });
  const target = new URL(upload.uploadUrl);
  const local = ['localhost','127.0.0.1'].includes(target.hostname) && ['localhost','127.0.0.1'].includes(window.location.hostname);
  if (!(target.protocol === 'https:' && target.hostname.endsWith('.r2.cloudflarestorage.com')) && !(local && target.protocol === 'http:')) throw new Error('La dirección de carga no es válida');
  const sent = await fetch(target.href, { method:'PUT', credentials:'omit', headers:{'Content-Type':file.type}, body:file });
  if (!sent.ok) throw new Error('No se pudo subir la fotografía a R2');
  const { data } = await api.post('/documentos/confirmar', { ticket:upload.ticket }, { timeout:60000 });
  if (typeof data.reference !== 'string' || !data.reference.startsWith('r2://')) throw new Error('No se confirmó el archivo');
  return data.reference;
}
export async function openPrivatePdf({openWindow,authorize}) {
  const tab=openWindow();
  if(!tab)throw new Error('Permita abrir una pestaña para consultar el PDF y vuelva a intentar');
  tab.opener=null;
  try {
    const {data}=await authorize();const url=new URL(data.url);
    if(url.username||url.password||!(url.protocol==='https:'||(url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname))))throw new Error('El enlace del documento no es válido');
    tab.location.replace(url.href);
  }catch(error){tab.close();throw error;}
}
