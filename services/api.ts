import axios from 'axios';
import { API_BASE_URL } from '../constants/config';
import { getAuthStore } from '../store/authStore';

const __DEV__ = process.env.NODE_ENV !== 'production';

if (__DEV__) console.log('[API] baseURL =', API_BASE_URL);

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = getAuthStore().token;
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  if (__DEV__) console.log('[API] →', config.method?.toUpperCase(), config.baseURL! + config.url!);
  return config;
});

api.interceptors.response.use(
  (res) => {
    if (__DEV__) console.log('[API] ←', res.status, res.config.url);
    return res;
  },
  (error) => {
    if (__DEV__) {
      if (error.response) {
        console.error('[API] ← ERROR', error.response.status, error.config?.url, JSON.stringify(error.response.data));
      } else if (error.request) {
        console.error('[API] ← NO RESPONSE', error.config?.url, error.message);
      } else {
        console.error('[API] ← SETUP ERROR', error.message);
      }
    }
    if (error.response?.status === 401) {
      getAuthStore().clearAuth();
    }
    return Promise.reject(error);
  },
);
