import { api } from './api';
import type { User } from '../types';

const USE_MOCK = true; // 开发阶段：设为 true 跳过后端验证

interface AuthResponse {
  token: string;
  user: User;
  has_vehicle: boolean;
}

export const login = async (
  email: string,
  password: string,
): Promise<AuthResponse> => {
  if (USE_MOCK) {
    return {
      token: 'mock-jwt-token-dev',
      user: { id: 'mock-001', email, username: 'RideTrace用户' },
      has_vehicle: false,
    };
  }

  const res = await api.post<AuthResponse>('/auth/login', { email, password });
  return res.data;
};

export const register = async (
  email: string,
  username: string,
  password: string,
): Promise<AuthResponse> => {
  if (USE_MOCK) {
    return {
      token: 'mock-jwt-token-dev',
      user: { id: 'mock-001', email, username },
      has_vehicle: false,
    };
  }

  const res = await api.post<AuthResponse>('/auth/register', {
    email,
    username,
    password,
  });
  return res.data;
};

