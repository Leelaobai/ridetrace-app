import { api } from './api';
import type { CachedPoint } from '../utils/pointCache';
import type { OfflinePoint } from '../utils/offlineRide';

export const rideService = {
  /**
   * 开始骑行
   * @param startedAt 可选，ISO8601；离线骑行同步时传入历史时间
   */
  startRide: async (vehicleId: string, lat: number, lng: number, startedAt?: string) => {
    const res = await api.post('/rides', {
      vehicle_id: vehicleId,
      start_lat: lat,
      start_lng: lng,
      ...(startedAt ? { started_at: startedAt } : {}),
    });
    return res.data as { id: string; status: string; started_at: string };
  },

  pauseRide: async (rideId: string) => {
    const res = await api.post(`/rides/${rideId}/pause`);
    return res.data;
  },

  resumeRide: async (rideId: string) => {
    const res = await api.post(`/rides/${rideId}/resume`);
    return res.data;
  },

  /**
   * 结束骑行
   * @param finishedAt 可选，ISO8601；离线骑行同步时传入历史时间
   * @param durationSec 可选；离线骑行客户端已精确计算，直接传给服务端
   */
  finishRide: async (rideId: string, finishedAt?: string, durationSec?: number) => {
    const res = await api.post(`/rides/${rideId}/finish`, {
      ...(finishedAt ? { finished_at: finishedAt } : {}),
      ...(durationSec !== undefined ? { duration_sec: durationSec } : {}),
    });
    return res.data;
  },

  getRides: async (page = 1, limit = 20) => {
    const res = await api.get(`/rides?page=${page}&limit=${limit}`);
    return res.data;
  },

  getRideDetail: async (id: string) => {
    const res = await api.get(`/rides/${id}`);
    return res.data;
  },

  batchUploadPoints: async (rideId: string, points: (CachedPoint | OfflinePoint)[]) => {
    const payload = points.map((p, i) => ({
      lat: p.lat,
      lng: p.lng,
      altitude: p.altitude ?? 0,
      speed: p.speed ?? 0,
      accuracy: p.accuracy ?? 0,
      recorded_at: (p as CachedPoint).recorded_at ?? new Date().toISOString(),
      seq: p.seq ?? i,
    }));
    const res = await api.post(`/rides/${rideId}/points`, { points: payload });
    return res.data;
  },
};

/** 判断是否为网络错误（服务器未收到请求） */
export function isNetworkError(error: unknown): boolean {
  const e = error as any;
  // Axios: 无 response 且有 request = 网络不通
  if (e?.isAxiosError) return !e.response;
  // 通用 fetch/network 错误
  const msg: string = e?.message ?? '';
  return msg.includes('Network Error') || msg.includes('network') || msg.includes('timeout');
}
