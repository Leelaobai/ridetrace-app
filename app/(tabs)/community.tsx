import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { communityService } from '../../services/communityService';

type Post = {
  id: string; username: string; avatar: string; time: string;
  title: string; excerpt: string; location: string;
  distance: string; likes: number; comments: number;
};

function PostCard({ post }: { post: Post }) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.75}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarText}>{post.avatar}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.username}>{post.username}</Text>
          <Text style={styles.time}>{post.time}</Text>
        </View>
      </View>
      <Text style={styles.postTitle}>{post.title}</Text>
      <Text style={styles.excerpt} numberOfLines={2}>{post.excerpt}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.footerItem}>📍 {post.location}</Text>
        <Text style={styles.footerItem}>🚴 {post.distance}</Text>
        <Text style={styles.footerItem}>❤️ {post.likes}</Text>
        <Text style={styles.footerItem}>💬 {post.comments}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function CommunityScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<'recommend' | 'following'>('recommend');

  useEffect(() => {
    communityService.getPosts().then(d => setPosts(d.posts));
  }, []);

  return (
    <View style={styles.container}>
      {/* 标题栏 */}
      <View style={styles.header}>
        <Text style={styles.title}>社区</Text>
      </View>

      {/* 推荐 / 关注 Tab */}
      <View style={styles.tabRow}>
        {(['recommend', 'following'] as const).map(t => (
          <TouchableOpacity key={t} style={styles.tabItem} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'recommend' ? '推荐' : '关注'}
            </Text>
            {tab === t && <View style={styles.tabLine} />}
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={posts}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <PostCard post={item} />}
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
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: Colors.glassBorder,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, color: Colors.textMuted },
  tabTextActive: { color: Colors.primary, fontFamily: 'SpaceGrotesk_600SemiBold' },
  tabLine: {
    position: 'absolute', bottom: 0, height: 2, width: 24,
    backgroundColor: Colors.primary, borderRadius: 1,
  },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: Colors.glassBg, borderWidth: 1,
    borderColor: Colors.glassBorder, borderRadius: 12,
    padding: 16, gap: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(13,227,242,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18 },
  username: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 13, color: Colors.textPrimary },
  time: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11, color: Colors.textMuted },
  postTitle: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15, color: Colors.textPrimary },
  excerpt: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  footerItem: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: Colors.textMuted },
});
