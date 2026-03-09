import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type { User } from '../types';

export interface AuthState {
  token: string | null;
  user: User | null;
  hasVehicle: boolean;
  setAuth: (token: string, user: User, hasVehicle: boolean) => void;
  setHasVehicle: (val: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  hasVehicle: false,
  setAuth: (token, user, hasVehicle) => {
    set({ token, user, hasVehicle });
    AsyncStorage.setItem('auth_token', token).catch(() => {});
    AsyncStorage.setItem('auth_user', JSON.stringify(user)).catch(() => {});
    AsyncStorage.setItem('auth_has_vehicle', JSON.stringify(hasVehicle)).catch(
      () => {},
    );
  },
  setHasVehicle: (val) => {
    set({ hasVehicle: val });
    AsyncStorage.setItem('auth_has_vehicle', JSON.stringify(val)).catch(() => {});
  },
  clearAuth: () => {
    set({ token: null, user: null, hasVehicle: false });
    AsyncStorage.removeItem('auth_token').catch(() => {});
    AsyncStorage.removeItem('auth_user').catch(() => {});
    AsyncStorage.removeItem('auth_has_vehicle').catch(() => {});
  },
}));

export const getAuthStore = () => useAuthStore.getState();

