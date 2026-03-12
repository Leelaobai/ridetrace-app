import { useRef } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { useRideStore } from '../store/rideStore';
import { pointCache } from '../utils/pointCache';
import { wgs84ToGcj02 } from '../utils/coordTransform';

// 精度过滤策略：
// - 有速度（> 0.5 m/s ≈ 1.8 km/h）时接受 100m 以内 —— 运动中 GPS 更可信
// - 静止或低速时接受 50m 以内
// 不再硬截 20m，城市骑行精度经常 30-80m
function shouldAccept(accuracy: number | null | undefined, speedMs: number): boolean {
  if (accuracy == null) return false;
  if (speedMs > 0.5) return accuracy <= 100;
  return accuracy <= 50;
}

const SMOOTH_WINDOW = 5;

function smoothCoords(
  buf: { lat: number; lng: number }[],
  lat: number,
  lng: number,
): { lat: number; lng: number } {
  buf.push({ lat, lng });
  if (buf.length > SMOOTH_WINDOW) buf.shift();
  // 不够 5 个时用现有的，除以实际长度
  const avgLat = buf.reduce((s, p) => s + p.lat, 0) / buf.length;
  const avgLng = buf.reduce((s, p) => s + p.lng, 0) / buf.length;
  return { lat: avgLat, lng: avgLng };
}

export function useLocation() {
  const addPoint = useRideStore(s => s.addPoint);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const smoothBufRef = useRef<{ lat: number; lng: number }[]>([]);

  const startTracking = async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要位置权限', '请在设置中允许 RideTrace 访问位置信息');
      return false;
    }

    smoothBufRef.current = [];

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
      }
    );
    return true;
  };

  const stopTracking = () => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    smoothBufRef.current = [];
  };

  return { startTracking, stopTracking };
}
