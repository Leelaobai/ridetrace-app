import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  Modal, FlatList, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { Colors } from '../../constants/colors';
import { GPS_ACCURACY_GOOD, GPS_ACCURACY_WEAK } from '../../constants/config';
import { Linking } from 'react-native';
import { PermissionsAndroid, Platform } from 'react-native';
import { useRideStore } from '../../store/rideStore';
import { useAuthStore } from '../../store/authStore';
import { rideService, isNetworkError } from '../../services/rideService';
import { getMyVehicleList, activateVehicle, type MyVehicleDetail } from '../../services/vehicleService';
import { offlineRidePlugin } from '../../utils/offlineRide';
import { getErrorMessage } from '../../utils/errors';
import { AMapView } from '../../components/map/AMapView';
import { useLocation } from '../../hooks/useLocation';
import { pointCache } from '../../utils/pointCache';
import { wgs84ToGcj02 } from '../../utils/coordTransform';
import { BACKGROUND_LOCATION_TASK } from '../_layout';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

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

// ─── 未登录引导面板 ──────────────────────────────────
function UnauthedPanel({ onLogin }: { onLogin: () => void }) {
  return (
    <View style={unauthStyles.wrap}>
      <View style={unauthStyles.headerRow}>
        <View>
          <Text style={unauthStyles.title}>RideTrace 驾驶舱</Text>
          <Text style={unauthStyles.subtitle}>记录每一段精彩骑行</Text>
        </View>
      </View>
      <View style={unauthStyles.divider} />
      <View style={unauthStyles.featuresRow}>
        <View style={unauthStyles.featureItem}>
          <Ionicons name="navigate" size={16} color={Colors.primary} />
          <Text style={unauthStyles.featureText}>实时轨迹记录</Text>
        </View>
        <View style={unauthStyles.featureItem}>
          <Ionicons name="stats-chart" size={16} color={Colors.primary} />
          <Text style={unauthStyles.featureText}>骑行数据分析</Text>
        </View>
      </View>
      <TouchableOpacity style={unauthStyles.loginBtn} onPress={onLogin} activeOpacity={0.85}>
        <Ionicons name="person" size={20} color="#000" />
        <Text style={unauthStyles.loginBtnText}>登录后开始骑行</Text>
      </TouchableOpacity>
      <Text style={unauthStyles.hint}>登录即可解锁完整骑行功能</Text>
    </View>
  );
}

const unauthStyles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(8,17,18,0.95)',
    borderTopWidth: 1,
    borderColor: `rgba(13,227,242,0.15)`,
    padding: 24,
    gap: 14,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 17, color: Colors.textPrimary },
  subtitle: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 3 },
  divider: { height: 1, backgroundColor: `rgba(13,227,242,0.1)` },
  featuresRow: { flexDirection: 'row', gap: 24 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featureText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: Colors.textSecondary },
  loginBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: 14, height: 56, gap: 10,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 14, elevation: 8,
  },
  loginBtnText: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 18, color: '#000' },
  hint: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
});

// ─── 无座驾引导面板 ──────────────────────────────────
function NoVehiclePanel({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={unauthStyles.wrap}>
      <View style={unauthStyles.headerRow}>
        <View>
          <Text style={unauthStyles.title}>还没有座驾</Text>
          <Text style={unauthStyles.subtitle}>选择一辆座驾，开始记录你的骑行</Text>
        </View>
      </View>
      <View style={unauthStyles.divider} />
      <View style={unauthStyles.featuresRow}>
        <View style={unauthStyles.featureItem}>
          <Ionicons name="bicycle" size={16} color={Colors.primary} />
          <Text style={unauthStyles.featureText}>支持多种车型</Text>
        </View>
        <View style={unauthStyles.featureItem}>
          <Ionicons name="swap-horizontal" size={16} color={Colors.primary} />
          <Text style={unauthStyles.featureText}>随时切换座驾</Text>
        </View>
      </View>
      <TouchableOpacity style={unauthStyles.loginBtn} onPress={onAdd} activeOpacity={0.85}>
        <Ionicons name="bicycle" size={20} color="#000" />
        <Text style={unauthStyles.loginBtnText}>去添加座驾</Text>
      </TouchableOpacity>
      <Text style={unauthStyles.hint}>在"管理座驾"中添加第一辆车，再回来开始骑行</Text>
    </View>
  );
}

