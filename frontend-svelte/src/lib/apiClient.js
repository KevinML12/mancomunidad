import axios from 'axios';
import { apiBaseUrl } from './api-url.js';

const BASE_URL = apiBaseUrl(import.meta.env.VITE_API_URL, typeof window !== 'undefined' ? window.location.href : undefined);

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }
    return Promise.reject(err);
  },
);

export default apiClient;
