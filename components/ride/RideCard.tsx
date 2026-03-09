import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { formatDistance, formatDuration, formatSpeed, formatDate, formatTime } from '../../utils/formatters';

interface RideRecord {
  id: string;
  status: string;
  distance_m: number;
  duration_sec: number;
  avg_speed_kmh: number;
  vehicle_nickname?: string;
  started_at: string;
}

interface Props {
  ride: RideRecord;
  onPress: () => void;
}

export function RideCard({ ride, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* 顶部：日期 + 座驾 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.dateText}>
            {formatDate(ride.started_at)} {formatTime(ride.started_at)}
          </Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>已完成</Text>
        </View>
      </View>

      {ride.vehicle_nickname && (
        <View style={styles.vehicleRow}>
          <Ionicons name="bicycle-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.vehicleText}>{ride.vehicle_nickname}</Text>
        </View>
      )}

      {/* 分割线 */}
      <View style={styles.divider} />

      {/* 数据行 */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatDistance(ride.distance_m)}</Text>
          <Text style={styles.statLabel}>距离</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatDuration(ride.duration_sec)}</Text>
          <Text style={styles.statLabel}>时长</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatSpeed(ride.avg_speed_kmh)}</Text>
          <Text style={styles.statLabel}>均速</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: Colors.textSecondary },
  statusBadge: {
    borderWidth: 1,
    borderColor: `${Colors.success}66`,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  statusText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11, color: Colors.success },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  vehicleText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: Colors.textMuted },
  divider: { height: 1, backgroundColor: Colors.glassBorder },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 16, color: Colors.textPrimary },
  statLabel: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11, color: Colors.textMuted },
  statDivider: { width: 1, height: 28, backgroundColor: Colors.glassBorder },
});
