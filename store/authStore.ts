import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type { User } from '../types';

export interface AuthState {
  token: string | null;
  user: User | null;
  hasVehicle: boolean;
  vehicleId: string | null;
  vehicleNickname: string | null;
  vehicleTotalDistanceM: number;

  setAuth: (token: string, user: User, hasVehicle: boolean) => void;
  setHasVehicle: (val: boolean) => void;
  setVehicle: (id: string, nickname: string, totalDistanceM: number) => void;
  clearAuth: () => void;
}

const KEYS = {
  token: 'auth_token',
  user: 'auth_user',
  hasVehicle: 'auth_has_vehicle',
  vehicleId: 'auth_vehicle_id',
  vehicleNickname: 'auth_vehicle_nickname',
  vehicleTotalDistanceM: 'auth_vehicle_total_distance_m',
} as const;

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  hasVehicle: false,
  vehicleId: null,
  vehicleNickname: null,
  vehicleTotalDistanceM: 0,

  setAuth: (token, user, hasVehicle) => {
    set({ token, user, hasVehicle });
    AsyncStorage.setItem(KEYS.token, token).catch(() => {});
    AsyncStorage.setItem(KEYS.user, JSON.stringify(user)).catch(() => {});
    AsyncStorage.setItem(KEYS.hasVehicle, JSON.stringify(hasVehicle)).catch(() => {});
  },

  setHasVehicle: (val) => {
    set({ hasVehicle: val });
    AsyncStorage.setItem(KEYS.hasVehicle, JSON.stringify(val)).catch(() => {});
  },

  setVehicle: (id, nickname, totalDistanceM) => {
    set({
      hasVehicle: true,
      vehicleId: id,
      vehicleNickname: nickname,
      vehicleTotalDistanceM: totalDistanceM,
    });
    AsyncStorage.setItem(KEYS.hasVehicle, JSON.stringify(true)).catch(() => {});
    AsyncStorage.setItem(KEYS.vehicleId, id).catch(() => {});
    AsyncStorage.setItem(KEYS.vehicleNickname, nickname).catch(() => {});
    AsyncStorage.setItem(KEYS.vehicleTotalDistanceM, String(totalDistanceM)).catch(() => {});
  },

  clearAuth: () => {
    set({
      token: null,
      user: null,
      hasVehicle: false,
      vehicleId: null,
      vehicleNickname: null,
      vehicleTotalDistanceM: 0,
    });
    Object.values(KEYS).forEach((k) => AsyncStorage.removeItem(k).catch(() => {}));
  },
}));

export const getAuthStore = () => useAuthStore.getState();
