const PUBLIC_FRONTENDS = [
  'https://frontend-svelte-vert.vercel.app',
  'https://frontend-svelte-kevinml12s-projects.vercel.app',
];

export function allowedClientOrigins(clientUrl, environment) {
  const urls = (clientUrl || '').split(',').map(value => value.trim()).filter(Boolean);
  const origins = new Set(environment === 'production'
    ? PUBLIC_FRONTENDS
    : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174', 'http://127.0.0.1:3000']);
  for (const value of urls) {
    try {
      const parsed = new URL(value);
      const local = ['localhost', '127.0.0.1'].includes(parsed.hostname);
      if (parsed.origin !== value.replace(/\/$/, '') || parsed.username || parsed.password) continue;
      if (parsed.protocol === 'https:' || (environment !== 'production' && parsed.protocol === 'http:' && local)) origins.add(parsed.origin);
    } catch { /* Ignore invalid configuration entries, including wildcard. */ }
  }
  return origins;
}
