import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { getVehicleModels, selectVehicle, type VehicleModel } from '../../services/vehicleService';

const CATEGORY_LABEL: Record<string, string> = {
  road: '公路车',
  mountain: '山地车',
  city: '城市车',
  folding: '折叠车',
  ebike: '电助力车',
};

export default function VehicleSelectScreen() {
  const router = useRouter();
  const { setHasVehicle } = useAuthStore();

  const [vehicles, setVehicles] = useState<VehicleModel[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    getVehicleModels().then(setVehicles).finally(() => setLoading(false));
  }, []);

  const handleConfirm = async () => {
    if (!selected) return;
    const vehicle = vehicles.find(v => v.id === selected)!;
    setConfirming(true);
    try {
      await selectVehicle(selected, `我的${CATEGORY_LABEL[vehicle.category] ?? vehicle.name}`);
      setHasVehicle(true);
      router.replace('/(tabs)/cockpit');
    } finally {
      setConfirming(false);
    }
  };

  const renderCard = ({ item }: { item: VehicleModel }) => {
    const isSelected = selected === item.id;
    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.cardSelected]}
        onPress={() => setSelected(item.id)}
        activeOpacity={0.8}
      >
        {/* 图标区 */}
        <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
          <Text style={styles.icon}>{item.icon}</Text>
        </View>

        {/* 信息区 */}
        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, isSelected && styles.cardNameSelected]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.mileageRow}>
            <Ionicons name="speedometer-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.mileageText}>
              累计 {item.mileage_km.toLocaleString()} km
            </Text>
          </View>
          <Text style={styles.categoryTag}>
            {CATEGORY_LABEL[item.category] ?? item.category}
          </Text>
        </View>

        {/* 选中态 */}
        <View style={styles.checkWrap}>
          {isSelected ? (
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={16} color="#000" />
            </View>
          ) : (
            <View style={styles.selectBtn}>
              <Text style={styles.selectBtnText}>选择</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 标题 */}
      <View style={styles.header}>
        <Text style={styles.title}>选择座驾</Text>
        <Text style={styles.subtitle}>从车库中选择本次骑行的车辆</Text>
      </View>

      {/* 列表 */}
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={item => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* 底部确认按钮 */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmBtn, !selected && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!selected || confirming}
        >
          {confirming ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Text style={[styles.confirmBtnText, !selected && styles.confirmBtnTextDisabled]}>
                确认选择
              </Text>
              {selected && <Ionicons name="arrow-forward" size={18} color="#000" />}
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.hintText}>选择后可在"我的"中随时更改</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  // Header
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
  },
  title: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 28,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },

  // List
  list: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 12,
  },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  cardSelected: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(13, 227, 242, 0.06)',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapSelected: {
    backgroundColor: 'rgba(13, 227, 242, 0.1)',
    borderColor: Colors.primary,
  },
  icon: {
    fontSize: 26,
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardName: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 15,
    color: Colors.textSecondary,
  },
  cardNameSelected: {
    color: Colors.textPrimary,
  },
  mileageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mileageText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  categoryTag: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 11,
    color: Colors.primary,
    opacity: 0.8,
  },

  // Check / Select
  checkWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  selectBtn: {
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  selectBtnText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 10,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 54,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  confirmBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmBtnText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 16,
    color: '#000',
  },
  confirmBtnTextDisabled: {
    color: Colors.textMuted,
  },
  hintText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
