import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_600SemiBold,
} from '@expo-google-fonts/space-grotesk';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { Colors } from '../constants/colors';
import { useAuthStore } from '../store/authStore';
import { getMyVehicle } from '../services/vehicleService';
import { pointCache } from '../utils/pointCache';
import { wgs84ToGcj02 } from '../utils/coordTransform';
import type { User } from '../types';

// 后台位置任务名称（全局常量，cockpit.tsx 也会引用）
export const BACKGROUND_LOCATION_TASK = 'ridetrace-background-location';

// 后台任务定义必须在模块顶层（组件外）注册
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
  if (error) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  for (const location of locations) {
    if (location.coords.accuracy && location.coords.accuracy > 20) continue;
    const { lat, lng } = wgs84ToGcj02(location.coords.latitude, location.coords.longitude);
    await pointCache.append({
      lat,
      lng,
      altitude: location.coords.altitude ?? 0,
      speed: (location.coords.speed ?? 0) * 3.6,
      accuracy: location.coords.accuracy ?? 0,
      recorded_at: new Date(location.timestamp).toISOString(),
      seq: location.timestamp,
    });
  }
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_600SemiBold,
    JetBrainsMono_400Regular,
  });

  const [bootstrapped, setBootstrapped] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const { token, hasVehicle, setAuth, setVehicle, clearAuth } = useAuthStore();

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('auth_token');
        const storedUser = await AsyncStorage.getItem('auth_user');
        const storedHasVehicle = await AsyncStorage.getItem('auth_has_vehicle');

        if (storedToken && storedUser) {
          const user: User = JSON.parse(storedUser);
          const hv = storedHasVehicle != null ? JSON.parse(storedHasVehicle) : false;
          setAuth(storedToken, user, hv);

          if (hv) {
            const storedVId = await AsyncStorage.getItem('auth_vehicle_id');
            const storedVName = await AsyncStorage.getItem('auth_vehicle_nickname');
            const storedVDist = await AsyncStorage.getItem('auth_vehicle_total_distance_m');
            if (storedVId && storedVName) {
              setVehicle(storedVId, storedVName, Number(storedVDist) || 0);
            } else {
              try {
                const mine = await getMyVehicle();
                setVehicle(mine.id, mine.nickname, mine.total_distance_m);
              } catch {}
            }
          }
        } else {
          clearAuth();
        }
      } catch {
        clearAuth();
      } finally {
        setBootstrapped(true);
      }
    };

    bootstrapAuth();
  }, [clearAuth, setAuth, setVehicle]);

  useEffect(() => {
    if (!bootstrapped || !fontsLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const inVehicleSelect = segments[0] === 'vehicle';
    const inRideGroup = segments[0] === 'ride'; // 骑行记录列表、骑行详情

    if (!token) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
      return;
    }

    if (token && !hasVehicle) {
      if (!inVehicleSelect) {
        router.replace('/vehicle/select');
      }
      return;
    }

    if (token && hasVehicle) {
      if (!inTabsGroup && !inRideGroup) {
        router.replace('/(tabs)/cockpit');
      }
    }
  }, [bootstrapped, fontsLoaded, token, hasVehicle, segments, router]);

  if (!bootstrapped || !fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: Colors.bg,
        }}
      >
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return <Slot />;
}

