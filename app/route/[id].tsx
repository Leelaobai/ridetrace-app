import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, TextInput, KeyboardAvoidingView, Platform,
  ActivityIndicator, ToastAndroid,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { communityService, type RouteBook, type Comment } from '../../services/communityService';
import { formatDistance, formatDuration, formatDate } from '../../utils/formatters';
import { getErrorMessage } from '../../utils/errors';
import { StaticTrackMap } from '../../components/map/StaticTrackMap';

const DIFFICULTY_LABEL = { easy: '简单', medium: '中等', hard: '困难' };
const DIFFICULTY_COLOR = { easy: Colors.success, medium: Colors.warning, hard: Colors.danger };
const SURFACE_LABEL = { road: '公路', mountain: '山地', city: '城市', mixed: '混合' };

function showToast(msg: string) {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
  else Alert.alert('', msg);
}

export default function RouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const { token, user } = useAuthStore();
  const [route, setRoute] = useState<RouteBook | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [liking, setLiking] = useState(false);
  const [favoriting, setFavoriting] = useState(false);

  useEffect(() => {
    Promise.all([communityService.getRouteBookDetail(id), communityService.getComments(id)])
      .then(([r, c]) => { setRoute(r); setComments(c); })
      .catch(e => Alert.alert('加载失败', getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const handleLike = async () => {
    if (!token) { showToast('请先登录'); return; }
    if (!route || liking) return;
    setLiking(true);
    try {
      if (route.is_liked) {
        await communityService.unlikeRouteBook(route.id);
        setRoute(r => r ? { ...r, is_liked: false, stats: { ...r.stats, likes: r.stats.likes - 1 } } : r);
      } else {
        await communityService.likeRouteBook(route.id);
        setRoute(r => r ? { ...r, is_liked: true, stats: { ...r.stats, likes: r.stats.likes + 1 } } : r);
      }
    } catch (e) { showToast(getErrorMessage(e)); } finally { setLiking(false); }
  };

  const handleFavorite = async () => {
    if (!token) { showToast('请先登录'); return; }
    if (!route || favoriting) return;
    setFavoriting(true);
    try {
      if (route.is_favorited) {
        await communityService.unfavoriteRouteBook(route.id);
        setRoute(r => r ? { ...r, is_favorited: false, stats: { ...r.stats, favorites: r.stats.favorites - 1 } } : r);
      } else {
        await communityService.favoriteRouteBook(route.id);
        setRoute(r => r ? { ...r, is_favorited: true, stats: { ...r.stats, favorites: r.stats.favorites + 1 } } : r);
      }
    } catch (e) { showToast(getErrorMessage(e)); } finally { setFavoriting(false); }
  };

  const handleComment = async () => {
    if (!token) { showToast('请先登录后发表评论'); return; }
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const c = await communityService.postComment(id, commentText.trim());
      setComments(prev => [c, ...prev]);
      setCommentText('');
      setRoute(r => r ? { ...r, stats: { ...r.stats, comments: r.stats.comments + 1 } } : r);
    } catch (e) { showToast(getErrorMessage(e)); } finally { setSubmitting(false); }
  };

  const handleDeleteRoute = () => {
    Alert.alert('删除路书', `确定删除「${route?.title}」吗？此操作不可撤销。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive', onPress: async () => {
          try { await communityService.deleteRouteBook(id); router.back(); }
          catch (e) { Alert.alert('删除失败', getErrorMessage(e)); }
        },
      },
    ]);
  };

  const showAuthorMenu = () => {
    Alert.alert('操作', '', [
      { text: '编辑路书', onPress: () => router.push(`/route/edit/${id}`) },
      { text: '删除路书', style: 'destructive', onPress: handleDeleteRoute },
      { text: '取消', style: 'cancel' },
    ]);
  };

  const isAuthor = route?.author?.id === user?.id;

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} />
      </View>
    );
  }
  if (!route) return null;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { paddingTop: top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{route.title}</Text>
        {isAuthor ? (
          <TouchableOpacity onPress={showAuthorMenu} style={styles.menuBtn}>
            <Ionicons name="ellipsis-horizontal" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        ) : <View style={{ width: 40 }} />}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.mapWrap}>
          {(route.track_points?.length ?? 0) >= 2 ? (
            <StaticTrackMap trackPoints={route.track_points!} style={styles.mapWrap} />
          ) : (
            <View style={styles.mapPlaceholder}>
              <Ionicons name="map-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.mapPlaceholderText}>暂无轨迹</Text>
            </View>
          )}
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>{route.title}</Text>
          <Text style={styles.meta}>{route.author.username}  ·  {formatDate(route.created_at)}</Text>
          <View style={styles.statsGrid}>
            {[
              { label: '距离', value: formatDistance(route.distance_m) },
              { label: '爬升', value: `${route.elevation_gain_m}m` },
              { label: '时长', value: formatDuration(route.duration_sec) },
              { label: '难度', value: DIFFICULTY_LABEL[route.difficulty], color: DIFFICULTY_COLOR[route.difficulty] },
            ].map((s, i) => (
              <View key={i} style={styles.statCell}>
                <Text style={[styles.statValue, s.color ? { color: s.color } : {}]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoBadge}>
              <Text style={styles.infoBadgeText}>路面：{SURFACE_LABEL[route.surface_type]}</Text>
            </View>
            {route.tags.map(tag => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
          {!!route.description && <Text style={styles.description}>{route.description}</Text>}
          <View style={styles.actionBar}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleLike} disabled={liking}>
              <Ionicons name={route.is_liked ? 'heart' : 'heart-outline'} size={20} color={route.is_liked ? Colors.danger : Colors.textSecondary} />
              <Text style={styles.actionText}>{route.stats.likes}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleFavorite} disabled={favoriting}>
              <Ionicons name={route.is_favorited ? 'bookmark' : 'bookmark-outline'} size={20} color={route.is_favorited ? Colors.warning : Colors.textSecondary} />
              <Text style={styles.actionText}>{route.stats.favorites}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => showToast('分享链接已复制')}>
              <Ionicons name="share-outline" size={20} color={Colors.textSecondary} />
              <Text style={styles.actionText}>分享</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.commentsSection}>
            <Text style={styles.sectionTitle}>评论 ({route.stats.comments})</Text>
            {comments.length === 0 ? (
              <Text style={styles.emptyComment}>暂无评论，来说第一句话吧</Text>
            ) : comments.map(c => (
              <View key={c.id} style={styles.commentItem}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>{c.author.username[0]?.toUpperCase()}</Text>
                </View>
                <View style={styles.commentContent}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>{c.author.username}</Text>
                    <Text style={styles.commentDate}>{formatDate(c.created_at)}</Text>
                  </View>
                  <Text style={styles.commentText}>{c.content}</Text>
                </View>
                {c.author.id === user?.id && (
                  <TouchableOpacity
                    onPress={() => Alert.alert('删除评论', '确定删除？', [
                      { text: '取消', style: 'cancel' },
                      {
                        text: '删除', style: 'destructive', onPress: async () => {
                          try {
                            await communityService.deleteComment(id, c.id);
                            setComments(prev => prev.filter(x => x.id !== c.id));
                            setRoute(r => r ? { ...r, stats: { ...r.stats, comments: r.stats.comments - 1 } } : r);
                          } catch (e) { showToast(getErrorMessage(e)); }
                        },
                      },
                    ])}
                    style={styles.deleteCommentBtn}
                  >
                    <Ionicons name="trash-outline" size={15} color={Colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.commentBar, { paddingBottom: bottom + 8 }]}>
        <TextInput
          style={styles.commentInput}
          placeholder={token ? '写下你的评论...' : '登录后发表评论'}
          placeholderTextColor={Colors.textMuted}
          value={commentText} onChangeText={setCommentText}
          editable={!!token}
          onPressIn={() => { if (!token) showToast('请先登录后发表评论'); }}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!commentText.trim() || submitting) && { opacity: 0.5 }]}
          onPress={handleComment} disabled={!commentText.trim() || submitting}
        >
          {submitting
            ? <ActivityIndicator size="small" color="#000" />
            : <Ionicons name="send" size={18} color="#000" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.glassBorder },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 17, color: Colors.textPrimary, marginHorizontal: 8 },
  menuBtn: { padding: 4 },
  mapWrap: { height: 280 },
  mapPlaceholder: { height: 280, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)', gap: 8 },
  mapPlaceholderText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: Colors.textMuted },
  body: { padding: 20, gap: 16 },
  title: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 22, color: Colors.textPrimary },
  meta: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: Colors.textMuted, marginTop: -8 },
  statsGrid: { flexDirection: 'row', backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder, borderRadius: 14 },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4 },
  statValue: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 14, color: Colors.textPrimary },
  statLabel: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11, color: Colors.textMuted },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoBadge: { borderWidth: 1, borderColor: Colors.glassBorder, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  infoBadgeText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: Colors.textSecondary },
  tag: { borderWidth: 1, borderColor: Colors.primary + '55', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: Colors.primary + '11' },
  tagText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: Colors.primary },
  description: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  actionBar: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.glassBorder, paddingVertical: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  actionText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, color: Colors.textSecondary },
  commentsSection: { gap: 12 },
  sectionTitle: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15, color: Colors.textPrimary },
  emptyComment: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingVertical: 16 },
  commentItem: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary + '22', alignItems: 'center', justifyContent: 'center' },
  commentAvatarText: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 13, color: Colors.primary },
  commentContent: { flex: 1, gap: 3 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentAuthor: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 13, color: Colors.textPrimary },
  commentDate: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11, color: Colors.textMuted },
  commentText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  deleteCommentBtn: { padding: 4 },
  commentBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.glassBorder, backgroundColor: Colors.bg },
  commentInput: { flex: 1, height: 40, backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder, borderRadius: 20, paddingHorizontal: 14, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, color: Colors.textPrimary },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
});
