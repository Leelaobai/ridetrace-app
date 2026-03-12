import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { useRideStore } from '../../store/rideStore';
import { RIDE_STATUS } from '../../constants/ride';
import {
  getMyVehicleList, activateVehicle, deleteVehicle, type MyVehicleDetail,
} from '../../services/vehicleService';
import { getErrorMessage } from '../../utils/errors';

export default function VehicleManageScreen() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { setVehicle } = useAuthStore();
  const rideStatus = useRideStore(s => s.status);
  const isRiding = rideStatus !== RIDE_STATUS.READY;

  const [vehicles, setVehicles] = useState<MyVehicleDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getMyVehicleList();
      setVehicles(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadList(); }, [loadList]));

  const handleActivate = async (v: MyVehicleDetail) => {
    try {
      const updated = await activateVehicle(v.id);
      setVehicle(updated.id, updated.nickname, updated.total_distance_m);
      await loadList();
    } catch (e) {
      Alert.alert('切换失败', getErrorMessage(e, '请稍后重试'));
    }
  };

  const handleDelete = (v: MyVehicleDetail) => {
    Alert.alert('删除座驾', `确定删除「${v.nickname}」吗？此操作不可撤销。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive', onPress: async () => {
          try {
            await deleteVehicle(v.id);
            await loadList();
          } catch (e) {
            Alert.alert('删除失败', getErrorMessage(e, '请稍后重试'));
          }
        },
      },
    ]);
  };

  const active = vehicles.find(v => v.is_active);
  const others = vehicles.filter(v => !v.is_active);

  const renderCard = (v: MyVehicleDetail, showActions: boolean) => (
    <View key={v.id} style={[styles.card, v.is_active && styles.cardActive]}>
      <View style={styles.cardIcon}>
        <Text style={styles.iconText}>{v.model.icon}</Text>
      </View>
      <View style={styles.cardInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.nickname} numberOfLines={1}>{v.nickname}</Text>
          {v.is_active && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>使用中</Text>
            </View>
          )}
        </View>
        <Text style={styles.modelName}>{v.model.name}</Text>
        <Text style={styles.distance}>
          累计 {(v.total_distance_m / 1000).toFixed(1)} km
        </Text>
      </View>
      {showActions && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, isRiding && styles.actionBtnDisabled]}
            disabled={isRiding}
            onPress={() => handleActivate(v)}
          >
            <Text style={[styles.actionBtnText, isRiding && styles.actionBtnTextDisabled]}>切换</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn, isRiding && styles.actionBtnDisabled]}
            disabled={isRiding}
            onPress={() => handleDelete(v)}
          >
            <Text style={[styles.actionBtnText, styles.deleteBtnText, isRiding && styles.actionBtnTextDisabled]}>删除</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>我的座驾</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <View style={styles.content}>
              {/* 当前座驾 */}
              {active && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>当前座驾</Text>
                  {renderCard(active, false)}
                </View>
              )}

              {/* 其他座驾 */}
              {others.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>其他座驾</Text>
                  {others.map(v => renderCard(v, true))}
                </View>
              )}

              {/* 添加新座驾按钮 */}
              <TouchableOpacity
                style={styles.addNewBtn}
                onPress={() => router.push('/vehicle/add')}
              >
                <Ionicons name="add" size={20} color={Colors.primary} />
                <Text style={styles.addNewText}>添加新座驾</Text>
              </TouchableOpacity>

              {isRiding && (
                <Text style={styles.ridingHint}>骑行进行中，无法切换或删除座驾</Text>
              )}
            </View>
          }
          keyExtractor={() => 'list'}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.glassBorder,
  },
  backBtn: { padding: 4 },
  title: {
    flex: 1, textAlign: 'center',
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 17, color: Colors.textPrimary,
  },
  addBtn: { padding: 4 },
  addBtnText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 15, color: Colors.primary,
  },
  content: { padding: 16, gap: 20 },
  section: { gap: 10 },
  sectionTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 13, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.glassBg,
    borderWidth: 1, borderColor: Colors.glassBorder,
    borderRadius: 14, padding: 14, gap: 12,
  },
  cardActive: {
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
    backgroundColor: 'rgba(13, 227, 242, 0.04)',
  },
  cardIcon: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: Colors.glassBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  iconText: { fontSize: 24 },
  cardInfo: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nickname: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 15, color: Colors.textPrimary,
    flexShrink: 1,
  },
  activeBadge: {
    borderWidth: 1, borderColor: Colors.primary,
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  activeBadgeText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 11, color: Colors.primary,
  },
  modelName: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12, color: Colors.textSecondary,
  },
  distance: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12, color: Colors.textMuted,
  },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    borderWidth: 1, borderColor: Colors.glassBorder,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  actionBtnDisabled: { opacity: 0.35 },
  actionBtnText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13, color: Colors.textSecondary,
  },
  actionBtnTextDisabled: { color: Colors.textMuted },
  deleteBtn: { borderColor: Colors.danger + '66' },
  deleteBtnText: { color: Colors.danger },
  addNewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.primary + '55',
    borderStyle: 'dashed', borderRadius: 14,
    paddingVertical: 16, gap: 8,
  },
  addNewText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 15, color: Colors.primary,
  },
  ridingHint: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12, color: Colors.warning,
    textAlign: 'center',
  },
});
