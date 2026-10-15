import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ValidationError } from './errors.js';
import { numeric, text, url } from './validation.js';

export const DOCUMENT_TYPES = {
  acta:{module:'gobernanza',model:'actaAsamblea',field:'urlPdfEscaneado'},
  acuerdo:{module:'gobernanza',model:'acuerdoGobernanza',field:'evidenciaUrl'},
  convenio:{module:'convenios',model:'convenioInstitucional',field:'urlDocumento'}
};
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const REFERENCE_PREFIX = 'r2://';
export class DocumentServiceError extends Error {
  constructor(message,status=503) { super(message); this.status=status; }
}
export function storageConfigured() {
  return ['R2_ENDPOINT','R2_BUCKET','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY'].every(key=>Boolean(process.env[key]));
}
export function storage() {
  if (!storageConfigured()) throw new DocumentServiceError('El almacenamiento privado aún no está configurado. Conserve su archivo y contacte a la administración');
  const endpoint=new URL(process.env.R2_ENDPOINT);
  const localTest=process.env.NODE_ENV==='test' && endpoint.hostname==='127.0.0.1';
  if (!localTest && (endpoint.protocol!=='https:' || !endpoint.hostname.endsWith('.r2.cloudflarestorage.com') || endpoint.pathname!=='/' || endpoint.search || endpoint.username || endpoint.password)) throw new DocumentServiceError('La conexión de almacenamiento requiere revisión de la administración');
  return new S3Client({region:'auto',endpoint:endpoint.href,forcePathStyle:true,
    requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED',
    credentials:{accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY},
    requestHandler:{connectionTimeout:5000,requestTimeout:20000},maxAttempts:2});
}
export function documentScope(tipo) {
  const scope=Object.hasOwn(DOCUMENT_TYPES,tipo) ? DOCUMENT_TYPES[tipo] : undefined;
  if (!scope) throw new ValidationError('Tipo de documento no admitido');
  return scope;
}
function verifyToken(token,type) {
  try {
    const payload=jwt.verify(token,process.env.JWT_SECRET,{algorithms:['HS256']});
    if (payload.type!==type || !Object.hasOwn(DOCUMENT_TYPES,payload.tipo) || !Number.isInteger(payload.sub) || !/^[a-f0-9]{64}$/.test(payload.sha256) || !Number.isInteger(payload.bytes) || payload.bytes < 8 || payload.bytes > MAX_DOCUMENT_BYTES || payload.bucket!==process.env.R2_BUCKET || !/^[a-f0-9-]{36}$/.test(payload.uploadId)) throw new Error();
    return payload;
  } catch { throw new ValidationError('La autorización del archivo es inválida o venció. Seleccione el PDF nuevamente'); }
}
const finalKey = claim => `mfn/documentos/${claim.tipo}/${claim.uploadId}.pdf`;
const stagingKey = claim => `mfn/pendientes/${claim.tipo}/${claim.uploadId}.pdf`;
function reference(claim) {
  return REFERENCE_PREFIX+jwt.sign({type:'document_reference',sub:claim.sub,tipo:claim.tipo,bucket:claim.bucket,uploadId:claim.uploadId,sha256:claim.sha256,bytes:claim.bytes,nombre:claim.nombre,iat:claim.iat},process.env.JWT_SECRET,{algorithm:'HS256'});
}
export async function prepareDocument(userId,body) {
  documentScope(body.tipo);
  const bytes=numeric(body.bytes,'Tamaño del archivo',{min:8,max:MAX_DOCUMENT_BYTES,integer:true});
  const nombre=text(body.nombre,'Nombre del archivo',{max:180});
  if (!nombre.toLowerCase().endsWith('.pdf') || body.tipoMime!=='application/pdf' || typeof body.sha256!=='string' || !/^[a-f0-9]{64}$/.test(body.sha256)) throw new ValidationError('Seleccione un PDF de hasta 10 MB');
  const client=storage();
  const claim={type:'document_upload',sub:userId,tipo:body.tipo,bucket:process.env.R2_BUCKET,uploadId:crypto.randomUUID(),sha256:body.sha256,bytes,nombre,iat:Math.floor(Date.now()/1000)};
  const ticket=jwt.sign(claim,process.env.JWT_SECRET,{algorithm:'HS256',expiresIn:'10m'});
  const uploadUrl=await getSignedUrl(client,new PutObjectCommand({Bucket:claim.bucket,Key:stagingKey(claim),ContentType:'application/pdf',ContentLength:bytes}),{expiresIn:600});
  return {ticket,uploadUrl,expiresIn:600};
}
async function headIfPresent(client,key) {
  try { return await client.send(new HeadObjectCommand({Bucket:process.env.R2_BUCKET,Key:key})); }
  catch(error) { if (error.$metadata?.httpStatusCode===404 || ['NotFound','NoSuchKey'].includes(error.name)) return null; throw error; }
}
export async function finishDocument(userId,ticket) {
  const claim=verifyToken(ticket,'document_upload');
  if (claim.sub!==userId) throw new DocumentServiceError('Este envío pertenece a otra cuenta',403);
  const client=storage();
  const already=await headIfPresent(client,finalKey(claim));
  if (already && already.Metadata?.sha256===claim.sha256 && already.ContentLength===claim.bytes) return {reference:reference(claim),nombre:claim.nombre,sha256:claim.sha256,bytes:claim.bytes};
  const head=await headIfPresent(client,stagingKey(claim));
  if (!head || head.ContentLength!==claim.bytes || head.ContentType!=='application/pdf') throw new ValidationError('El PDF no terminó de subir o su tamaño no coincide. Reintente');
  const object=await client.send(new GetObjectCommand({Bucket:claim.bucket,Key:stagingKey(claim),IfMatch:head.ETag}));
  const chunks=[];let size=0;
  for await (const chunk of object.Body) {
    size+=chunk.length;
    if (size>MAX_DOCUMENT_BYTES || size>claim.bytes) { object.Body.destroy?.(); throw new ValidationError('El archivo supera el tamaño autorizado'); }
    chunks.push(chunk);
  }
  const buffer=Buffer.concat(chunks);
  if (buffer.length!==claim.bytes || !buffer.subarray(0,8).toString('ascii').startsWith('%PDF-') || !/%%EOF\s*$/.test(buffer.subarray(-1024).toString('latin1')) || crypto.createHash('sha256').update(buffer).digest('hex')!==claim.sha256) throw new ValidationError('El contenido del PDF no coincide con el archivo seleccionado');
  // A separate final object preserves the verified bytes even if the temporary PUT URL is replayed.
  await client.send(new PutObjectCommand({Bucket:claim.bucket,Key:finalKey(claim),Body:buffer,ContentType:'application/pdf',Metadata:{sha256:claim.sha256,bytes:String(claim.bytes)},ContentDisposition:'attachment'}));
  return {reference:reference(claim),nombre:claim.nombre,sha256:claim.sha256,bytes:claim.bytes};
}
export async function documentReference(value,tipo,userId,{existing}={}) {
  if (typeof value!=='string' || !value.startsWith(REFERENCE_PREFIX)) return url(value,'Documento');
  const claim=verifyToken(value.slice(REFERENCE_PREFIX.length),'document_reference');
  if (claim.tipo!==tipo || (claim.sub!==userId && value!==existing)) throw new ValidationError('El PDF no corresponde a este tipo de registro o a su carga');
  const stored=await headIfPresent(storage(),finalKey(claim));
  if (!stored || stored.Metadata?.sha256!==claim.sha256 || stored.ContentLength!==claim.bytes) throw new ValidationError('No se encontró el PDF verificado. Selecciónelo nuevamente');
  return value;
}
export async function openDocument(value,tipo) {
  if (!value?.startsWith(REFERENCE_PREFIX)) return {url:url(value,'Documento',false),externo:true};
  const claim=verifyToken(value.slice(REFERENCE_PREFIX.length),'document_reference');
  if (claim.tipo!==tipo) throw new ValidationError('El PDF no corresponde al registro');
  const client=storage();const head=await headIfPresent(client,finalKey(claim));
  if (!head || head.Metadata?.sha256!==claim.sha256 || head.ContentLength!==claim.bytes) throw new DocumentServiceError('El archivo no está disponible o requiere revisión',409);
  const safeName=claim.nombre.replace(/[^a-zA-Z0-9._-]/g,'_');
  const downloadUrl=await getSignedUrl(client,new GetObjectCommand({Bucket:claim.bucket,Key:finalKey(claim),ResponseContentType:'application/pdf',ResponseContentDisposition:`inline; filename="${safeName}"`}),{expiresIn:120});
  return {url:downloadUrl,nombre:claim.nombre,sha256:claim.sha256,bytes:claim.bytes,expiresIn:120,externo:false};
}
