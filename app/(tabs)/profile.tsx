import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { userService } from '../../services/userService';
import { formatDistance, formatDuration } from '../../utils/formatters';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [stats, setStats] = useState<{
    total_rides: number;
    total_distance_m: number;
    total_duration_sec: number;
  } | null>(null);

  useEffect(() => {
    userService.getStats().then(setStats).catch(() => {});
  }, []);

  const handleLogout = () => {
    Alert.alert('退出登录', '确定要退出吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '退出', style: 'destructive',
        onPress: () => {
          clearAuth();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const menuItems: MenuItem[] = [
    {
      icon: 'time-outline',
      label: '骑行记录',
      onPress: () => router.push('/ride/records'),
    },
    {
      icon: 'bicycle-outline',
      label: '我的座驾',
      onPress: () => {},
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
      <View style={styles.userSection}>
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
  userSection: { alignItems: 'center', paddingTop: 64, paddingBottom: 28, gap: 8 },
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
});
