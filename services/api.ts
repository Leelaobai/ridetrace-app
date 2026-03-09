import axios from 'axios';
import { API_BASE_URL } from '../constants/config';
import { getAuthStore } from '../store/authStore';

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
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      getAuthStore().clearAuth();
    }
    return Promise.reject(error);
  },
);

