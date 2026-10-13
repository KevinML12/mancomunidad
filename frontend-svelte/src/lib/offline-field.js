const DB_NAME = 'mfn-field-v1';
const STORE = 'records';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'key' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function operation(method, value) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, method === 'get' || method === 'getAll' ? 'readonly' : 'readwrite');
    const request = method === 'getAll' ? tx.objectStore(STORE).getAll() : tx.objectStore(STORE)[method](value);
    let result;
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

const ownerKey = (userId) => `user:${userId}:`;

export async function saveSnapshot(userId, name, data) {
  if (!userId) return;
  await operation('put', { key: `${ownerKey(userId)}snapshot:${name}`, data, savedAt: new Date().toISOString() });
}

export async function getSnapshot(userId, name) {
  if (!userId) return null;
  return (await operation('get', `${ownerKey(userId)}snapshot:${name}`)) || null;
}

export async function queueEvidence(userId, projectId, payload, sha256) {
  if (!userId) throw new Error('Inicie sesión antes de guardar evidencia');
  const draft = {
    key: `${ownerKey(userId)}draft:${crypto.randomUUID()}`,
    projectId: Number(projectId), payload: { ...payload, claveEnvio: payload.claveEnvio || crypto.randomUUID() }, sha256,
    savedAt: new Date().toISOString()
  };
  await operation('put', draft);
  return draft;
}

export async function getEvidenceDrafts(userId, projectId = null) {
  if (!userId) return [];
  const records = await operation('getAll');
  return records.filter((record) => record.key.startsWith(`${ownerKey(userId)}draft:`) && (projectId === null || record.projectId === Number(projectId)));
}

export async function updateEvidenceDraft(draft, changes) {
  await operation('put', { ...draft, ...changes });
}

export async function removeEvidenceDraft(key) {
  await operation('delete', key);
}

export async function clearUserOfflineData(userId) {
  if (!userId) return;
  const records = await operation('getAll');
  await Promise.all(records.filter((record) => record.key.startsWith(ownerKey(userId))).map((record) => operation('delete', record.key)));
}

export async function stopOfflineService() {
  if (!('serviceWorker' in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.filter((registration) => registration.active?.scriptURL.endsWith('/service-worker.js')).map((registration) => registration.unregister()));
}

export async function sha256Base64(base64) {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
