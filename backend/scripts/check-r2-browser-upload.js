// Verificación manual del mismo PUT firmado que utiliza el navegador.
// Crea un objeto temporal único y lo elimina siempre, incluso si CORS falla.
import crypto from 'node:crypto';
import { config } from 'dotenv';
import { PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { storage } from '../src/services/documents.js';

config({ path: process.env.R2_ENV_FILE || '.env.r2.local', override: false, quiet: true });

const origin = process.env.PORTAL_ORIGIN || 'https://frontend-svelte-vert.vercel.app';
const file = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000b49444154789c636000020000050001a5f645400000000049454e44ae426082', 'hex');
const key = `mfn/pendientes/comprobacion/${crypto.randomUUID()}.png`;
const bucket = process.env.R2_BUCKET;
let client;

try {
  if (new URL(origin).protocol !== 'https:') throw new Error('PORTAL_ORIGIN debe usar HTTPS');
  client = storage();
  const uploadUrl = await getSignedUrl(client, new PutObjectCommand({
    Bucket: bucket, Key: key, ContentType: 'image/png', ContentLength: file.length,
  }), { expiresIn: 120 });

  const preflight = await fetch(uploadUrl, {
    method: 'OPTIONS',
    headers: { Origin: origin, 'Access-Control-Request-Method': 'PUT', 'Access-Control-Request-Headers': 'content-type' },
  });
  if (!preflight.ok || preflight.headers.get('access-control-allow-origin') !== origin) {
    throw new Error(`CORS de R2 no autoriza PUT desde ${origin} (HTTP ${preflight.status})`);
  }

  const uploaded = await fetch(uploadUrl, { method: 'PUT', headers: { Origin: origin, 'Content-Type': 'image/png' }, body: file });
  if (!uploaded.ok || uploaded.headers.get('access-control-allow-origin') !== origin) {
    throw new Error(`PUT firmado desde ${origin} falló (HTTP ${uploaded.status})`);
  }
  const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  if (head.ContentLength !== file.length || head.ContentType !== 'image/png') {
    throw new Error('R2 no conservó el tipo o tamaño del archivo');
  }
  console.log(`CORS y PUT firmado de R2 correctos para ${origin}; archivo temporal eliminado.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (client) {
    try { await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })); }
    catch (error) { console.error(`No se pudo eliminar el objeto temporal ${key}: ${error.message}`); process.exitCode = 1; }
    client.destroy();
  }
}
