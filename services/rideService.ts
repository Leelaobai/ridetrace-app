import { api } from './api';
import type { CachedPoint } from '../utils/pointCache';

const USE_MOCK = true;

// Mock 骑行记录
const MOCK_RIDES = [
  {
    id: 'ride-001',
    status: 'completed',
    distance_m: 25300,
    duration_sec: 4320,
    avg_speed_kmh: 21.2,
    max_speed_kmh: 38.5,
    elevation_gain: 150,
    vehicle_nickname: '我的战马（公路车 入门款）',
    started_at: '2024-03-01T10:00:00Z',
    finished_at: '2024-03-01T11:12:00Z',
  },
  {
    id: 'ride-002',
    status: 'completed',
    distance_m: 18600,
    duration_sec: 3240,
    avg_speed_kmh: 20.6,
    max_speed_kmh: 35.2,
    elevation_gain: 95,
    vehicle_nickname: '我的战马（公路车 入门款）',
    started_at: '2024-02-25T08:30:00Z',
    finished_at: '2024-02-25T09:24:00Z',
  },
  {
    id: 'ride-003',
    status: 'completed',
    distance_m: 42100,
    duration_sec: 7200,
    avg_speed_kmh: 21.1,
    max_speed_kmh: 44.8,
    elevation_gain: 280,
    vehicle_nickname: '我的战马（公路车 入门款）',
    started_at: '2024-02-18T09:00:00Z',
    finished_at: '2024-02-18T11:00:00Z',
  },
];

// Mock 轨迹点（上海外滩附近一段路线，GCJ-02）
const MOCK_TRACK_POINTS = [
  { lat: 31.2397, lng: 121.4900 },
  { lat: 31.2380, lng: 121.4920 },
  { lat: 31.2365, lng: 121.4935 },
  { lat: 31.2350, lng: 121.4950 },
  { lat: 31.2338, lng: 121.4960 },
  { lat: 31.2325, lng: 121.4972 },
  { lat: 31.2310, lng: 121.4985 },
  { lat: 31.2298, lng: 121.4995 },
  { lat: 31.2285, lng: 121.5010 },
  { lat: 31.2275, lng: 121.5025 },
  { lat: 31.2268, lng: 121.5040 },
  { lat: 31.2260, lng: 121.5055 },
];

export const rideService = {
  startRide: async (vehicleId: string, lat: number, lng: number) => {
    if (USE_MOCK) return { id: `ride-${Date.now()}`, status: 'ongoing', started_at: new Date().toISOString() };
    const res = await api.post('/rides', { vehicle_id: vehicleId, start_lat: lat, start_lng: lng });
    return res.data;
  },

  pauseRide: async (rideId: string) => {
    if (USE_MOCK) return { id: rideId, status: 'paused' };
    const res = await api.post(`/rides/${rideId}/pause`);
    return res.data;
  },

  resumeRide: async (rideId: string) => {
    if (USE_MOCK) return { id: rideId, status: 'ongoing' };
    const res = await api.post(`/rides/${rideId}/resume`);
    return res.data;
  },

  finishRide: async (rideId: string) => {
    if (USE_MOCK) return {
      id: rideId, status: 'completed',
      duration_sec: 3600, distance_m: 25000,
      avg_speed_kmh: 25.0, max_speed_kmh: 42.3, elevation_gain: 150,
    };
    const res = await api.post(`/rides/${rideId}/finish`);
    return res.data;
  },

  getRides: async () => {
    if (USE_MOCK) return { rides: MOCK_RIDES, total: MOCK_RIDES.length, page: 1 };
    const res = await api.get('/rides?page=1&limit=20');
    return res.data;
  },

  getRideDetail: async (id: string) => {
    if (USE_MOCK) {
      const ride = MOCK_RIDES.find(r => r.id === id) ?? MOCK_RIDES[0];
      return { ...ride, points: MOCK_TRACK_POINTS };
    }
    const res = await api.get(`/rides/${id}`);
    return res.data;
  },

  batchUploadPoints: async (rideId: string, points: CachedPoint[]) => {
    if (USE_MOCK) return { uploaded: points.length, duplicates_skipped: 0 };
    const payload = points.map((p, i) => ({
      lat: p.lat, lng: p.lng,
      altitude: p.altitude, speed: p.speed,
      accuracy: p.accuracy,
      recorded_at: p.recorded_at,
      seq: p.seq ?? i,
    }));
    const res = await api.post(`/rides/${rideId}/points`, { points: payload });
    return res.data;
  },
};
