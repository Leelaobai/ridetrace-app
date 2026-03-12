// 前端本地骑行状态（不与后端状态混用）
export const RIDE_STATUS = {
  READY:  'ready',   // 未开始 / 结束后重置
  RIDING: 'riding',  // 骑行中
  PAUSED: 'paused',  // 已暂停
} as const;

export type RideStatus = typeof RIDE_STATUS[keyof typeof RIDE_STATUS];

// Haversine 地球半径（米）
export const EARTH_RADIUS_M = 6371000;
