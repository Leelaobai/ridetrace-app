import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CachedPoint {
  lat: number;
  lng: number;
  altitude: number;
  speed: number;
  accuracy: number;
  recorded_at: string;
  seq: number;
}

const CACHE_KEY = 'ridetrace_pending_points';

export const pointCache = {
  async append(point: CachedPoint): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      const points: CachedPoint[] = raw ? JSON.parse(raw) : [];
      points.push(point);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(points));
    } catch {}
  },

  async getAll(): Promise<CachedPoint[]> {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
    } catch {}
  },
};
