import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { AMAP_REST_KEY } from '../../constants/config';
import { communityService, type Difficulty, type SurfaceType, type Visibility } from '../../services/communityService';
import { rideService } from '../../services/rideService';
import { formatDate } from '../../utils/formatters';
import { getErrorMessage } from '../../utils/errors';

const DIFFICULTY_OPTIONS: { key: Difficulty; label: string }[] = [
  { key: 'easy', label: '简单' },
  { key: 'medium', label: '中等' },
  { key: 'hard', label: '困难' },
];
const SURFACE_OPTIONS: { key: SurfaceType; label: string }[] = [
  { key: 'road', label: '公路' },
  { key: 'mountain', label: '山地' },
  { key: 'city', label: '城市' },
  { key: 'mixed', label: '混合' },
];
const VISIBILITY_OPTIONS: { key: Visibility; label: string }[] = [
  { key: 'public', label: '公开' },
  { key: 'private', label: '仅自己' },
];
const TAG_OPTIONS = ['风景', '爬坡', '适合新手', '夜骑', '打卡', '长途'];

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_REST_KEY}&location=${lng},${lat}&radius=1000&extensions=base`;
    const res = await fetch(url);
    const data = await res.json();
    const city = data?.regeocode?.addressComponent?.city;
    if (Array.isArray(city)) return data?.regeocode?.addressComponent?.province ?? '';
    return city || data?.regeocode?.addressComponent?.province || '';
  } catch { return ''; }
}

export default function CreateRouteScreen() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();

  const [loadingRide, setLoadingRide] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [region, setRegion] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [surface, setSurface] = useState<SurfaceType>('road');
  const [tags, setTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!rideId) { setLoadingRide(false); return; }
    rideService.getRideDetail(rideId)
      .then(async (ride: any) => {
        const startedAt: string = ride.started_at ?? '';
        if (startedAt) {
          const d = new Date(startedAt);
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          setTitle(`${dateStr} 骑行`);
        }
        const points = ride.points ?? ride.track_points ?? [];
        if (points.length > 0) {
          const city = await reverseGeocode(points[0].lat, points[0].lng);
          if (city) setRegion(city);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingRide(false));
  }, [rideId]);

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = async () => {
    if (!title.trim()) { Alert.alert('请填写路书名称'); return; }
    if (!rideId) { Alert.alert('缺少骑行记录'); return; }
    setSubmitting(true);
    try {
      const result = await communityService.createRouteBookFromRide(rideId, {
        title: title.trim(), region: region.trim(), difficulty,
        surface_type: surface, description: description.trim(), tags, visibility,
      });
      router.replace(`/route/${result.id}`);
    } catch (e) {
      Alert.alert('创建失败', getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingRide) {
    return (
      <View style={[styles.container, { paddingTop: top, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>生成路书</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: bottom + 80 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>路书名称 <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={title} onChangeText={setTitle}
            placeholder="给路书起个名字" placeholderTextColor={Colors.textMuted}
            maxLength={30}
          />
          <Text style={styles.counter}>{title.length}/30</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>地区</Text>
          <TextInput
            style={styles.input}
            value={region} onChangeText={setRegion}
            placeholder="如：成都" placeholderTextColor={Colors.textMuted}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>难度</Text>
          <View style={styles.optionRow}>
            {DIFFICULTY_OPTIONS.map(o => (
              <TouchableOpacity
                key={o.key}
                style={[styles.optionBtn, difficulty === o.key && styles.optionBtnActive]}
                onPress={() => setDifficulty(o.key)}
              >
                <Text style={[styles.optionText, difficulty === o.key && styles.optionTextActive]}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>路面类型</Text>
          <View style={styles.optionRow}>
            {SURFACE_OPTIONS.map(o => (
              <TouchableOpacity
                key={o.key}
                style={[styles.optionBtn, surface === o.key && styles.optionBtnActive]}
                onPress={() => setSurface(o.key)}
              >
                <Text style={[styles.optionText, surface === o.key && styles.optionTextActive]}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>标签（可多选）</Text>
          <View style={styles.tagWrap}>
            {TAG_OPTIONS.map(tag => (
              <TouchableOpacity
                key={tag}
                style={[styles.tag, tags.includes(tag) && styles.tagActive]}
                onPress={() => toggleTag(tag)}
              >
                <Text style={[styles.tagText, tags.includes(tag) && styles.tagTextActive]}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>可见性</Text>
          <View style={styles.optionRow}>
            {VISIBILITY_OPTIONS.map(o => (
              <TouchableOpacity
                key={o.key}
                style={[styles.optionBtn, visibility === o.key && styles.optionBtnActive]}
                onPress={() => setVisibility(o.key)}
              >
                <Text style={[styles.optionText, visibility === o.key && styles.optionTextActive]}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>描述（选填）</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={description} onChangeText={setDescription}
            placeholder="介绍一下这条路线的特点..." placeholderTextColor={Colors.textMuted}
            multiline numberOfLines={4} maxLength={500} textAlignVertical="top"
          />
          <Text style={styles.counter}>{description.length}/500</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit} disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color="#000" />
            : <Text style={styles.submitBtnText}>创建路书</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.glassBorder },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 17, color: Colors.textPrimary },
  body: { padding: 20, gap: 20 },
  fieldGroup: { gap: 8 },
  label: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 13, color: Colors.textSecondary },
  required: { color: Colors.danger },
  input: {
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, color: Colors.textPrimary,
  },
  inputMultiline: { height: 100, paddingTop: 11 },
  counter: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11, color: Colors.textMuted, textAlign: 'right' },
  optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  optionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.glassBorder },
  optionBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  optionText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: Colors.textMuted },
  optionTextActive: { color: '#000', fontFamily: 'SpaceGrotesk_600SemiBold' },
  tagWrap: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: Colors.glassBorder },
  tagActive: { backgroundColor: Colors.primary + '22', borderColor: Colors.primary + '88' },
  tagText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: Colors.textMuted },
  tagTextActive: { color: Colors.primary },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.glassBorder, backgroundColor: Colors.bg },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16, color: '#000' },
});
