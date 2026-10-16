import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import prisma from '../lib/prisma.js';
import { storage, DocumentServiceError } from './documents.js';
import { mediaKey } from './media.js';
import { evidenceDetails, recordProjectEvidence } from './projects.js';
import { ValidationError } from './errors.js';

const MAX_BYTES = 5 * 1024 * 1024;
const EXTENSIONS = { 'image/png': 'png', 'image/jpeg': 'jpg' };

function claimFromTicket(ticket) {
  try {
    const claim = jwt.verify(ticket, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (claim.type !== 'evidence_upload' || !Number.isSafeInteger(claim.sub) || !Number.isSafeInteger(claim.projectId) ||
        claim.projectId < 1 || !Object.hasOwn(EXTENSIONS, claim.mime) || !Number.isSafeInteger(claim.bytes) ||
        claim.bytes < 12 || claim.bytes > MAX_BYTES || !/^[a-f0-9]{64}$/.test(claim.sha256) ||
        !/^[a-f0-9-]{36}$/.test(claim.uploadId) || claim.bucket !== process.env.R2_BUCKET) throw new Error();
    return claim;
  } catch { throw new ValidationError('La autorización de la fotografía es inválida o venció'); }
}

const stagingKey = claim => `mfn/pendientes/evidencias/${claim.uploadId}.${EXTENSIONS[claim.mime]}`;
const reference = claim => `r2media://evidencias/${claim.uploadId}.${EXTENSIONS[claim.mime]}`;

async function headIfPresent(client, key, bucket) {
  try { return await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key })); }
  catch (error) {
    if (error.$metadata?.httpStatusCode === 404 || ['NotFound', 'NoSuchKey'].includes(error.name)) return null;
    throw error;
  }
}

function validImage(buffer, mime) {
  if (mime === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return buffer[0] === 255 && buffer[1] === 216 && buffer.at(-2) === 255 && buffer.at(-1) === 217;
}

export async function prepareEvidenceUpload(userId, projectId, body = {}) {
  if (!Number.isSafeInteger(projectId) || projectId < 1) throw new ValidationError('Proyecto inválido');
  if (!(await prisma.proyecto.findUnique({ where: { id: projectId }, select: { id: true } }))) throw new DocumentServiceError('Proyecto no encontrado', 404);
  const { tipoMime, bytes, sha256 } = body;
  if (!Object.hasOwn(EXTENSIONS, tipoMime) || !Number.isSafeInteger(bytes) || bytes < 12 || bytes > MAX_BYTES ||
      typeof sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(sha256)) throw new ValidationError('Seleccione una fotografía PNG o JPEG de hasta 5 MB');
  const client = storage();
  const claim = { type: 'evidence_upload', sub: userId, projectId, mime: tipoMime, bytes, sha256, uploadId: crypto.randomUUID(), bucket: process.env.R2_BUCKET };
  const ticket = jwt.sign(claim, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '10m' });
  const uploadUrl = await getSignedUrl(client, new PutObjectCommand({ Bucket: claim.bucket, Key: stagingKey(claim), ContentType: tipoMime, ContentLength: bytes }), { expiresIn: 600 });
  return { ticket, uploadUrl, expiresIn: 600 };
}

export async function finishEvidenceUpload(userId, projectId, ticket, body = {}) {
  const claim = claimFromTicket(ticket);
  if (claim.sub !== userId || claim.projectId !== projectId) throw new DocumentServiceError('Este envío pertenece a otra cuenta o proyecto', 403);
  evidenceDetails(body);
  if (!(await prisma.proyecto.findUnique({ where: { id: projectId }, select: { id: true } }))) throw new DocumentServiceError('Proyecto no encontrado', 404);
  const client = storage();
  const target = reference(claim);
  const finalKey = mediaKey(target);
  const final = await headIfPresent(client, finalKey, claim.bucket);
  if (!final || final.Metadata?.sha256 !== claim.sha256 || final.ContentLength !== claim.bytes || final.ContentType !== claim.mime) {
    const head = await headIfPresent(client, stagingKey(claim), claim.bucket);
    if (!head || head.ContentLength !== claim.bytes || head.ContentType !== claim.mime) throw new ValidationError('La fotografía no terminó de subir o su tamaño no coincide');
    const object = await client.send(new GetObjectCommand({ Bucket: claim.bucket, Key: stagingKey(claim), IfMatch: head.ETag }));
    const chunks = []; let size = 0;
    for await (const chunk of object.Body) {
      size += chunk.length;
      if (size > MAX_BYTES || size > claim.bytes) { object.Body.destroy?.(); throw new ValidationError('La fotografía supera el tamaño autorizado'); }
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    if (buffer.length !== claim.bytes || !validImage(buffer, claim.mime) || crypto.createHash('sha256').update(buffer).digest('hex') !== claim.sha256) {
      throw new ValidationError('La fotografía no coincide con el archivo seleccionado');
    }
    await client.send(new PutObjectCommand({ Bucket: claim.bucket, Key: finalKey, Body: buffer, ContentType: claim.mime, ContentLength: buffer.length, Metadata: { sha256: claim.sha256, bytes: String(buffer.length) } }));
  }
  return recordProjectEvidence(projectId, userId, { reference: target, sha256: claim.sha256, mime: claim.mime }, body);
}
