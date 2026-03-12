import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { AMAP_REST_KEY } from '../../constants/config';
import { communityService, type RouteBook, type Difficulty } from '../../services/communityService';
import { buildStaticMapUrl } from '../../utils/amapStatic';
import { formatDistance } from '../../utils/formatters';

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: '简单', medium: '中等', hard: '困难' };
const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  easy: Colors.success, medium: Colors.warning, hard: Colors.danger,
};

function RouteCard({ route, onPress }: { route: RouteBook; onPress: () => void }) {
  const mapUrl = buildStaticMapUrl(route.preview_points, AMAP_REST_KEY);
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.75} onPress={onPress}>
      {mapUrl ? (
        <Image source={{ uri: mapUrl }} style={styles.cover} resizeMode="cover" />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <Ionicons name="map-outline" size={32} color={Colors.textMuted} />
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.titleRow}>
          <Text style={styles.routeTitle} numberOfLines={1}>{route.title}</Text>
          {route.visibility === 'private' && (
            <View style={styles.privateBadge}>
              <Ionicons name="lock-closed" size={10} color={Colors.textMuted} />
              <Text style={styles.privateText}>仅自己</Text>
            </View>
          )}
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>📍 {route.region}</Text>
          <Text style={styles.metaText}>{formatDistance(route.distance_m)}</Text>
          <View style={[styles.diffBadge, { borderColor: DIFFICULTY_COLOR[route.difficulty] + '88' }]}>
            <Text style={[styles.diffText, { color: DIFFICULTY_COLOR[route.difficulty] }]}>
              {DIFFICULTY_LABEL[route.difficulty]}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MyRoutesScreen() {
  const { top } = useSafeAreaInsets();
  const router = useRouter();
  const [routes, setRoutes] = useState<RouteBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await communityService.getMyRouteBooks();
      setRoutes(data.routes ?? []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={[styles.container, { paddingTop: top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>我的路书</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/ride/records?selectForRoute=true')}
        >
          <Ionicons name="add" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={routes} keyExtractor={i => i.id} contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <RouteCard route={item} onPress={() => router.push(`/route/${item.id}`)} />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="map-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>还没有路书</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/ride/records?selectForRoute=true')}
              >
                <Text style={styles.emptyBtnText}>去创建一个吧</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.glassBorder },
  backBtn: { padding: 4 },
  title: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 17, color: Colors.textPrimary },
  addBtn: { padding: 4 },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40, gap: 12 },
  card: { backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder, borderRadius: 12, overflow: 'hidden' },
  cover: { height: 100 },
  coverPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  cardBody: { padding: 14, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeTitle: { flex: 1, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15, color: Colors.textPrimary },
  privateBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: Colors.glassBorder, borderRadius: 6 },
  privateText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 10, color: Colors.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metaText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: Colors.textMuted },
  diffBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  diffText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16, color: Colors.textSecondary },
  emptyBtn: { marginTop: 4, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: Colors.primary + '55', backgroundColor: Colors.primary + '11' },
  emptyBtnText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, color: Colors.primary },
});
