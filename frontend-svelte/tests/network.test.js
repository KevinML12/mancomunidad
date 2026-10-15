import test from 'node:test';
import assert from 'node:assert/strict';
import { apiBaseUrl } from '../src/lib/api-url.js';
import { settledLimited } from '../src/lib/settled-limited.js';

test('API usa el mismo origen en producción y localhost en desarrollo', () => {
  assert.equal(apiBaseUrl('', 'https://mfn.example/'), '/api/v1');
  assert.equal(apiBaseUrl('https://api.example/api/v1/', 'https://mfn.example/'), '/api/v1');
  assert.equal(apiBaseUrl('', 'http://localhost:5173/'), 'http://localhost:8080/api/v1');
  assert.throws(() => apiBaseUrl('http://api.example', 'http://localhost:5173/'));
});

test('consultas mantienen el orden y no exceden tres simultáneas', async () => {
  let active = 0;
  let peak = 0;
  const tasks = Array.from({ length: 8 }, (_, index) => async () => {
    peak = Math.max(peak, ++active);
    await new Promise(resolve => setTimeout(resolve, 2));
    active--;
    if (index === 4) throw new Error('fuente caída');
    return index;
  });
  const results = await settledLimited(tasks, 3);
  assert.equal(peak, 3);
  assert.deepEqual(results.map(result => result.status), ['fulfilled', 'fulfilled', 'fulfilled', 'fulfilled', 'rejected', 'fulfilled', 'fulfilled', 'fulfilled']);
  assert.equal(results[7].value, 7);
});
