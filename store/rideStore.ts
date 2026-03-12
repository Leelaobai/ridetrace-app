import { create } from 'zustand';
import { RIDE_STATUS, EARTH_RADIUS_M, type RideStatus } from '../constants/ride';

export type { RideStatus } from '../constants/ride';

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
  isOffline: boolean;       // 本次骑行是否在离线模式下进行

  startTime: Date | null;
  pauseStartTime: Date | null;
  totalPausedMs: number;

  distanceM: number;
  elevationGainM: number;
  currentSpeedKmh: number;
  maxSpeedKmh: number;
  trackPoints: { lat: number; lng: number }[];
  pendingPoints: LocationPoint[];
  lastUploadedSeq: number;
  lastAltitudeM: number | null;

  ridingDurationSec: () => number;

  startRide: (rideId: string, vehicleId: string, isOffline?: boolean) => void;
  pauseRide: () => void;
  resumeRide: () => void;
  finishRide: () => void;
  addPoint: (point: LocationPoint) => void;
  flushPoints: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  status: RIDE_STATUS.READY,
  rideId: null,
  vehicleId: null,
  isOffline: false,
  startTime: null,
  pauseStartTime: null,
  totalPausedMs: 0,
  distanceM: 0,
  elevationGainM: 0,
  currentSpeedKmh: 0,
  maxSpeedKmh: 0,
  trackPoints: [],
  pendingPoints: [],
  lastUploadedSeq: 0,
  lastAltitudeM: null,
};

// 海拔中位数滤波：取最近 5 个值的中位数，过滤毛刺
const altBuf: number[] = [];
function smoothAltitude(alt: number): number {
  altBuf.push(alt);
  if (altBuf.length > 5) altBuf.shift();
  const sorted = [...altBuf].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function calcDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = EARTH_RADIUS_M;
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
    const currentPauseMs = status === RIDE_STATUS.PAUSED && pauseStartTime ? now - pauseStartTime.getTime() : 0;
    return Math.floor((now - startTime.getTime() - totalPausedMs - currentPauseMs) / 1000);
  },

  startRide: (rideId, vehicleId, isOffline = false) => {
    altBuf.length = 0;
    set({ ...initialState, status: RIDE_STATUS.RIDING, rideId, vehicleId, isOffline, startTime: new Date() });
  },

  pauseRide: () =>
    set({ status: RIDE_STATUS.PAUSED, pauseStartTime: new Date(), currentSpeedKmh: 0 }),

  resumeRide: () => {
    const { pauseStartTime, totalPausedMs } = get();
    const extra = pauseStartTime ? Date.now() - pauseStartTime.getTime() : 0;
    set({ status: RIDE_STATUS.RIDING, pauseStartTime: null, totalPausedMs: totalPausedMs + extra });
  },

  finishRide: () => set({ status: RIDE_STATUS.READY, rideId: null }),

  addPoint: (point) => {
    const { trackPoints, maxSpeedKmh, pendingPoints, elevationGainM, lastAltitudeM } = get();
    const last = trackPoints[trackPoints.length - 1];
    const extra = last ? calcDistance(last, point) : 0;
    const speed = point.speed ?? 0;

    // 爬升累计：中位数平滑后，上升超过 5m 才累加
    let newElevationGain = elevationGainM;
    const rawAlt = point.altitude ?? null;
    let newLastAlt = lastAltitudeM;
    if (rawAlt != null && rawAlt > 0) {
      const alt = smoothAltitude(rawAlt);
      if (lastAltitudeM != null) {
        const diff = alt - lastAltitudeM;
        if (diff > 5) newElevationGain += diff;
      }
      newLastAlt = rawAlt; // lastAltitudeM 存原始值，平滑只影响当前帧
    }

    set({
      trackPoints: [...trackPoints, { lat: point.lat, lng: point.lng }],
      distanceM: get().distanceM + extra,
      elevationGainM: newElevationGain,
      lastAltitudeM: newLastAlt,
      currentSpeedKmh: speed,
      maxSpeedKmh: Math.max(maxSpeedKmh, speed),
      pendingPoints: [...pendingPoints, point],
    });
    // 骑行中不自动上传，结束时一次性提交
  },

  flushPoints: async () => {
    const { rideId, pendingPoints, isOffline } = get();
    if (!rideId || pendingPoints.length === 0) return;
    // 离线模式：不尝试上传，点保留在内存等待骑行结束时统一保存
    if (isOffline) return;
    const { rideService } = await import('../services/rideService');
    await rideService.batchUploadPoints(rideId, pendingPoints as any);
    const lastSeq = pendingPoints[pendingPoints.length - 1].seq ?? 0;
    set({ pendingPoints: [], lastUploadedSeq: lastSeq });
  },

  reset: () => set(initialState),
}));
