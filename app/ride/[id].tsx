import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { rideService } from '../../services/rideService';
import { StaticTrackMap } from '../../components/map/StaticTrackMap';
import { StatsGrid } from '../../components/ride/StatsGrid';
import { formatDistance, formatDuration, formatSpeed, formatDate, formatTime } from '../../utils/formatters';

interface RideDetail {
  id: string;
  status: string;
  distance_m: number;
  duration_sec: number;
  avg_speed_kmh: number;
  max_speed_kmh: number;
  vehicle_nickname?: string;
  started_at: string;
  finished_at?: string;
  points: { lat: number; lng: number; altitude?: number }[];
}

function calcElevationGain(points: { altitude?: number }[]): number {
  let gain = 0;
  let lastAlt: number | null = null;
  for (const p of points) {
    if (p.altitude != null && p.altitude > 0) {
      if (lastAlt != null && p.altitude - lastAlt > 1) {
        gain += p.altitude - lastAlt;
      }
      lastAlt = p.altitude;
    }
  }
  return gain;
}

export default function RideDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const [ride, setRide] = useState<RideDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    rideService.getRideDetail(id).then(data => {
      setRide(data as RideDetail);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!ride) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: Colors.textSecondary }}>记录不存在</Text>
      </View>
    );
  }

  const elevationGainM = calcElevationGain(ride.points);

  const statsItems = [
    { label: '总距离', value: formatDistance(ride.distance_m) },
    { label: '总时长', value: formatDuration(ride.duration_sec) },
    { label: '均速', value: formatSpeed(ride.avg_speed_kmh) },
    { label: '最大速度', value: formatSpeed(ride.max_speed_kmh) },
    { label: '爬升', value: `${Math.round(elevationGainM)} m` },
    { label: '状态', value: '已完成' },
  ];

  return (
    <View style={styles.container}>
      {/* 地图（上半屏） */}
      <View style={styles.mapArea}>
        <StaticTrackMap trackPoints={ride.points} style={styles.map} />

        {/* 返回按钮悬浮在地图上 */}
        <TouchableOpacity style={[styles.backBtn, { top: top + 12 }]} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* 详情区（下半屏，可滚动） */}
      <ScrollView style={styles.detail} contentContainerStyle={styles.detailContent}>
        {/* 时间信息 */}
        <View style={styles.timeRow}>
          <View>
            <Text style={styles.dateText}>{formatDate(ride.started_at)}</Text>
            <Text style={styles.timeText}>
              {formatTime(ride.started_at)}
              {ride.finished_at ? ` — ${formatTime(ride.finished_at)}` : ''}
            </Text>
          </View>
          {ride.vehicle_nickname && (
            <View style={styles.vehicleBadge}>
              <Ionicons name="bicycle-outline" size={13} color={Colors.primary} />
              <Text style={styles.vehicleText}>{ride.vehicle_nickname}</Text>
            </View>
          )}
        </View>

        {/* 统计数据格 */}
        <StatsGrid items={statsItems} />

        {/* 生成路书 */}
        <TouchableOpacity
          style={styles.generateRouteBtn}
          onPress={() => router.push(`/route/create?rideId=${id}`)}
        >
          <Ionicons name="map-outline" size={18} color={Colors.primary} />
          <Text style={styles.generateRouteBtnText}>生成路书</Text>
        </TouchableOpacity>

        {/* 按钮区 */}
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace('/(tabs)/cockpit')}
        >
          <Ionicons name="bicycle" size={18} color="#000" />
          <Text style={styles.homeBtnText}>返回首页</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  loading: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  mapArea: { height: '45%', position: 'relative' },
  map: { flex: 1 },
  backBtn: {
    position: 'absolute',
    top: 0,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(8,17,18,0.85)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detail: { flex: 1 },
  detailContent: { padding: 20, gap: 16 },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  dateText: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16, color: Colors.textPrimary },
  timeText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 3 },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: `${Colors.primary}44`,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  vehicleText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: Colors.primary },
  generateRouteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: Colors.primary + '55', borderRadius: 12, paddingVertical: 14,
    backgroundColor: Colors.primary + '11',
  },
  generateRouteBtnText: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15, color: Colors.primary },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 52,
    gap: 8,
    marginTop: 8,
  },
  homeBtnText: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16, color: '#000' },
});
