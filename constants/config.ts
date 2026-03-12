// 后端在 Docker：真机必须用「运行 Metro 的电脑」的局域网 IP（与 Expo 启动时 url 里 IP 一致）
// 本机当前 IP：192.168.1.6；模拟器可设 EXPO_PUBLIC_API_URL=http://localhost:8080/api/v1
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.6:8080/api/v1';

// 高德地图 Web JS API Key（Web端 JS API）
export const AMAP_KEY = process.env.EXPO_PUBLIC_AMAP_KEY || '8ee27259445c8820ca35a998f37a4eed';

// 高德地图安全密钥（JS API 2.0 必须配置）
export const AMAP_SECURITY_CODE = process.env.EXPO_PUBLIC_AMAP_SECURITY_CODE || '21de69894872b5a1158e85c0faae8100';

// GPS 信号质量阈值（accuracy 单位：米）
export const GPS_ACCURACY_GOOD = 50;
export const GPS_ACCURACY_WEAK = 150;

// ── 离线骑行插件 ──────────────────────────────────────
// 设为 false 可完全禁用离线骑行功能（不影响其他逻辑）
export const OFFLINE_RIDE_PLUGIN_ENABLED = true;

// 高德地图 REST API Key（Web服务类型，用于静态地图和逆地理编码）
export const AMAP_REST_KEY = 'cbdaf35d99a4ba04c9bd9b27d4f561a9';

