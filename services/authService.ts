import { api } from './api';
import type { User } from '../types';

interface AuthResponse {
  token: string;
  user: User;
  has_vehicle: boolean;
}

export const login = async (
  email: string,
  password: string,
): Promise<AuthResponse> => {
  const res = await api.post<AuthResponse>('/auth/login', { email, password });
  return res.data;
};

export const register = async (
  email: string,
  username: string,
  password: string,
): Promise<AuthResponse> => {
  const res = await api.post<AuthResponse>('/auth/register', {
    email,
    username,
    password,
  });
  return res.data;
};
