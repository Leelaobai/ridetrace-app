import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, TextInput, ActivityIndicator,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { VEHICLE_CATEGORY_LABEL, VEHICLE_NICKNAME_PREFIX, VEHICLE_NICKNAME_MAX_LEN } from '../../constants/vehicle';
import { useAuthStore } from '../../store/authStore';
import { getVehicleModels, selectVehicle, getMyVehicle, type VehicleModel } from '../../services/vehicleService';
import { getErrorMessage } from '../../utils/errors';

export default function VehicleAddScreen() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { setVehicle } = useAuthStore();

  const [vehicles, setVehicles] = useState<VehicleModel[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    getVehicleModels().then(setVehicles).finally(() => setLoading(false));
  }, []);

  const selectedModel = vehicles.find(v => v.id === selected);

  const handleSelect = (id: string) => {
    const model = vehicles.find(v => v.id === id);
    setSelected(id);
    if (model) {
      setNickname(VEHICLE_NICKNAME_PREFIX + (VEHICLE_CATEGORY_LABEL[model.category] ?? model.name));
    }
  };

  const handleConfirm = async () => {
    if (!selected || !nickname.trim()) return;
    setConfirming(true);
    try {
      await selectVehicle(selected, nickname.trim());
      const mine = await getMyVehicle();
      setVehicle(mine.id, mine.nickname, mine.total_distance_m);
      router.back();
    } catch (e) {
      Alert.alert('添加失败', getErrorMessage(e, '请稍后重试'));
    } finally {
      setConfirming(false);
    }
  };

  const renderCard = ({ item }: { item: VehicleModel }) => {
    const isSelected = selected === item.id;
    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.cardSelected]}
        onPress={() => handleSelect(item.id)}
        activeOpacity={0.8}
      >
        <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
          <Text style={styles.icon}>{item.icon}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, isSelected && styles.cardNameSelected]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.categoryTag}>
            {VEHICLE_CATEGORY_LABEL[item.category] ?? item.category}
          </Text>
        </View>
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
    <View style={[styles.container, { paddingTop: top }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>添加座驾</Text>
          <View style={{ width: 30 }} />
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} />
        ) : (
          <FlatList
            data={vehicles}
            keyExtractor={item => item.id}
            renderItem={renderCard}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <Text style={styles.sectionLabel}>选择车型</Text>
            }
            ListFooterComponent={
              <View style={styles.nicknameSection}>
                <Text style={styles.sectionLabel}>座驾昵称</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.input}
                    value={nickname}
                    onChangeText={t => {
                      if ([...t].length <= VEHICLE_NICKNAME_MAX_LEN) setNickname(t);
                    }}
                    placeholder="给你的座驾起个名字"
                    placeholderTextColor={Colors.textMuted}
                    maxLength={VEHICLE_NICKNAME_MAX_LEN * 2}
                  />
                  <Text style={styles.counter}>
                    {[...nickname].length}/{VEHICLE_NICKNAME_MAX_LEN}
                  </Text>
                </View>

                {/* 预览卡片 */}
                {selectedModel && (
                  <View style={styles.previewCard}>
                    <Text style={styles.previewIcon}>{selectedModel.icon}</Text>
                    <View>
                      <Text style={styles.previewNickname}>{nickname || '未命名'}</Text>
                      <Text style={styles.previewModel}>{selectedModel.name}</Text>
                    </View>
                  </View>
                )}
              </View>
            }
          />
        )}

        {/* 底部确认 */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.confirmBtn, (!selected || !nickname.trim()) && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={!selected || !nickname.trim() || confirming}
          >
            {confirming ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={[styles.confirmBtnText, (!selected || !nickname.trim()) && styles.confirmBtnTextDisabled]}>
                确认添加
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  list: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  sectionLabel: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 13, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 8, marginTop: 16,
  },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.glassBg, borderWidth: 1,
    borderColor: Colors.glassBorder, borderRadius: 14,
    padding: 14, gap: 12,
  },
  cardSelected: {
    borderColor: Colors.primary, borderWidth: 2,
    backgroundColor: 'rgba(13, 227, 242, 0.06)',
  },
  iconWrap: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: Colors.glassBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrapSelected: {
    backgroundColor: 'rgba(13, 227, 242, 0.1)',
    borderColor: Colors.primary,
  },
  icon: { fontSize: 24 },
  cardInfo: { flex: 1, gap: 3 },
  cardName: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 15, color: Colors.textSecondary,
  },
  cardNameSelected: { color: Colors.textPrimary },
  categoryTag: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 11, color: Colors.primary, opacity: 0.8,
  },
  checkWrap: { alignItems: 'center', justifyContent: 'center' },
  checkCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  selectBtn: {
    borderWidth: 1, borderColor: Colors.glassBorder,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  selectBtnText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12, color: Colors.textMuted,
  },
  nicknameSection: { paddingHorizontal: 0, gap: 0 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.glassBg, borderWidth: 1,
    borderColor: Colors.glassBorder, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  input: {
    flex: 1, fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 15, color: Colors.textPrimary,
  },
  counter: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12, color: Colors.textMuted,
  },
  previewCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(13, 227, 242, 0.04)',
    borderWidth: 1, borderColor: Colors.primary + '44',
    borderRadius: 12, padding: 14, marginTop: 12,
  },
  previewIcon: { fontSize: 28 },
  previewNickname: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 15, color: Colors.textPrimary,
  },
  previewModel: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12, color: Colors.textSecondary, marginTop: 2,
  },
  footer: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 12 },
  confirmBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: 14, height: 54,
  },
  confirmBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  confirmBtnText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 16, color: '#000',
  },
  confirmBtnTextDisabled: { color: Colors.textMuted },
});
