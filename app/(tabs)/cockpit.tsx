import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { Colors } from '../../constants/colors';
import { GPS_ACCURACY_GOOD, GPS_ACCURACY_WEAK } from '../../constants/config';
import { useRideStore } from '../../store/rideStore';
import { useAuthStore } from '../../store/authStore';
import { rideService } from '../../services/rideService';
import { getErrorMessage } from '../../utils/errors';
import { AMapView } from '../../components/map/AMapView';
import { useLocation } from '../../hooks/useLocation';
import { pointCache } from '../../utils/pointCache';
import { wgs84ToGcj02 } from '../../utils/coordTransform';
import { BACKGROUND_LOCATION_TASK } from '../_layout';

// ─── 工具 ──────────────────────────────────────────────
function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDistance(m: number) {
  if (m < 1000) return `${m.toFixed(0)} M`;
  return `${(m / 1000).toFixed(2)} KM`;
}


// ─── 状态指示器（左上角）────────────────────────────────
function StatusBadge({ status, durationSec }: { status: 'riding' | 'paused'; durationSec: number }) {
  const isRiding = status === 'riding';
  return (
    <View style={badgeStyles.wrap}>
      <View style={[badgeStyles.dot, { backgroundColor: isRiding ? Colors.success : Colors.warning }]} />
      <Text style={badgeStyles.text}>
        {isRiding ? formatDuration(durationSec) : '已暂停'}
      </Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(8,17,18,0.85)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 14,
    color: Colors.textPrimary,
  },
});

