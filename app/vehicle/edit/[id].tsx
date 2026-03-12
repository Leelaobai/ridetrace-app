import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { VEHICLE_NICKNAME_MAX_LEN } from '../../../constants/vehicle';
import { useAuthStore } from '../../../store/authStore';
import { updateVehicleNickname } from '../../../services/vehicleService';
import { getErrorMessage } from '../../../utils/errors';

export default function VehicleEditScreen() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { id, currentNickname, vehicleId: activeVehicleId } = useLocalSearchParams<{
    id: string;
    currentNickname: string;
    vehicleId: string;
  }>();
  const { vehicleId, setVehicle, vehicleTotalDistanceM } = useAuthStore();
  const [nickname, setNickname] = useState(currentNickname ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nickname.trim() || !id) return;
    setSaving(true);
    try {
      await updateVehicleNickname(id, nickname.trim());
      // 如果编辑的是当前活跃车辆，更新 authStore
      if (vehicleId === id) {
        setVehicle(id, nickname.trim(), vehicleTotalDistanceM);
      }
      router.back();
    } catch (e) {
      Alert.alert('保存失败', getErrorMessage(e, '请稍后重试'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: top }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>编辑昵称</Text>
          <View style={{ width: 30 }} />
        </View>

        <View style={styles.content}>
          <Text style={styles.label}>座驾昵称</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={t => {
                if ([...t].length <= VEHICLE_NICKNAME_MAX_LEN) setNickname(t);
              }}
              placeholder="给你的座驾起个名字"
              placeholderTextColor={Colors.textMuted}
              autoFocus
              maxLength={VEHICLE_NICKNAME_MAX_LEN * 2}
            />
            <Text style={styles.counter}>
              {[...nickname].length}/{VEHICLE_NICKNAME_MAX_LEN}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveBtn, !nickname.trim() && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!nickname.trim() || saving}
          >
            {saving ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={[styles.saveBtnText, !nickname.trim() && styles.saveBtnTextDisabled]}>
                保存
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
  content: { padding: 24, gap: 10 },
  label: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 13, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.glassBg, borderWidth: 1,
    borderColor: Colors.glassBorder, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  input: {
    flex: 1, fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 16, color: Colors.textPrimary,
  },
  counter: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12, color: Colors.textMuted,
  },
  footer: { paddingHorizontal: 24, paddingBottom: 24, paddingTop: 12 },
  saveBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: 14, height: 54,
  },
  saveBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.08)' },
  saveBtnText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 16, color: '#000',
  },
  saveBtnTextDisabled: { color: Colors.textMuted },
});
