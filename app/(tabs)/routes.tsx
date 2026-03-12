import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { communityService, type RouteBook, type Difficulty } from '../../services/communityService';
import { TrackPreview } from '../../components/map/TrackPreview';
import { formatDistance } from '../../utils/formatters';

type FilterTab = 'all' | Difficulty;
const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: '全部' }, { key: 'easy', label: '简单' },
  { key: 'medium', label: '中等' }, { key: 'hard', label: '困难' },
];
const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: '简单', medium: '中等', hard: '困难' };
const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  easy: Colors.success, medium: Colors.warning, hard: Colors.danger,
};

function SkeletonCard() {
  return (
    <View style={[styles.card, { opacity: 0.4 }]}>
      <View style={[styles.cover, { backgroundColor: Colors.glassBg }]} />
      <View style={{ padding: 14, gap: 8 }}>
        <View style={{ width: '60%', height: 14, backgroundColor: Colors.glassBorder, borderRadius: 4 }} />
        <View style={{ width: '40%', height: 11, backgroundColor: Colors.glassBorder, borderRadius: 4 }} />
      </View>
    </View>
  );
}

function RouteCard({ route, onPress }: { route: RouteBook; onPress: () => void }) {
  const hasTrack = (route.preview_points?.length ?? 0) >= 2;
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.75} onPress={onPress}>
      {hasTrack ? (
        <TrackPreview points={route.preview_points} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <Ionicons name="map-outline" size={32} color={Colors.textMuted} />
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.routeTitle} numberOfLines={1}>{route.title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>📍 {route.region}</Text>
          <Text style={styles.metaText}>{formatDistance(route.distance_m)}</Text>
          <View style={[styles.diffBadge, { borderColor: DIFFICULTY_COLOR[route.difficulty] + '88' }]}>
            <Text style={[styles.diffText, { color: DIFFICULTY_COLOR[route.difficulty] }]}>
              {DIFFICULTY_LABEL[route.difficulty]}
            </Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statText}>❤️ {route.stats.likes}</Text>
          <Text style={styles.statText}>⭐ {route.stats.favorites}</Text>
          <Text style={styles.statText}>💬 {route.stats.comments}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function RoutesScreen() {
  const { top } = useSafeAreaInsets();
  const router = useRouter();
  const [routes, setRoutes] = useState<RouteBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchText, setSearchText] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (q?: string, difficulty?: FilterTab) => {
    try {
      const params: Record<string, string> = {};
      if (q) params.q = q;
      if (difficulty && difficulty !== 'all') params.difficulty = difficulty;
      const data = await communityService.getRouteBooks(params);
      setRoutes(data.routes ?? []);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab); setLoading(true); load(searchText, tab);
  };

  const handleSearch = (text: string) => {
    setSearchText(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setLoading(true); load(text, activeTab); }, 500);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: top + 12 }]}>
        <Text style={styles.title}>路书</Text>
      </View>
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput} placeholder="搜索路线、地区..."
          placeholderTextColor={Colors.textMuted} value={searchText} onChangeText={handleSearch}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabItem, activeTab === t.key && styles.tabItemActive]}
            onPress={() => handleTabChange(t.key)}
          >
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? (
        <View style={styles.list}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
      ) : (
        <FlatList
          data={routes} keyExtractor={i => i.id} contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <RouteCard route={item} onPress={() => router.push(`/route/${item.id}`)} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(searchText, activeTab); }}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="map-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>暂无路书</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingBottom: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: Colors.glassBorder },
  title: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 24, color: Colors.textPrimary },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder, borderRadius: 10,
  },
  searchInput: { flex: 1, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, color: Colors.textPrimary },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  tabItem: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Colors.glassBorder },
  tabItemActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: Colors.textMuted },
  tabTextActive: { color: '#000', fontFamily: 'SpaceGrotesk_600SemiBold' },
  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  card: { backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder, borderRadius: 12, overflow: 'hidden' },
  cover: { height: 140 },
  coverPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  cardBody: { padding: 14, gap: 6 },
  routeTitle: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15, color: Colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metaText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: Colors.textMuted },
  diffBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  diffText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11 },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 2 },
  statText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11, color: Colors.textMuted },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, color: Colors.textMuted },
});
