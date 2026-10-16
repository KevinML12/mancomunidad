import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { uploadEvidence } from '../src/lib/evidence/upload.js';

const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
const sha256 = createHash('sha256').update(image).digest('hex');
const payload = { archivoBase64: image.toString('base64'), tipoMime: 'image/png', descripcion: 'Foto de prueba' };

test('la fotografía viaja a R2 y el API solo recibe metadatos y huella', async () => {
  const calls = [];
  const api = { post: async (path, body) => {
    calls.push({ path, body });
    return { data: path.endsWith('/preparar') ? { uploadUrl: 'https://storage.example.test/upload', ticket: 'ticket' } : { id: 7, sha256 } };
  } };
  const result = await uploadEvidence(3, payload, { api, send: async (url, blob, mime) => {
    assert.equal(url, 'https://storage.example.test/upload');
    assert.equal(mime, 'image/png');
    assert.deepEqual(Buffer.from(await blob.arrayBuffer()), image);
  } });
  assert.equal(result.id, 7);
  assert.deepEqual(calls.map(call => call.path), ['/proyectos/3/evidencias/preparar', '/proyectos/3/evidencias/confirmar']);
  assert.deepEqual(calls[0].body, { tipoMime: 'image/png', bytes: image.length, sha256 });
  assert.equal(calls[1].body.descripcion, 'Foto de prueba');
  assert.equal(calls.some(call => 'archivoBase64' in call.body), false);
});

test('una evidencia ya registrada evita subir de nuevo', async () => {
  let sent = false;
  const result = await uploadEvidence(3, payload, { api: { post: async () => ({ data: { existing: { id: 4, sha256 } } }) }, send: async () => { sent = true; } });
  assert.equal(result.id, 4);
  assert.equal(sent, false);
});
