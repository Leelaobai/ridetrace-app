import { useRef } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { useRideStore } from '../store/rideStore';
import { pointCache } from '../utils/pointCache';
import { wgs84ToGcj02 } from '../utils/coordTransform';

export function useLocation() {
  const addPoint = useRideStore(s => s.addPoint);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  const startTracking = async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要位置权限', '请在设置中允许 RideTrace 访问位置信息');
      return false;
    }

    subscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 2,
      },
      (location) => {
        // 丢弃精度差的点（accuracy > 20m），避免轨迹乱跳
        if (location.coords.accuracy && location.coords.accuracy > 20) return;

        // WGS-84 → GCJ-02，匹配高德地图坐标系
        const { lat, lng } = wgs84ToGcj02(
          location.coords.latitude,
          location.coords.longitude
        );
        const point = {
          lat,
          lng,
          altitude: location.coords.altitude ?? 0,
          speed: (location.coords.speed ?? 0) * 3.6, // m/s → km/h
          accuracy: location.coords.accuracy ?? 0,
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
  };

  return { startTracking, stopTracking };
}
