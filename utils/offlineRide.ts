/**
 * offlineRide — 离线骑行插件
 *
 * 可拔插设计：
 *   • 开关：constants/config.ts → OFFLINE_RIDE_PLUGIN_ENABLED
 *   • 删除本文件 + cockpit.tsx 中约 5 处 offlineRidePlugin.* 调用，即可完全移除该功能
 *   • 本文件不依赖任何业务 store，只依赖 AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { OFFLINE_RIDE_PLUGIN_ENABLED } from '../constants/config';

// ── 类型 ────────────────────────────────────────────────
export interface OfflinePoint {
  lat: number;
  lng: number;
  altitude?: number;
  speed?: number;
  accuracy?: number;
  recorded_at?: string;
  seq: number;
}

export interface OfflineRide {
  localId: string;          // 本地生成的 UUID，同步成功前作为唯一标识
  vehicleId: string;
  startLat: number;
  startLng: number;
  startedAt: string;        // ISO8601
  finishedAt: string;       // ISO8601
  durationSec: number;      // 客户端精确计算（含暂停）
  distanceM: number;
  maxSpeedKmh: number;
  points: OfflinePoint[];
  synced: boolean;
  createdAt: string;        // 本地存储时间，用于展示排序
}

// ── Storage key ──────────────────────────────────────────
const STORAGE_KEY = '@ridetrace/offline_rides';

// ── 内部辅助 ────────────────────────────────────────────
async function readAll(): Promise<OfflineRide[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeAll(rides: OfflineRide[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rides));
  } catch {}
}

// ── 公开 API ─────────────────────────────────────────────
export const offlineRidePlugin = {
  /** 是否启用（由 config 控制） */
  isEnabled: OFFLINE_RIDE_PLUGIN_ENABLED,

  /** 保存一段完整的离线骑行 */
  async save(ride: Omit<OfflineRide, 'synced' | 'createdAt'>): Promise<void> {
    const rides = await readAll();
    rides.push({ ...ride, synced: false, createdAt: new Date().toISOString() });
    await writeAll(rides);
  },

  /** 获取所有未同步的骑行 */
  async getPending(): Promise<OfflineRide[]> {
    const rides = await readAll();
    return rides.filter(r => !r.synced);
  },

  /** 获取未同步数量（轻量，用于 badge） */
  async getPendingCount(): Promise<number> {
    const rides = await readAll();
    return rides.filter(r => !r.synced).length;
  },

  /** 标记某条骑行已同步 */
  async markSynced(localId: string): Promise<void> {
    const rides = await readAll();
    const updated = rides.map(r => r.localId === localId ? { ...r, synced: true } : r);
    await writeAll(updated);
  },

  /** 清除所有已同步的骑行（可选，保持存储整洁） */
  async clearSynced(): Promise<void> {
    const rides = await readAll();
    await writeAll(rides.filter(r => !r.synced));
  },
};
