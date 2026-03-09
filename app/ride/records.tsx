import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { rideService } from '../../services/rideService';
import { RideCard } from '../../components/ride/RideCard';
import { formatDistance, formatDuration } from '../../utils/formatters';

interface RideRecord {
  id: string;
  status: string;
  distance_m: number;
  duration_sec: number;
  avg_speed_kmh: number;
  vehicle_nickname?: string;
  started_at: string;
}

export default function RideRecordsScreen() {
  const router = useRouter();
  const [rides, setRides] = useState<RideRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    rideService.getRides().then(data => {
      setRides(data.rides);
      setLoading(false);
    });
  }, []);

  const totalDistance = rides.reduce((s, r) => s + r.distance_m, 0);
  const totalDuration = rides.reduce((s, r) => s + r.duration_sec, 0);

  return (
    <View style={styles.container}>
      {/* 标题栏 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>骑行记录</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={rides}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            rides.length > 0 ? (
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{rides.length}</Text>
                  <Text style={styles.summaryLabel}>次骑行</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{formatDistance(totalDistance)}</Text>
                  <Text style={styles.summaryLabel}>总里程</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{formatDuration(totalDuration)}</Text>
                  <Text style={styles.summaryLabel}>总时长</Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="bicycle-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>暂无骑行记录</Text>
              <Text style={styles.emptySubtitle}>出发去骑行吧！</Text>
            </View>
          }
          renderItem={({ item }) => (
            <RideCard
              ride={item}
              onPress={() => router.push(`/ride/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  title: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 17, color: Colors.textPrimary },
  list: { padding: 16, paddingBottom: 40 },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 12,
    marginBottom: 16,
    paddingVertical: 16,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryValue: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 18, color: Colors.primary },
  summaryLabel: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: Colors.textMuted },
  summaryDivider: { width: 1, backgroundColor: Colors.glassBorder },
  empty: { alignItems: 'center', marginTop: 80, gap: 10 },
  emptyTitle: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 17, color: Colors.textSecondary },
  emptySubtitle: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, color: Colors.textMuted },
});
