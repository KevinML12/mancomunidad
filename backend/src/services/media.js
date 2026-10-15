import crypto from 'node:crypto';
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { storage } from './documents.js';
import { ValidationError } from './errors.js';

const TYPES = {
  'image/png': { extension: 'png', max: 5 * 1024 * 1024, valid: buffer => buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  'image/jpeg': { extension: 'jpg', max: 5 * 1024 * 1024, valid: buffer => buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255 },
  'image/webp': { extension: 'webp', max: 5 * 1024 * 1024, valid: buffer => buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' },
  'application/pdf': { extension: 'pdf', max: 10 * 1024 * 1024, valid: buffer => buffer.toString('ascii', 0, 5) === '%PDF-' && /%%EOF\s*$/.test(buffer.subarray(-1024).toString('latin1')) },
};

export function mediaKey(reference) {
  if (typeof reference !== 'string' || !/^r2media:\/\/(publicaciones|evidencias)\/[a-f0-9-]{36}\.(png|jpg|webp|pdf)$/.test(reference)) throw new ValidationError('Referencia de archivo inválida');
  return `mfn/${reference.slice('r2media://'.length)}`;
}

export function mediaMime(reference) {
  const extension = mediaKey(reference).split('.').at(-1);
  return Object.entries(TYPES).find(([, value]) => value.extension === extension)?.[0];
}

export async function saveMedia(buffer, mime, area) {
  if (!['publicaciones', 'evidencias'].includes(area) || (area === 'evidencias' && mime === 'application/pdf')) throw new ValidationError('Tipo de archivo no admitido');
  const type = TYPES[mime];
  if (!type || !Buffer.isBuffer(buffer) || buffer.length < 12 || buffer.length > type.max || !type.valid(buffer)) throw new ValidationError('Archivo inválido o demasiado grande');
  const reference = `r2media://${area}/${crypto.randomUUID()}.${type.extension}`;
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  await storage().send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: mediaKey(reference),
    Body: buffer,
    ContentType: mime,
    ContentLength: buffer.length,
    Metadata: { sha256, bytes: String(buffer.length) },
  }));
  return { reference, sha256, bytes: buffer.length, mime };
}

export async function mediaExists(reference) {
  try {
    const result = await storage().send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET, Key: mediaKey(reference) }));
    return result.ContentLength > 0 && result.ContentType === mediaMime(reference);
  } catch (error) {
    if (error.$metadata?.httpStatusCode === 404 || ['NotFound', 'NoSuchKey'].includes(error.name)) return false;
    throw error;
  }
}

export async function mediaUrl(reference) {
  const mime = mediaMime(reference);
  if (!(await mediaExists(reference))) throw new ValidationError('Archivo no disponible');
  return getSignedUrl(storage(), new GetObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: mediaKey(reference),
    ResponseContentType: mime,
    ResponseContentDisposition: 'inline',
  }), { expiresIn: 120 });
}
