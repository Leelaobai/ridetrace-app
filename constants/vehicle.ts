// 车辆分类键值
export const VEHICLE_CATEGORY = {
  ROAD: 'road',
  MOUNTAIN: 'mountain',
  CITY: 'city',
  FOLDING: 'folding',
  EBIKE: 'ebike',
} as const;

// 分类中文标签（前端显示用）
export const VEHICLE_CATEGORY_LABEL: Record<string, string> = {
  road: '公路车',
  mountain: '山地车',
  city: '城市车',
  folding: '折叠车',
  ebike: '电助力车',
};

// 座驾昵称限制
export const VEHICLE_NICKNAME_MAX_LEN = 20;
// 自动生成昵称前缀："我的公路车"
export const VEHICLE_NICKNAME_PREFIX = '我的';
