import { create } from 'zustand';

export type RideStatus = 'ready' | 'riding' | 'paused';

interface LocationPoint {
  lat: number;
  lng: number;
  speed?: number;
  accuracy?: number;
  altitude?: number;
  seq?: number;
}

interface RideState {
  status: RideStatus;
  rideId: string | null;
  vehicleId: string | null;

  startTime: Date | null;
  pauseStartTime: Date | null;
  totalPausedMs: number;

  distanceM: number;
  currentSpeedKmh: number;
  maxSpeedKmh: number;
  trackPoints: { lat: number; lng: number }[];
  pendingPoints: LocationPoint[];
  lastUploadedSeq: number;

  ridingDurationSec: () => number;

  startRide: (rideId: string, vehicleId: string) => void;
  pauseRide: () => void;
  resumeRide: () => void;
  finishRide: () => void;
  addPoint: (point: LocationPoint) => void;
  flushPoints: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  status: 'ready' as RideStatus,
  rideId: null,
  vehicleId: null,
  startTime: null,
  pauseStartTime: null,
  totalPausedMs: 0,
  distanceM: 0,
  currentSpeedKmh: 0,
  maxSpeedKmh: 0,
  trackPoints: [],
  pendingPoints: [],
  lastUploadedSeq: 0,
};

function calcDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export const useRideStore = create<RideState>((set, get) => ({
  ...initialState,

  ridingDurationSec: () => {
    const { status, startTime, pauseStartTime, totalPausedMs } = get();
    if (!startTime) return 0;
    const now = Date.now();
    const currentPauseMs = status === 'paused' && pauseStartTime ? now - pauseStartTime.getTime() : 0;
    return Math.floor((now - startTime.getTime() - totalPausedMs - currentPauseMs) / 1000);
  },

  startRide: (rideId, vehicleId) =>
    set({ ...initialState, status: 'riding', rideId, vehicleId, startTime: new Date() }),

  pauseRide: () =>
    set({ status: 'paused', pauseStartTime: new Date(), currentSpeedKmh: 0 }),

  resumeRide: () => {
    const { pauseStartTime, totalPausedMs } = get();
    const extra = pauseStartTime ? Date.now() - pauseStartTime.getTime() : 0;
    set({ status: 'riding', pauseStartTime: null, totalPausedMs: totalPausedMs + extra });
  },

  finishRide: () => set({ status: 'ready', rideId: null }),

  addPoint: (point) => {
    const { trackPoints, maxSpeedKmh, pendingPoints } = get();
    const last = trackPoints[trackPoints.length - 1];
    const extra = last ? calcDistance(last, point) : 0;
    const speed = point.speed ?? 0;
    const newPending = [...pendingPoints, point];
    set({
      trackPoints: [...trackPoints, { lat: point.lat, lng: point.lng }],
      distanceM: get().distanceM + extra,
      currentSpeedKmh: speed,
      maxSpeedKmh: Math.max(maxSpeedKmh, speed),
      pendingPoints: newPending,
    });
    // 积累 10 个点时自动批量上传
    if (newPending.length >= 10) {
      get().flushPoints();
    }
  },

  flushPoints: async () => {
    const { rideId, pendingPoints } = get();
    if (!rideId || pendingPoints.length === 0) return;
    const { rideService } = await import('../services/rideService');
    await rideService.batchUploadPoints(rideId, pendingPoints as any);
    const lastSeq = pendingPoints[pendingPoints.length - 1].seq ?? 0;
    set({ pendingPoints: [], lastUploadedSeq: lastSeq });
  },

  reset: () => set(initialState),
}));
