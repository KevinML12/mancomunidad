import axios from 'axios';

const raw = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
    ? 'https://backend-eosin-omega-81.vercel.app'
    : 'http://localhost:8080'
);
const BASE_URL = raw.endsWith('/api/v1') ? raw : raw.replace(/\/?$/, '') + '/api/v1';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = typeof localStorage !== 'undefined'
    ? (localStorage.getItem('sirh_token') || localStorage.getItem('mfn_token'))
    : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('sirh_token');
        localStorage.removeItem('sirh_user');
        localStorage.removeItem('mfn_token');
        localStorage.removeItem('mfn_user');
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }
    return Promise.reject(err);
  },
);

export default apiClient;
