import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedClientOrigins } from '../../src/lib/cors-policy.js';

test('producción solo permite el frontend HTTPS y orígenes configurados seguros', () => {
  const origins = allowedClientOrigins('*,http://localhost:5173,https://mfn.example,https://evil.example/path', 'production');
  assert.deepEqual([...origins], ['https://frontend-svelte-vert.vercel.app', 'https://frontend-svelte-kevinml12s-projects.vercel.app', 'https://mfn.example']);
});

test('desarrollo permite el frontend local sin abrir CORS a internet', () => {
  const origins = allowedClientOrigins('http://localhost:8080,https://staging.example', 'development');
  assert.equal(origins.has('http://localhost:8080'), true);
  assert.equal(origins.has('https://staging.example'), true);
  assert.equal(origins.has('*'), false);
});
