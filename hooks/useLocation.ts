import { useRef } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { useRideStore } from '../store/rideStore';
import { pointCache } from '../utils/pointCache';
import { wgs84ToGcj02 } from '../utils/coordTransform';

function shouldAccept(accuracy: number | null | undefined, speedMs: number): boolean {
  if (accuracy == null) return false;
  if (speedMs > 0.5) return accuracy <= 300;
  return accuracy <= 100;
}

// 粗略距离（米），用于离群点检测，不需要精确大圆距离
function approxDistM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = (b.lat - a.lat) * 111000;
  const dLng = (b.lng - a.lng) * 85000; // 30°N 附近 1° ≈ 85km
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

const SMOOTH_WINDOW = 3;

function smoothCoords(
  buf: { lat: number; lng: number }[],
  lat: number,
  lng: number,
): { lat: number; lng: number } {
  buf.push({ lat, lng });
  if (buf.length > SMOOTH_WINDOW) buf.shift();
  const avgLat = buf.reduce((s, p) => s + p.lat, 0) / buf.length;
  const avgLng = buf.reduce((s, p) => s + p.lng, 0) / buf.length;
  return { lat: avgLat, lng: avgLng };
}

// Android 会在一段时间后冻结 watchPositionAsync 回调，每 3s 重建订阅确保轨迹丝滑
const RESTART_INTERVAL_MS = 3000;

export function useLocation(
  onRawLocation?: (pt: { lat: number; lng: number }) => void,
  onPointSeq?: (seq: number) => void,
) {
  const addPoint = useRideStore(s => s.addPoint);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const smoothBufRef = useRef<{ lat: number; lng: number }[]>([]);
  const restartTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 上一个被接受的点，用于离群点速度过滤
  const lastAcceptedRef = useRef<{ lat: number; lng: number; ts: number } | null>(null);

  const createSubscription = async () => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    smoothBufRef.current = []; // 每次重建清空平滑缓冲，快速收敛到真实位置

    subscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 0,
      },
      (location) => {
        const { latitude, longitude, accuracy, altitude, speed } = location.coords;
        const speedMs = speed ?? 0;

        if (!shouldAccept(accuracy, speedMs)) return;

        const raw = wgs84ToGcj02(latitude, longitude);

        // 离群点过滤：若与上一个点的隐含速度 > 20 m/s (72 km/h)，视为 GPS 跳点，丢弃
        const nowMs = location.timestamp;
        if (lastAcceptedRef.current) {
          const dtS = (nowMs - lastAcceptedRef.current.ts) / 1000;
          if (dtS > 0 && dtS < 30) {
            const dist = approxDistM(lastAcceptedRef.current, raw);
            if (dist / dtS > 20) return; // 超过 72 km/h → 跳点，丢弃
          }
        }
        lastAcceptedRef.current = { lat: raw.lat, lng: raw.lng, ts: nowMs };

        // 实时原始坐标 → 地图用户点（无滞后）
        onRawLocation?.(raw);

        // 平滑坐标 → 录制轨迹
        const { lat, lng } = smoothCoords(smoothBufRef.current, raw.lat, raw.lng);

        const point = {
          lat,
          lng,
          altitude: altitude ?? 0,
          speed: speedMs * 3.6,
          accuracy: accuracy ?? 0,
          recorded_at: new Date(location.timestamp).toISOString(),
          seq: location.timestamp,
        };
        addPoint(point);
        pointCache.append(point);
        onPointSeq?.(point.seq);
      }
    );
  };

  const startTracking = async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要位置权限', '请在设置中允许 RideTrace 访问位置信息');
      return false;
    }

    lastAcceptedRef.current = null;
    smoothBufRef.current = [];
    await createSubscription();

    // 每 8s 自动重建订阅，防止 Android 冻结回调
    restartTimerRef.current = setInterval(createSubscription, RESTART_INTERVAL_MS);
    return true;
  };

  const stopTracking = () => {
    if (restartTimerRef.current) {
      clearInterval(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    smoothBufRef.current = [];
    lastAcceptedRef.current = null;
  };

  return { startTracking, stopTracking };
}
