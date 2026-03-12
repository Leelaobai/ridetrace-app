/**
 * useOfflineSync — App 切回前台时自动同步离线骑行 + 手动同步
 *
 * 使用方式：
 *   const { pendingCount, isSyncing, syncNow } = useOfflineSync();
 *
 * 无第三方依赖，使用 React Native 内置 AppState：
 *   • App 从后台切回前台 → 自动检测待同步数量 → 若有则静默同步
 *   • 用户在 OfflineSyncBanner 点击「立即同步」→ 手动触发
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { offlineRidePlugin } from '../utils/offlineRide';
import { syncAllPending } from '../services/syncService';
import { OFFLINE_RIDE_PLUGIN_ENABLED } from '../constants/config';

export function useOfflineSync() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    if (!OFFLINE_RIDE_PLUGIN_ENABLED) return;
    const n = await offlineRidePlugin.getPendingCount();
    setPendingCount(n);
  }, []);

  const syncNow = useCallback(async () => {
    if (!OFFLINE_RIDE_PLUGIN_ENABLED) return;
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      await syncAllPending();
      await refreshCount();
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [refreshCount]);

  // 启动时读取数量
  useEffect(() => {
    if (!OFFLINE_RIDE_PLUGIN_ENABLED) return;
    refreshCount();
  }, [refreshCount]);

  // App 切回前台时自动同步
  useEffect(() => {
    if (!OFFLINE_RIDE_PLUGIN_ENABLED) return;

    const handleAppState = async (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const n = await offlineRidePlugin.getPendingCount();
        setPendingCount(n);
        if (n > 0) {
          // 静默尝试同步，失败不报错（可能仍无网络）
          syncNow().catch(() => {});
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [syncNow]);

  return { pendingCount, isSyncing, syncNow, refreshCount };
}
