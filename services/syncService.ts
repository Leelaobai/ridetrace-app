/**
 * syncService — 将离线骑行数据上传到服务器
 *
 * 调用方不需要感知具体步骤，只需 await syncAllPending()
 */

import { offlineRidePlugin, type OfflineRide } from '../utils/offlineRide';
import { rideService } from './rideService';

const POINTS_BATCH_SIZE = 100; // 每批最多上传 100 个点

async function syncOne(ride: OfflineRide): Promise<void> {
  // 1. 在服务端创建骑行记录（传入历史开始时间）
  const created = await rideService.startRide(
    ride.vehicleId,
    ride.startLat,
    ride.startLng,
    ride.startedAt,
  );
  const serverId = created.id;

  // 2. 分批上传轨迹点
  for (let i = 0; i < ride.points.length; i += POINTS_BATCH_SIZE) {
    const batch = ride.points.slice(i, i + POINTS_BATCH_SIZE);
    await rideService.batchUploadPoints(serverId, batch);
  }

  // 3. 结束骑行（传入历史结束时间 + 客户端精确时长）
  await rideService.finishRide(serverId, ride.finishedAt, ride.durationSec);

  // 4. 本地标记已同步
  await offlineRidePlugin.markSynced(ride.localId);
}

export type SyncProgress = {
  total: number;
  done: number;
  failed: number;
};

/**
 * 同步所有待上传的离线骑行
 * @param onProgress 可选进度回调
 * @returns 成功同步的数量
 */
export async function syncAllPending(
  onProgress?: (progress: SyncProgress) => void,
): Promise<number> {
  const pending = await offlineRidePlugin.getPending();
  if (pending.length === 0) return 0;

  let done = 0;
  let failed = 0;

  for (const ride of pending) {
    try {
      await syncOne(ride);
      done++;
    } catch {
      failed++;
    }
    onProgress?.({ total: pending.length, done, failed });
  }

  // 清理已同步记录，保持存储整洁
  await offlineRidePlugin.clearSynced();

  return done;
}
