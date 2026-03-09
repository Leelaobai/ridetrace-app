import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { communityService } from '../../services/communityService';

type RouteBook = {
  id: string; title: string; region: string;
  distance: string; rating: number; difficulty: string;
  coverColors: string[];
};

const DIFFICULTY_COLOR: Record<string, string> = {
  简单: Colors.success,
  中等: Colors.warning,
  困难: Colors.danger,
};

function RouteCard({ route }: { route: RouteBook }) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.75}>
      <LinearGradient
        colors={route.coverColors as [string, string]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.cover}
      >
        <Text style={styles.coverDistance}>{route.distance}</Text>
      </LinearGradient>
      <View style={styles.cardBody}>
        <Text style={styles.routeTitle}>{route.title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>📍 {route.region}</Text>
          <Text style={styles.metaText}>⭐ {route.rating}</Text>
          <View style={[styles.diffBadge, { borderColor: DIFFICULTY_COLOR[route.difficulty] + '88' }]}>
            <Text style={[styles.diffText, { color: DIFFICULTY_COLOR[route.difficulty] }]}>
              {route.difficulty}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function RoutesScreen() {
  const [routes, setRoutes] = useState<RouteBook[]>([]);

  useEffect(() => {
    communityService.getRouteBooks().then(d => setRoutes(d.routes));
  }, []);

  return (
    <View style={styles.container}>
      {/* 标题栏 */}
      <View style={styles.header}>
        <Text style={styles.title}>路书</Text>
      </View>

      {/* 搜索框（占位） */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索路线..."
          placeholderTextColor={Colors.textMuted}
          editable={false}
        />
      </View>

      <FlatList
        data={routes}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <RouteCard route={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingTop: 60, paddingBottom: 12, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: Colors.glassBorder,
  },
  title: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 24, color: Colors.textPrimary },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: Colors.glassBg, borderWidth: 1,
    borderColor: Colors.glassBorder, borderRadius: 10,
  },
  searchIcon: { fontSize: 14 },
  searchInput: {
    flex: 1, fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14, color: Colors.textPrimary,
  },
  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  card: {
    backgroundColor: Colors.glassBg, borderWidth: 1,
    borderColor: Colors.glassBorder, borderRadius: 12, overflow: 'hidden',
  },
  cover: { height: 100, alignItems: 'flex-end', justifyContent: 'flex-end', padding: 12 },
  coverDistance: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 20,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  cardBody: { padding: 14, gap: 8 },
  routeTitle: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15, color: Colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metaText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: Colors.textMuted },
  diffBadge: {
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
  },
  diffText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11 },
});
