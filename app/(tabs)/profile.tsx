import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { userService } from '../../services/userService';
import { formatDistance, formatDuration } from '../../utils/formatters';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

const FEATURES = [
  {
    icon: 'navigate-outline' as const,
    title: '实时轨迹记录',
    desc: '高精度 GPS 记录你的每一米路程',
  },
  {
    icon: 'stats-chart-outline' as const,
    title: '骑行数据分析',
    desc: '速度、爬升、时长全面可视化',
  },
  {
    icon: 'people-outline' as const,
    title: '骑行社区',
    desc: '与全国车友分享路书与见闻',
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { token, user, clearAuth } = useAuthStore();
  const [stats, setStats] = useState<{
    total_rides: number;
    total_distance_m: number;
    total_duration_sec: number;
  } | null>(null);

  useEffect(() => {
    if (token) {
      userService.getStats().then(setStats).catch(() => {});
    }
  }, [token]);

  const handleLogout = () => {
    Alert.alert('退出登录', '确定要退出吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '退出', style: 'destructive',
        onPress: () => {
          clearAuth();
          router.replace('/(tabs)/login');
        },
      },
    ]);
  };

  // 未登录：显示引导页
  if (!token) {
    return (
      <View style={[styles.guideContainer, { paddingTop: top }]}>
        {/* 背景辉光 */}
        <View style={styles.glowHalo} />

        {/* 图标 */}
        <LinearGradient
          colors={['rgba(13,227,242,0.22)', 'rgba(13,227,242,0.04)']}
          style={styles.iconRing}
        >
          <Ionicons name="bicycle" size={44} color={Colors.primary} />
        </LinearGradient>

        {/* 标题 */}
        <Text style={styles.guideBrand}>RideTrace</Text>
        <Text style={styles.guideTagline}>每一段路，都值得被记录</Text>

        {/* 功能卡片 */}
        <View style={styles.featureCard}>
          {FEATURES.map((f, i) => (
            <View key={f.title}>
              <View style={styles.featureRow}>
                <View style={styles.featureIconWrap}>
                  <Ionicons name={f.icon} size={20} color={Colors.primary} />
                </View>
                <View style={styles.featureTextWrap}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
              </View>
              {i < FEATURES.length - 1 && <View style={styles.featureDivider} />}
            </View>
          ))}
        </View>

        {/* 主按钮 */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push('/(tabs)/login')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[Colors.primary, '#09c4d4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryBtnGrad}
          >
            <Text style={styles.primaryBtnText}>立即登录 / 注册</Text>
            <Ionicons name="arrow-forward" size={18} color="#000" />
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.guideHint}>登录即视为同意用户协议与隐私政策</Text>
      </View>
    );
  }

  const menuItems: MenuItem[] = [
    {
      icon: 'time-outline',
      label: '骑行记录',
      onPress: () => router.push('/ride/records'),
    },
    {
      icon: 'bicycle-outline',
      label: '管理座驾',
      onPress: () => router.push('/vehicle/manage'),
    },
    {
      icon: 'map-outline',
      label: '我的路书',
      onPress: () => router.push('/route/my'),
    },
    {
      icon: 'bookmark-outline',
      label: '我的收藏',
      onPress: () => router.push('/route/favorites'),
    },
    {
      icon: 'settings-outline',
      label: '设置',
      onPress: () => {},
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 用户头部 */}
      <View style={[styles.userSection, { paddingTop: top + 16 }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.username?.[0]?.toUpperCase() ?? 'R'}
          </Text>
        </View>
        <Text style={styles.username}>{user?.username ?? 'RideTrace用户'}</Text>
        <Text style={styles.email}>{user?.email ?? ''}</Text>
      </View>

      {/* 骑行统计卡片 */}
      <View style={styles.statsCard}>
        {stats ? (
          <>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.total_rides}</Text>
              <Text style={styles.statLabel}>骑行次数</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatDistance(stats.total_distance_m)}</Text>
              <Text style={styles.statLabel}>总里程</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatDuration(stats.total_duration_sec)}</Text>
              <Text style={styles.statLabel}>骑行时长</Text>
            </View>
          </>
        ) : (
          <ActivityIndicator color={Colors.primary} style={{ flex: 1, paddingVertical: 12 }} />
        )}
      </View>

      {/* 功能列表 */}
      <View style={styles.menuSection}>
        {menuItems.map((item, i) => (
          <TouchableOpacity
            key={item.label}
            style={[
              styles.menuItem,
              i < menuItems.length - 1 && styles.menuItemBorder,
            ]}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View style={styles.iconWrap}>
                <Ionicons name={item.icon} size={18} color={Colors.primary} />
              </View>
              <Text style={styles.menuText}>{item.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      {/* 退出登录 */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>退出登录</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingBottom: 48 },
  userSection: { alignItems: 'center', paddingBottom: 28, gap: 8 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: `${Colors.primary}22`,
    borderWidth: 2, borderColor: `${Colors.primary}44`,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 28, color: Colors.primary },
  username: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 20, color: Colors.textPrimary },
  email: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: Colors.textMuted },
  statsCard: {
    flexDirection: 'row', marginHorizontal: 16,
    backgroundColor: Colors.glassBg, borderWidth: 1,
    borderColor: Colors.glassBorder, borderRadius: 14,
    paddingVertical: 18,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 5 },
  statValue: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 18, color: Colors.textPrimary },
  statLabel: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11, color: Colors.textMuted },
  statDivider: { width: 1, backgroundColor: Colors.glassBorder },
  menuSection: {
    marginHorizontal: 16, marginTop: 20,
    backgroundColor: Colors.glassBg, borderWidth: 1,
    borderColor: Colors.glassBorder, borderRadius: 14, overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.glassBorder },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: `${Colors.primary}18`,
    alignItems: 'center', justifyContent: 'center',
  },
  menuText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 15, color: Colors.textPrimary },
  logoutBtn: { alignItems: 'center', marginTop: 32 },
  logoutText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 15, color: Colors.danger },

  // 未登录引导页
  guideContainer: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 32,
  },
  glowHalo: {
    position: 'absolute',
    top: '8%',
    alignSelf: 'center',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(13,227,242,0.05)',
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 80,
      },
    }),
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(13,227,242,0.3)',
    marginBottom: 20,
  },
  guideBrand: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 28,
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  guideTagline: {
    marginTop: 6,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },
  featureCard: {
    width: '100%',
    marginTop: 28,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(13,227,242,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextWrap: { flex: 1 },
  featureTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 14,
    color: Colors.textPrimary,
  },
  featureDesc: {
    marginTop: 2,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  featureDivider: {
    height: 1,
    backgroundColor: Colors.glassBorder,
  },
  primaryBtn: {
    width: '100%',
    marginTop: 24,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  primaryBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
  },
  primaryBtnText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 16,
    color: '#000',
  },
  guideHint: {
    marginTop: 16,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
  },
});