// ─── 右侧地图控制按钮 ─────────────────────────────────
function MapControls({ onLocate }: { onLocate: () => void }) {
  return (
    <View style={ctrlStyles.wrap}>
      <TouchableOpacity style={ctrlStyles.btn} onPress={onLocate}>
        <Ionicons name="locate" size={20} color={Colors.textPrimary} />
      </TouchableOpacity>
      <TouchableOpacity style={ctrlStyles.btn}>
        <Ionicons name="add" size={20} color={Colors.textPrimary} />
      </TouchableOpacity>
      <TouchableOpacity style={ctrlStyles.btn}>
        <Ionicons name="remove" size={20} color={Colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const ctrlStyles = StyleSheet.create({
  wrap: { gap: 8 },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(8,17,18,0.85)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── 状态A：准备起骑 底部面板 ─────────────────────────
function ReadyPanel({ onStart, vehicleName, totalDistanceM }: {
  onStart: () => void;
  vehicleName: string;
  totalDistanceM: number;
}) {
  const distKm = (totalDistanceM / 1000).toFixed(0);
  return (
    <View style={panelStyles.wrap}>
      <View style={panelStyles.vehicleRow}>
        <View>
          <Text style={panelStyles.vehicleName}>{vehicleName}</Text>
          <Text style={panelStyles.vehicleMeta}>总里程 {distKm} km · 准备就绪</Text>
        </View>
        <View style={panelStyles.readyBadge}>
          <Text style={panelStyles.readyBadgeText}>系统已激活</Text>
        </View>
      </View>
      <TouchableOpacity style={panelStyles.startBtn} onPress={onStart} activeOpacity={0.85}>
        <Ionicons name="play" size={22} color="#000" />
        <Text style={panelStyles.startBtnText}>开始骑行</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── 数据面板（骑行中 & 暂停共用）────────────────────
function StatsPanel({
  speedKmh, avgSpeedKmh, durationSec, distanceM,
}: {
  speedKmh: number; avgSpeedKmh: number; durationSec: number; distanceM: number;
}) {
  return (
    <View style={statsStyles.wrap}>
      {/* 主数据：时速 */}
      <View style={statsStyles.mainRow}>
        <Text style={statsStyles.mainValue}>{speedKmh.toFixed(1)}</Text>
        <View>
          <Text style={statsStyles.mainUnit}>KM/H</Text>
          <Text style={statsStyles.mainLabel}>时速</Text>
        </View>
      </View>
      {/* 次要数据行 */}
      <View style={statsStyles.subRow}>
        <View style={statsStyles.subItem}>
          <Text style={statsStyles.subValue}>{avgSpeedKmh.toFixed(1)}</Text>
          <Text style={statsStyles.subLabel}>均速 KM/H</Text>
        </View>
        <View style={statsStyles.divider} />
        <View style={statsStyles.subItem}>
          <Text style={statsStyles.subValue}>{formatDuration(durationSec)}</Text>
          <Text style={statsStyles.subLabel}>时长</Text>
        </View>
        <View style={statsStyles.divider} />
        <View style={statsStyles.subItem}>
          <Text style={statsStyles.subValue}>{formatDistance(distanceM)}</Text>
          <Text style={statsStyles.subLabel}>距离</Text>
        </View>
      </View>
    </View>
  );
}

const statsStyles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(8,17,18,0.92)',
    borderTopWidth: 1,
    borderColor: `rgba(13,227,242,0.15)`,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  mainRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  mainValue: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 52,
    color: Colors.primary,
    lineHeight: 56,
    textShadowColor: 'rgba(13,227,242,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  mainUnit: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: Colors.textSecondary },
  mainLabel: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: Colors.textMuted },
  subRow: { flexDirection: 'row', alignItems: 'center' },
  subItem: { flex: 1, alignItems: 'center', gap: 3 },
  subValue: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 18, color: Colors.textPrimary },
  subLabel: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11, color: Colors.textMuted },
  divider: { width: 1, height: 32, backgroundColor: Colors.glassBorder },
});

// ─── 状态B：骑行中 按钮 ──────────────────────────────
function RidingButtons({ onPause }: { onPause: () => void }) {
  return (
    <View style={btnStyles.singleWrap}>
      <TouchableOpacity style={btnStyles.pauseBtn} onPress={onPause}>
        <Ionicons name="pause" size={22} color={Colors.textPrimary} />
        <Text style={btnStyles.pauseText}>暂停</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── 状态C：已暂停 按钮 ──────────────────────────────
function PausedButtons({ onResume, onFinish }: { onResume: () => void; onFinish: () => void }) {
  return (
    <View style={btnStyles.dualWrap}>
      <TouchableOpacity style={btnStyles.resumeBtn} onPress={onResume}>
        <Ionicons name="play" size={20} color={Colors.primary} />
        <Text style={btnStyles.resumeText}>继续</Text>
      </TouchableOpacity>
      <TouchableOpacity style={btnStyles.finishBtn} onPress={onFinish}>
        <Ionicons name="stop" size={20} color="#fff" />
        <Text style={btnStyles.finishText}>结束</Text>
      </TouchableOpacity>
    </View>
  );
}

const btnStyles = StyleSheet.create({
  singleWrap: { paddingHorizontal: 24, paddingVertical: 16 },
  pauseBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.glassBorder, borderRadius: 14,
    height: 52, gap: 8, backgroundColor: 'rgba(255,255,255,0.05)',
  },
  pauseText: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16, color: Colors.textPrimary },
  dualWrap: { flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 16, gap: 12 },
  resumeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 14, height: 52, gap: 8,
  },
  resumeText: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16, color: Colors.primary },
  finishBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.danger, borderRadius: 14, height: 52, gap: 8,
  },
  finishText: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16, color: '#fff' },
});

const panelStyles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(8,17,18,0.95)',
    borderTopWidth: 1,
    borderColor: `rgba(13,227,242,0.15)`,
    padding: 24,
    gap: 16,
  },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vehicleName: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 17, color: Colors.textPrimary },
  vehicleMeta: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 3 },
  readyBadge: {
    borderWidth: 1, borderColor: Colors.primary, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  readyBadgeText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: Colors.primary },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: 14, height: 56, gap: 10,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 14, elevation: 8,
  },
  startBtnText: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 18, color: '#000' },
});

