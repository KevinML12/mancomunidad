export function isLoopback(hostname) {
  return ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
}

export function apiBaseUrl(configured, pageUrl) {
  const page = pageUrl ? new URL(pageUrl) : null;
  const localPage = page && isLoopback(page.hostname);
  if (!localPage) return '/api/v1';
  const source = configured?.trim() || 'http://localhost:8080';
  const url = new URL(source);
  const localHttp = url.protocol === 'http:' && isLoopback(url.hostname) && localPage && page.protocol === 'http:';
  if (url.username || url.password || url.search || url.hash || (url.protocol !== 'https:' && !localHttp)) {
    throw new Error('VITE_API_URL debe usar HTTPS; HTTP solo se permite en localhost durante desarrollo');
  }
  url.pathname = `${url.pathname.replace(/\/+$/, '').replace(/\/api\/v1$/, '')}/api/v1`;
  return url.href.replace(/\/$/, '');
}
