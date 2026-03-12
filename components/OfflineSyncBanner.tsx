/**
 * OfflineSyncBanner — 显示待同步骑行数量，提供手动同步入口
 *
 * 放在 _layout.tsx 或根布局中，全局可见。
 * pendingCount === 0 时自动隐藏。
 */

import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { OFFLINE_RIDE_PLUGIN_ENABLED } from '../constants/config';

export function OfflineSyncBanner() {
  const { pendingCount, isSyncing, syncNow } = useOfflineSync();

  if (!OFFLINE_RIDE_PLUGIN_ENABLED || pendingCount === 0) return null;

  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline-outline" size={16} color={Colors.warning} />
      <Text style={styles.text}>
        {pendingCount} 段骑行待同步
      </Text>
      <TouchableOpacity
        style={styles.btn}
        onPress={syncNow}
        disabled={isSyncing}
      >
        {isSyncing
          ? <ActivityIndicator size="small" color={Colors.primary} />
          : <Text style={styles.btnText}>立即同步</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(8,17,18,0.96)',
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.warning}44`,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  text: {
    flex: 1,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    color: Colors.warning,
  },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    minWidth: 72,
    alignItems: 'center',
  },
  btnText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 13,
    color: Colors.primary,
  },
});
