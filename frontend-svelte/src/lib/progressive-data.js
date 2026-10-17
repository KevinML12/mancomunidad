import apiClient from './apiClient.js';

export async function loadPaged(path, onPage, { signal } = {}) {
  const slow = typeof navigator !== 'undefined' && (navigator.connection?.saveData || ['slow-2g', '2g'].includes(navigator.connection?.effectiveType));
  const limit = slow ? 20 : 50;
  const rows = [];
  let page = 1;
  while (page) {
    const response = await apiClient.get(path, { params: { page, limit }, signal });
    if (!Array.isArray(response.data)) throw new Error('La lista recibida no es válida');
    rows.push(...response.data);
    onPage?.([...rows], { page, complete: !response.headers['x-next-page'] });
    const next = Number(response.headers['x-next-page']);
    page = Number.isSafeInteger(next) && next > page ? next : 0;
  }
  return rows;
}

export function refreshWhenVisible(refresh) {
  const slow = navigator.connection?.saveData || ['slow-2g', '2g'].includes(navigator.connection?.effectiveType);
  let running = false;
  const run = async () => {
    if (running || document.visibilityState !== 'visible' || !navigator.onLine) return;
    running = true;
    try { await refresh(); } finally { running = false; }
  };
  run();
  const timer = window.setInterval(run, slow ? 300_000 : 120_000);
  window.addEventListener('online', run);
  document.addEventListener('visibilitychange', run);
  return () => { window.clearInterval(timer); window.removeEventListener('online', run); document.removeEventListener('visibilitychange', run); };
}
