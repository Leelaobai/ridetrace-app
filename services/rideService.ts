import { api } from './api';
import type { CachedPoint } from '../utils/pointCache';

export const rideService = {
  startRide: async (vehicleId: string, lat: number, lng: number) => {
    const res = await api.post('/rides', {
      vehicle_id: vehicleId,
      start_lat: lat,
      start_lng: lng,
    });
    return res.data;
  },

  pauseRide: async (rideId: string) => {
    const res = await api.post(`/rides/${rideId}/pause`);
    return res.data;
  },

  resumeRide: async (rideId: string) => {
    const res = await api.post(`/rides/${rideId}/resume`);
    return res.data;
  },

  finishRide: async (rideId: string) => {
    const res = await api.post(`/rides/${rideId}/finish`);
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

  batchUploadPoints: async (rideId: string, points: CachedPoint[]) => {
    const payload = points.map((p, i) => ({
      lat: p.lat,
      lng: p.lng,
      altitude: p.altitude,
      speed: p.speed,
      accuracy: p.accuracy,
      recorded_at: p.recorded_at,
      seq: p.seq ?? i,
    }));
    const res = await api.post(`/rides/${rideId}/points`, { points: payload });
    return res.data;
  },
};
