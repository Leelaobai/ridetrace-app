import { api } from './api';

interface UserStats {
  total_rides: number;
  total_distance_m: number;
  total_duration_sec: number;
}

export const userService = {
  getStats: async (): Promise<UserStats> => {
    const res = await api.get<UserStats>('/users/me/stats');
    return res.data;
  },
};
