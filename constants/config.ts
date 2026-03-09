export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.7:8080/api/v1';

// 高德地图 Web JS API Key（Web端 JS API）
export const AMAP_KEY = process.env.EXPO_PUBLIC_AMAP_KEY || '8ee27259445c8820ca35a998f37a4eed';

// 高德地图安全密钥（JS API 2.0 必须配置）
export const AMAP_SECURITY_CODE = process.env.EXPO_PUBLIC_AMAP_SECURITY_CODE || '21de69894872b5a1158e85c0faae8100';

// GPS 信号质量阈值（accuracy 单位：米）
export const GPS_ACCURACY_GOOD = 50;
export const GPS_ACCURACY_WEAK = 150;