// ─── 主驾驶舱页面 ─────────────────────────────────────
type GpsQuality = 'good' | 'weak' | 'none';

function gpsQualityFromAccuracy(accuracy: number | null): GpsQuality {
  if (accuracy == null) return 'none';
  if (accuracy <= GPS_ACCURACY_GOOD) return 'good';
  if (accuracy <= GPS_ACCURACY_WEAK) return 'weak';
  return 'none';
}

const GPS_LABEL: Record<GpsQuality, string> = {
  good: 'GPS 信号：良好',
  weak: 'GPS 信号：较弱',
  none: 'GPS 信号：搜索中',
};
const GPS_COLOR: Record<GpsQuality, string> = {
  good: Colors.primary,
  weak: Colors.warning,
  none: Colors.textMuted,
};

export default function CockpitScreen() {
  const router = useRouter();
  const store = useRideStore();
  const { vehicleId, vehicleNickname, vehicleTotalDistanceM } = useAuthStore();
  const [tick, setTick] = useState(0);
  const [avgSpeed, setAvgSpeed] = useState(0);
  const [locatePoint, setLocatePoint] = useState<{ lat: number; lng: number; ts: number } | null>(null);
  const [initialLocation, setInitialLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsQuality, setGpsQuality] = useState<GpsQuality>('none');
  const { startTracking, stopTracking } = useLocation();

  const handleLocate = async () => {
    const last = store.trackPoints[store.trackPoints.length - 1];
    if (last) {
      setLocatePoint({ lat: last.lat, lng: last.lng, ts: Date.now() });
      return;
    }
    if (initialLocation) {
      setLocatePoint({ ...initialLocation, ts: Date.now() });
      return;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const point = wgs84ToGcj02(loc.coords.latitude, loc.coords.longitude);
      setInitialLocation(point);
      setLocatePoint({ ...point, ts: Date.now() });
    } catch {}
  };

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const cached = await Location.getLastKnownPositionAsync();
        if (cached) {
          setInitialLocation(wgs84ToGcj02(cached.coords.latitude, cached.coords.longitude));
          setGpsQuality(gpsQualityFromAccuracy(cached.coords.accuracy));
        }

        const fast = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setInitialLocation(wgs84ToGcj02(fast.coords.latitude, fast.coords.longitude));
        setGpsQuality(gpsQualityFromAccuracy(fast.coords.accuracy));

        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
          (pos) => {
            setInitialLocation(wgs84ToGcj02(pos.coords.latitude, pos.coords.longitude));
            setGpsQuality(gpsQualityFromAccuracy(pos.coords.accuracy));
          },
        );
      } catch {
        try {
          const last = await Location.getLastKnownPositionAsync();
          if (last) {
            setInitialLocation(wgs84ToGcj02(last.coords.latitude, last.coords.longitude));
            setGpsQuality(gpsQualityFromAccuracy(last.coords.accuracy));
          }
        } catch {}
      }
    })();
    return () => { sub?.remove(); };
  }, []);

  // 每秒刷新计时器 + 均速计算
  useEffect(() => {
    const t = setInterval(() => {
      setTick(v => v + 1);
      const sec = store.ridingDurationSec();
      if (sec > 0 && store.distanceM > 0) {
        setAvgSpeed((store.distanceM / 1000) / (sec / 3600));
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // 检测是否在 Expo Go 中运行（Expo Go 不支持后台位置任务）
  const isExpoGo = Constants.appOwnership === 'expo';

  // 申请后台位置权限并启动后台任务（仅在独立 App / Dev Client 中运行）
  const startBackgroundTracking = async () => {
    if (isExpoGo) return;
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      if (status !== 'granted') return;
      const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (isRunning) return;
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 3000,
        foregroundService: {
          notificationTitle: 'RideTrace 骑行中',
          notificationBody: '正在记录您的骑行轨迹',
          notificationColor: '#0de3f2',
        },
      });
    } catch {}
  };

  const stopBackgroundTracking = async () => {
    if (isExpoGo) return;
    try {
      const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (isRunning) await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    } catch {}
  };

  const handleStart = async () => {
    if (!vehicleId) {
      Alert.alert('未选择座驾', '请先选择一个座驾');
      return;
    }
    const lat = initialLocation?.lat ?? 31.2304;
    const lng = initialLocation?.lng ?? 121.4737;
    try {
      const res = await rideService.startRide(vehicleId, lat, lng);
      store.startRide(res.id, vehicleId);
      await startTracking();
      await startBackgroundTracking();
    } catch (e) {
      Alert.alert('开始失败', getErrorMessage(e, '请检查网络连接'));
    }
  };

  const handlePause = async () => {
    stopTracking();
    if (store.rideId) await rideService.pauseRide(store.rideId);
    store.pauseRide();
  };

  const handleResume = async () => {
    if (store.rideId) await rideService.resumeRide(store.rideId);
    store.resumeRide();
    await startTracking();
  };

  const handleFinishConfirm = () => {
    Alert.alert('结束骑行', '确定要结束本次骑行吗？', [
      { text: '再骑一会儿', style: 'cancel' },
      {
        text: '结束', style: 'destructive', onPress: async () => {
          stopTracking();
          await stopBackgroundTracking();
          const rideId = store.rideId;
          if (!rideId) return;
          // 强制上传所有缓存点
          await store.flushPoints();
          await pointCache.clear();
          await rideService.finishRide(rideId);
          store.finishRide();
          router.push(`/ride/${rideId}`);
        },
      },
    ]);
  };

  const durationSec = store.ridingDurationSec();

  return (
    <View style={styles.container}>
      {/* 高德地图层 */}
      <AMapView trackPoints={store.trackPoints} locatePoint={locatePoint} userLocation={initialLocation} style={{ flex: 1 }} />

      {/* 悬浮 UI 层 */}
      <View style={styles.overlay} pointerEvents="box-none">
        {/* 左上角状态 */}
        {store.status !== 'ready' && (
          <View style={styles.topLeft}>
            <StatusBadge status={store.status} durationSec={durationSec} />
          </View>
        )}

        {/* GPS 状态（准备状态显示） */}
        {store.status === 'ready' && (
          <View style={styles.topLeft}>
            <View style={styles.gpsBadge}>
              <Ionicons name="locate" size={14} color={GPS_COLOR[gpsQuality]} />
              <Text style={[styles.gpsText, { color: GPS_COLOR[gpsQuality] }]}>
                {GPS_LABEL[gpsQuality]}
              </Text>
            </View>
          </View>
        )}

        {/* 右侧地图控制 */}
        <View style={styles.rightControls}>
          <MapControls onLocate={handleLocate} />
        </View>
      </View>

      {/* 底部面板 */}
      <View style={styles.bottom}>
        {store.status === 'ready' && (
          <ReadyPanel
            onStart={handleStart}
            vehicleName={vehicleNickname ?? '我的座驾'}
            totalDistanceM={vehicleTotalDistanceM}
          />
        )}
        {store.status !== 'ready' && (
          <StatsPanel
            speedKmh={store.currentSpeedKmh}
            avgSpeedKmh={avgSpeed}
            durationSec={durationSec}
            distanceM={store.distanceM}
          />
        )}
        {store.status === 'riding' && <RidingButtons onPause={handlePause} />}
        {store.status === 'paused' && <PausedButtons onResume={handleResume} onFinish={handleFinishConfirm} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  overlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'column' },
  topLeft: { position: 'absolute', top: 56, left: 20 },
  rightControls: { position: 'absolute', top: 56, right: 20 },
  gpsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(8,17,18,0.85)', borderWidth: 1,
    borderColor: Colors.glassBorder, borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  gpsText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: Colors.primary },
  bottom: { backgroundColor: 'transparent' },
});
