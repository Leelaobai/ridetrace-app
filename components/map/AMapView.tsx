/**
 * 高德地图组件（WebView 实现，Expo Go 兼容）
 *
 * 使用前需要申请高德地图 Web JS API Key：
 * https://lbs.amap.com/ → 控制台 → 创建应用 → 添加 Key（Web端(JS API)）
 *
 * 将 Key 填入 constants/config.ts 的 AMAP_KEY 字段
 */

import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { AMAP_KEY, AMAP_SECURITY_CODE } from '../../constants/config';

interface Props {
  trackPoints: { lat: number; lng: number }[];
  followUser?: boolean;   // 是否自动跟随最新轨迹点
  // 按下定位按钮时传入当前坐标（ts 保证每次都触发 effect）
  locatePoint?: { lat: number; lng: number; ts: number } | null;
  style?: object;
}

function buildMapHTML(amapKey: string, securityCode: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #0d1f20; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    // 高德地图 JS API 2.0 安全配置（必须在加载 API 前设置）
    window._AMapSecurityConfig = { securityJsCode: '${securityCode}' };

    window._amapLoaded = false;
    window._pendingTrack = null;
    window._polyline = null;
    window._map = null;

    function initMap() {
      window._map = new AMap.Map('map', {
        zoom: 16,
        center: [121.4737, 31.2304],
        mapStyle: 'amap://styles/dark',
        showLabel: true,
      });

      window._amapLoaded = true;

      // 处理启动前积压的轨迹
      if (window._pendingTrack && window._pendingTrack.length > 0) {
        updateTrack(window._pendingTrack);
        window._pendingTrack = null;
      }
    }

    function updateTrack(points) {
      if (!window._amapLoaded || !window._map) {
        window._pendingTrack = points;
        return;
      }
      if (points.length < 2) return;

      var coords = points.map(function(p) {
        return new AMap.LngLat(p.lng, p.lat);
      });

      // 移除旧轨迹线
      if (window._polyline) {
        window._map.remove(window._polyline);
      }

      // 绘制新轨迹线
      window._polyline = new AMap.Polyline({
        path: coords,
        strokeColor: '#0de3f2',
        strokeWeight: 5,
        strokeOpacity: 0.9,
        lineJoin: 'round',
        lineCap: 'round',
        showDir: true,
      });
      window._map.add(window._polyline);

      // 跟随最新点
      var last = coords[coords.length - 1];
      window._map.setCenter(last);
    }

    // 接收来自 React Native 的消息
    document.addEventListener('message', function(e) {
      handleMessage(e.data);
    });
    window.addEventListener('message', function(e) {
      handleMessage(e.data);
    });

    function handleMessage(data) {
      try {
        var msg = JSON.parse(data);
        if (msg.type === 'UPDATE_TRACK') {
          updateTrack(msg.points);
        } else if (msg.type === 'SET_CENTER') {
          if (window._amapLoaded && window._map) {
            window._map.setCenter(new AMap.LngLat(msg.lng, msg.lat));
          }
        }
      } catch(e) {}
    }
  </script>
  <script src="https://webapi.amap.com/maps?v=2.0&key=${amapKey}&callback=initMap"></script>
</body>
</html>`;
}

export function AMapView({ trackPoints, followUser = true, locatePoint, style }: Props) {
  const webViewRef = useRef<WebView>(null);
  const prevLenRef = useRef(0);

  // 有新轨迹点时推送到 WebView
  useEffect(() => {
    if (trackPoints.length === prevLenRef.current) return;
    prevLenRef.current = trackPoints.length;

    if (!webViewRef.current) return;
    webViewRef.current.postMessage(
      JSON.stringify({ type: 'UPDATE_TRACK', points: trackPoints })
    );
  }, [trackPoints]);

  // 定位按钮：将地图中心移到指定坐标
  useEffect(() => {
    if (!locatePoint || !webViewRef.current) return;
    webViewRef.current.postMessage(
      JSON.stringify({ type: 'SET_CENTER', lat: locatePoint.lat, lng: locatePoint.lng })
    );
  }, [locatePoint]);

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        style={styles.webview}
        source={{ html: buildMapHTML(AMAP_KEY, AMAP_SECURITY_CODE) }}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled
        allowsInlineMediaPlayback
        originWhitelist={['*']}
        onError={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  webview: { flex: 1, backgroundColor: '#0d1f20' },
});
