import axios from 'axios';

const raw = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const BASE_URL = raw.endsWith('/api/v1') ? raw : raw.replace(/\/?$/, '') + '/api/v1';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('sirh_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sirh_token');
      localStorage.removeItem('sirh_user');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(err);
  },
);

export default apiClient;