// ─── 状态A：准备起骑 底部面板 ─────────────────────────
function ReadyPanel({ onStart, vehicleName, totalDistanceM, onSwitch }: {
  onStart: () => void;
  vehicleName: string;
  totalDistanceM: number;
  onSwitch: () => void;
}) {
  const distKm = (totalDistanceM / 1000).toFixed(0);
  return (
    <View style={panelStyles.wrap}>
      <View style={panelStyles.vehicleRow}>
        <View style={{ flex: 1 }}>
          <Text style={panelStyles.vehicleName}>{vehicleName}</Text>
          <Text style={panelStyles.vehicleMeta}>总里程 {distKm} km · 准备就绪</Text>
        </View>
        <TouchableOpacity style={panelStyles.switchBtn} onPress={onSwitch}>
          <Ionicons name="swap-horizontal" size={14} color={Colors.primary} />
          <Text style={panelStyles.switchBtnText}>切换</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={panelStyles.startBtn} onPress={onStart} activeOpacity={0.85}>
        <Ionicons name="play" size={22} color="#000" />
        <Text style={panelStyles.startBtnText}>开始骑行</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── 座驾选择 Modal ───────────────────────────────────
function VehiclePickerModal({ visible, onClose, onSelect }: {
  visible: boolean;
  onClose: () => void;
  onSelect: (v: MyVehicleDetail) => void;
}) {
  const [vehicles, setVehicles] = useState<MyVehicleDetail[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    getMyVehicleList().then(setVehicles).finally(() => setLoading(false));
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={pickerStyles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={pickerStyles.sheet}>
        <View style={pickerStyles.handle} />
        <Text style={pickerStyles.title}>选择座驾</Text>
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: 32 }} />
        ) : vehicles.length === 0 ? (
          <Text style={pickerStyles.empty}>暂无座驾，请先去"我的 → 管理座驾"添加</Text>
        ) : (
          <FlatList
            data={vehicles}
            keyExtractor={v => v.id}
            style={{ maxHeight: 320 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[pickerStyles.item, item.is_active && pickerStyles.itemActive]}
                onPress={() => onSelect(item)}
                activeOpacity={0.75}
              >
                <Text style={pickerStyles.itemIcon}>{item.model.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={pickerStyles.itemName}>{item.nickname}</Text>
                  <Text style={pickerStyles.itemModel}>{item.model.name}</Text>
                </View>
                {item.is_active && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#0f1f20',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: Colors.glassBorder,
    padding: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.glassBorder,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 17,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  empty: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginVertical: 32,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  itemActive: {
    backgroundColor: 'rgba(13,227,242,0.05)',
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  itemIcon: { fontSize: 24 },
  itemName: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  itemModel: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});

// ─── 数据面板（骑行中 & 暂停共用）────────────────────
function StatsPanel({
  speedKmh, avgSpeedKmh, durationSec, distanceM, elevationGainM,
}: {
  speedKmh: number; avgSpeedKmh: number; durationSec: number; distanceM: number; elevationGainM: number;
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
        <View style={statsStyles.divider} />
        <View style={statsStyles.subItem}>
          <Text style={statsStyles.subValue}>{elevationGainM.toFixed(0)}</Text>
          <Text style={statsStyles.subLabel}>爬升 M</Text>
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
  switchBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: Colors.primary + '88', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  switchBtnText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: Colors.primary },
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
  const { token, vehicleId, vehicleNickname, vehicleTotalDistanceM } = useAuthStore();
  const isAuthed = !!token;
  const [tick, setTick] = useState(0);
  const [avgSpeed, setAvgSpeed] = useState(0);
  const [locatePoint, setLocatePoint] = useState<{ lat: number; lng: number; ts: number } | null>(null);
  const [initialLocation, setInitialLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsQuality, setGpsQuality] = useState<GpsQuality>('none');
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const { setVehicle } = useAuthStore();
  // 记录前台 watcher 最后写入的 seq，轮询时用于跳过已入库的点
  const lastFgSeqRef = useRef<number>(0);
  // onRawLocation：骑行中收到原始 GPS（已转 GCJ-02），直接更新地图用户点，无平滑滞后
  const { startTracking, stopTracking } = useLocation(
    (raw) => setLiveLocation(raw),
    (seq) => { lastFgSeqRef.current = Math.max(lastFgSeqRef.current, seq); },
  );

  // 骑行中（含暂停）保持屏幕常亮，结束后恢复系统默认熄屏策略
  useEffect(() => {
    const tag = 'cockpit-ride';
    if (store.status !== 'ready') {
      activateKeepAwakeAsync(tag);
    } else {
      deactivateKeepAwake(tag);
    }
    return () => {
      deactivateKeepAwake(tag);
    };
  }, [store.status]);

  const handleVehicleSelect = async (v: MyVehicleDetail) => {
    setShowVehiclePicker(false);
    try {
      const updated = await activateVehicle(v.id);
      setVehicle(updated.id, updated.nickname, updated.total_distance_m);
    } catch (e) {
      Alert.alert('切换失败', getErrorMessage(e, '请稍后重试'));
    }
  };

  const handleLocate = async () => {
    console.log('[Locate] ── 按下定位按钮 ──────────────────');
    console.log('[Locate] gpsQuality:', gpsQuality);
    console.log('[Locate] initialLocation:', initialLocation
      ? `${initialLocation.lat.toFixed(6)}, ${initialLocation.lng.toFixed(6)}`
      : 'null');
    console.log('[Locate] trackPoints count:', store.trackPoints.length);

    const last = store.trackPoints[store.trackPoints.length - 1];
    if (last) {
      console.log('[Locate] → 使用 trackPoints 最新点:', `${last.lat.toFixed(6)}, ${last.lng.toFixed(6)}`);
      setLocatePoint({ lat: last.lat, lng: last.lng, ts: Date.now() });
      return;
    }
    if (initialLocation) {
      console.log('[Locate] → 使用 initialLocation（watcher）');
      setLocatePoint({ ...initialLocation, ts: Date.now() });
      return;
    }
    console.log('[Locate] → initialLocation 为空，调用 getCurrentPositionAsync...');
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      console.log('[Locate] getCurrentPositionAsync 返回:',
        `lat=${loc.coords.latitude.toFixed(6)}`,
        `lng=${loc.coords.longitude.toFixed(6)}`,
        `accuracy=${loc.coords.accuracy?.toFixed(1)}m`,
        `age=${((Date.now() - loc.timestamp) / 1000).toFixed(1)}s`,
      );
      const point = wgs84ToGcj02(loc.coords.latitude, loc.coords.longitude);
      setInitialLocation(point);
      setLocatePoint({ ...point, ts: Date.now() });
    } catch (e) {
      console.warn('[Locate] getCurrentPositionAsync 失败:', e);
    }
  };

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        // 缓存位置：2 分钟内直接用，给用户一个初始位置，watcher 启动后自动更新
        const cached = await Location.getLastKnownPositionAsync();
        if (cached) {
          const ageMs = Date.now() - cached.timestamp;
          if (ageMs < 120_000) {
            setInitialLocation(wgs84ToGcj02(cached.coords.latitude, cached.coords.longitude));
            setGpsQuality(gpsQualityFromAccuracy(cached.coords.accuracy));
          }
        }

        // watchPositionAsync 直接启动高精度持续定位，第一个回调即为当前位置
        console.log('[GPS] 启动 watchPositionAsync (BestForNavigation, 1s/2m)');
        sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 0,
          },
          (pos) => {
            const { latitude, longitude, accuracy, altitude, speed } = pos.coords;
            console.log(`[GPS] watcher: lat=${latitude.toFixed(6)} lng=${longitude.toFixed(6)} acc=${accuracy?.toFixed(1)}m alt=${altitude?.toFixed(1)}m spd=${((speed ?? 0) * 3.6).toFixed(1)}km/h`);
            setInitialLocation(wgs84ToGcj02(latitude, longitude));
            setGpsQuality(gpsQualityFromAccuracy(accuracy));
          },
        );
      } catch (e) {
        console.warn('[GPS] watchPositionAsync 启动失败:', e);
      }
    })();
    return () => { sub?.remove(); };
  }, []);

  // 每秒刷新计时器 + 均速计算
  useEffect(() => {
    const t = setInterval(() => {
      setTick(v => v + 1);
      // 用 getState() 读最新值，避免闭包捕获旧 store 导致均速永远为 0
      const { distanceM, ridingDurationSec } = useRideStore.getState();
      const sec = ridingDurationSec();
      if (sec > 0 && distanceM > 0) {
        setAvgSpeed((distanceM / 1000) / (sec / 3600));
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // 骑行中每 3s 从 pointCache 同步后台采集的新点到 store
  // 前台 watcher 存活时 lastFgSeqRef 持续更新，轮询不会重复入库；
  // 前台 watcher 被系统杀死后，轮询接管，确保后台任务数据实时显示在地图上。
  useEffect(() => {
    if (store.status === 'ready') {
      lastFgSeqRef.current = 0;
      return;
    }
    const interval = setInterval(async () => {
      const all = await pointCache.getAll();
      const newPoints = all.filter(p => (p.seq ?? 0) > lastFgSeqRef.current);
      if (newPoints.length === 0) return;
      for (const p of newPoints) {
        store.addPoint(p);
      }
      const last = newPoints[newPoints.length - 1];
      lastFgSeqRef.current = last.seq ?? lastFgSeqRef.current;
      setLiveLocation({ lat: last.lat, lng: last.lng });
    }, 3000);
    return () => clearInterval(interval);
  }, [store.status]);

  // 检测是否在 Expo Go 中运行（Expo Go 不支持后台位置任务）
  const isExpoGo = Constants.appOwnership === 'expo';

  // 启动后台位置任务（foregroundService 会在通知栏显示"RideTrace 骑行中"常驻条）
  const startBackgroundTracking = async () => {
    if (isExpoGo) return;
    try {
      const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (isRunning) return;
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 3000,
        foregroundService: {
          notificationTitle: 'RideTrace 骑行中',
          notificationBody: '正在记录您的骑行轨迹，切换 App 或熄屏后仍持续记录',
          notificationColor: '#0de3f2',
        },
      });
    } catch (e) {
      // 显示实际错误，便于排查（后续确认原因后可改回静默）
      Alert.alert('后台定位启动失败', String(e));
    }
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

    // Android 13+ 需要通知权限才能显示前台服务常驻通知条
    if (Platform.OS === 'android' && (Platform.Version as number) >= 33) {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }

    // 申请后台位置权限，用于通知栏常驻 + 熄屏/切换 App 时持续记录
    if (!isExpoGo) {
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus !== 'granted') {
        await new Promise<void>(resolve => {
          Alert.alert(
            '开启后台定位',
            '将位置权限改为"始终允许"后，骑行时通知栏会显示骑行状态，熄屏或切换 App 也能持续记录轨迹。',
            [
              { text: '暂跳过', onPress: () => resolve() },
              { text: '去设置', onPress: () => { Linking.openSettings(); resolve(); } },
            ],
          );
        });
      }
    }

    const lat = initialLocation?.lat ?? 31.2304;
    const lng = initialLocation?.lng ?? 121.4737;
    // 清除上次骑行残留的 pointCache（防止旧点混入）
    await pointCache.clear();
    try {
      const res = await rideService.startRide(vehicleId, lat, lng);
      store.startRide(res.id, vehicleId, false);
      await startTracking();
      await startBackgroundTracking();
    } catch (e) {
      // 网络错误且插件启用 → 进入离线模式
      if (offlineRidePlugin.isEnabled && isNetworkError(e)) {
        const localId = Math.random().toString(36).slice(2) + Date.now().toString(36);
        store.startRide(localId, vehicleId, true);
        await startTracking();
        await startBackgroundTracking(); // 后台任务只写 pointCache，不调 API，离线模式同样需要
        Alert.alert('已进入离线模式', '网络不可用，骑行数据将保存在本地，回家后自动同步。');
      } else {
        Alert.alert('开始失败', getErrorMessage(e, '请检查网络连接'));
      }
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
          const rideId = store.rideId;
          if (!rideId) return;

          if (store.isOffline) {
            // ── 离线结束：保存到本地，等待同步 ──
            // pointCache 包含前台 + 后台所有轨迹点（含息屏期间后台采集的点）
            const allPoints = await pointCache.getAll();
            const finishedAt = new Date();
            const durationSec = store.ridingDurationSec();
            await offlineRidePlugin.save({
              localId: rideId,
              vehicleId: store.vehicleId!,
              startLat: initialLocation?.lat ?? 0,
              startLng: initialLocation?.lng ?? 0,
              startedAt: store.startTime?.toISOString() ?? new Date().toISOString(),
              finishedAt: finishedAt.toISOString(),
              durationSec,
              distanceM: store.distanceM,
              maxSpeedKmh: store.maxSpeedKmh,
              points: allPoints.map(p => ({
                lat: p.lat,
                lng: p.lng,
                speed: p.speed,
                altitude: p.altitude,
                accuracy: p.accuracy,
                recorded_at: p.recorded_at,
                seq: p.seq,
              })),
            });
            await stopBackgroundTracking();
            await pointCache.clear();
            store.finishRide();
            Alert.alert(
              '骑行已保存',
              `已离线保存 ${(store.distanceM / 1000).toFixed(2)} km 的骑行记录，连接网络后将自动同步。`,
            );
          } else {
            // ── 在线结束：上传前台点 + 后台采集点，再结束 ──
            await stopBackgroundTracking();
            await store.flushPoints();           // 上传前台 pendingPoints
            const bgPoints = await pointCache.getAll();
            if (bgPoints.length > 0) {
              // 后台任务采集的点（含息屏期间），服务端 ON CONFLICT DO NOTHING 去重
              await rideService.batchUploadPoints(rideId, bgPoints);
            }
            await pointCache.clear();
            await rideService.finishRide(rideId);
            store.finishRide();
            router.push(`/ride/${rideId}`);
          }
        },
      },
    ]);
  };

  const durationSec = store.ridingDurationSec();

  // 骑行中：用 liveLocation（原始 GPS，无平滑滞后）驱动地图用户点，轨迹线仍用平滑后的 trackPoints
  // 非骑行：用 initialLocation（独立 watcher 采集的实时位置）
  const displayLocation = store.status !== 'ready'
    ? (liveLocation ?? initialLocation)
    : initialLocation;
  // 骑行中地图跟轨迹（updateTrack 负责 setCenter），非骑行时地图跟用户位置
  const followUser = store.status === 'ready';

  return (
    <View style={styles.container}>
      {/* 高德地图层 */}
      <AMapView trackPoints={store.trackPoints} locatePoint={locatePoint} userLocation={displayLocation} followUser={followUser} style={{ flex: 1 }} />

      {/* 悬浮 UI 层 */}
      <View style={styles.overlay} pointerEvents="box-none">
        {/* 左上角：始终显示 GPS 信号强度 */}
        <View style={styles.topLeft}>
          <View style={styles.gpsBadge}>
            <Ionicons name="locate" size={14} color={GPS_COLOR[gpsQuality]} />
            <Text style={[styles.gpsText, { color: GPS_COLOR[gpsQuality] }]}>
              {GPS_LABEL[gpsQuality]}
            </Text>
          </View>
        </View>

        {/* 右侧地图控制 */}
        <View style={styles.rightControls}>
          <MapControls onLocate={handleLocate} />
        </View>
      </View>

      {/* 底部面板 */}
      <View style={styles.bottom}>
        {!isAuthed && (
          <UnauthedPanel onLogin={() => router.push('/(tabs)/login')} />
        )}
        {isAuthed && !vehicleId && (
          <NoVehiclePanel onAdd={() => router.push('/vehicle/manage')} />
        )}
        {isAuthed && !!vehicleId && store.status === 'ready' && (
          <ReadyPanel
            onStart={handleStart}
            vehicleName={vehicleNickname ?? '我的座驾'}
            totalDistanceM={vehicleTotalDistanceM}
            onSwitch={() => setShowVehiclePicker(true)}
          />
        )}
        {isAuthed && !!vehicleId && store.status !== 'ready' && (
          <StatsPanel
            speedKmh={store.currentSpeedKmh}
            avgSpeedKmh={avgSpeed}
            durationSec={durationSec}
            distanceM={store.distanceM}
            elevationGainM={store.elevationGainM}
          />
        )}
        {isAuthed && !!vehicleId && store.status === 'riding' && <RidingButtons onPause={handlePause} />}
        {isAuthed && !!vehicleId && store.status === 'paused' && <PausedButtons onResume={handleResume} onFinish={handleFinishConfirm} />}
      </View>

      <VehiclePickerModal
        visible={showVehiclePicker}
        onClose={() => setShowVehiclePicker(false)}
        onSelect={handleVehicleSelect}
      />
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
