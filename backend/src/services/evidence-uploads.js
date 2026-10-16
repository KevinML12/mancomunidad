import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import prisma from '../lib/prisma.js';
import { storage } from './documents.js';
import { mediaKey } from './media.js';
import { ValidationError } from './errors.js';
import { createEvidenceRecord, evidenceMetadata, findEvidenceByHash } from './projects.js';

const MAX_BYTES = 5 * 1024 * 1024;
const extensions = { 'image/png': 'png', 'image/jpeg': 'jpg' };

function validateDetails(projectId, body) {
  const id = Number(projectId);
  if (!Number.isSafeInteger(id) || id < 1) throw new ValidationError('Proyecto inválido');
  if (!Object.hasOwn(extensions, body.tipoMime) || !Number.isSafeInteger(body.bytes) || body.bytes < 12 || body.bytes > MAX_BYTES || typeof body.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(body.sha256)) {
    throw new ValidationError('Seleccione una fotografía PNG o JPEG válida de hasta 5 MiB');
  }
  return id;
}

function claimFromTicket(ticket, projectId, userId) {
  let claim;
  try { claim = jwt.verify(ticket, process.env.JWT_SECRET, { algorithms: ['HS256'] }); }
  catch { throw new ValidationError('La autorización de carga es inválida o venció'); }
  if (claim.type !== 'evidence_upload' || claim.projectId !== projectId || claim.sub !== userId || claim.bucket !== process.env.R2_BUCKET || !/^[a-f0-9-]{36}$/.test(claim.uploadId)) throw new ValidationError('La autorización de carga no corresponde al proyecto o a la cuenta');
  validateDetails(projectId, claim);
  return claim;
}

function stageKey(claim) { return `mfn/pendientes/evidencias/${claim.uploadId}.${extensions[claim.tipoMime]}`; }
function reference(claim) { return `r2media://evidencias/${claim.uploadId}.${extensions[claim.tipoMime]}`; }

export async function prepareEvidenceUpload(projectId, userId, body) {
  const id = validateDetails(projectId, body);
  if (!(await prisma.proyecto.findUnique({ where: { id }, select: { id: true } }))) throw new ValidationError('Proyecto no encontrado');
  const existing = await findEvidenceByHash(id, body.sha256);
  if (existing) return { existing };
  const claim = { type: 'evidence_upload', projectId: id, sub: userId, bucket: process.env.R2_BUCKET, uploadId: crypto.randomUUID(), bytes: body.bytes, tipoMime: body.tipoMime, sha256: body.sha256 };
  const ticket = jwt.sign(claim, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '10m' });
  const uploadUrl = await getSignedUrl(storage(), new PutObjectCommand({ Bucket: claim.bucket, Key: stageKey(claim), ContentType: claim.tipoMime, ContentLength: claim.bytes }), { expiresIn: 600 });
  return { ticket, uploadUrl, expiresIn: 600 };
}

export async function confirmEvidenceUpload(projectId, userId, body) {
  const id = Number(projectId);
  const claim = claimFromTicket(body.ticket, id, userId);
  const metadata = evidenceMetadata(body);
  const client = storage();
  const existing = await findEvidenceByHash(id, claim.sha256);
  if (existing) {
    try { await client.send(new DeleteObjectCommand({ Bucket: claim.bucket, Key: stageKey(claim) })); }
    catch (error) { console.warn('No se pudo limpiar la carga temporal duplicada', error.name); }
    return existing;
  }
  if (!(await prisma.proyecto.findUnique({ where: { id }, select: { id: true } }))) throw new ValidationError('Proyecto no encontrado');
  let head;
  try { head = await client.send(new HeadObjectCommand({ Bucket: claim.bucket, Key: stageKey(claim) })); }
  catch (error) {
    if (error.$metadata?.httpStatusCode === 404 || ['NotFound', 'NoSuchKey'].includes(error.name)) throw new ValidationError('La fotografía aún no se ha subido. Reintente la carga');
    throw error;
  }
  if (head.ContentLength !== claim.bytes || head.ContentType !== claim.tipoMime) throw new ValidationError('La fotografía no terminó de subirse o cambió de tipo');
  const object = await client.send(new GetObjectCommand({ Bucket: claim.bucket, Key: stageKey(claim), IfMatch: head.ETag }));
  const chunks = []; let size = 0;
  for await (const chunk of object.Body) {
    size += chunk.length;
    if (size > MAX_BYTES || size > claim.bytes) { object.Body.destroy?.(); throw new ValidationError('La fotografía supera el tamaño autorizado'); }
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  const png = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = buffer[0] === 255 && buffer[1] === 216 && buffer.at(-2) === 255 && buffer.at(-1) === 217;
  if (buffer.length !== claim.bytes || !((claim.tipoMime === 'image/png' && png) || (claim.tipoMime === 'image/jpeg' && jpeg)) || crypto.createHash('sha256').update(buffer).digest('hex') !== claim.sha256) throw new ValidationError('La fotografía no coincide con el archivo seleccionado');
  const media = { reference: reference(claim), sha256: claim.sha256, mime: claim.tipoMime };
  await client.send(new PutObjectCommand({ Bucket: claim.bucket, Key: mediaKey(media.reference), Body: buffer, ContentType: claim.tipoMime, ContentLength: buffer.length, Metadata: { sha256: claim.sha256, bytes: String(buffer.length) } }));
  const saved = await createEvidenceRecord(id, userId, media, metadata);
  const persisted = await prisma.evidenciaProyecto.findUnique({ where: { id: saved.id }, select: { urlArchivo: true } });
  if (persisted?.urlArchivo !== media.reference) {
    try { await client.send(new DeleteObjectCommand({ Bucket: claim.bucket, Key: mediaKey(media.reference) })); }
    catch (error) { console.warn('No se pudo limpiar la evidencia duplicada', error.name); }
  }
  try { await client.send(new DeleteObjectCommand({ Bucket: claim.bucket, Key: stageKey(claim) })); }
  catch (error) { console.warn('No se pudo limpiar la carga temporal de evidencia', error.name); }
  return saved;
}
