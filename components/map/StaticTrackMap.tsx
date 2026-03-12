/**
 * 只读轨迹地图（骑行详情用）
 * 自动缩放以显示全程轨迹，不显示当前位置，不跟随
 */

import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { AMAP_KEY, AMAP_SECURITY_CODE } from '../../constants/config';

interface Props {
  trackPoints: { lat: number; lng: number }[];
  style?: object;
}

function buildStaticMapHTML(amapKey: string, securityCode: string) {
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
    window._AMapSecurityConfig = { securityJsCode: '${securityCode}' };
    window._amapLoaded = false;
    window._pendingPoints = null;
    window._map = null;

    function initMap() {
      window._map = new AMap.Map('map', {
        zoom: 14,
        center: [121.4737, 31.2304],
        mapStyle: 'amap://styles/dark',
        showLabel: true,
      });
      window._amapLoaded = true;
      if (window._pendingPoints) {
        drawTrack(window._pendingPoints);
        window._pendingPoints = null;
      }
    }

    function drawTrack(points) {
      if (!window._amapLoaded || !window._map) {
        window._pendingPoints = points;
        return;
      }
      if (!points || points.length < 2) return;

      var coords = points.map(function(p) {
        return new AMap.LngLat(p.lng, p.lat);
      });

      // 绘制轨迹线
      var polyline = new AMap.Polyline({
        path: coords,
        strokeColor: '#0de3f2',
        strokeWeight: 4,
        strokeOpacity: 0.9,
        lineJoin: 'round',
        lineCap: 'round',
        showDir: true,
      });
      window._map.add(polyline);

      // 起点标记（绿色）
      new AMap.Marker({
        position: coords[0],
        content: '<div style="width:10px;height:10px;border-radius:50%;background:#4CAF50;border:2px solid #fff;"></div>',
        offset: new AMap.Pixel(-5, -5),
        map: window._map,
      });

      // 终点标记（红色）
      new AMap.Marker({
        position: coords[coords.length - 1],
        content: '<div style="width:10px;height:10px;border-radius:50%;background:#F44336;border:2px solid #fff;"></div>',
        offset: new AMap.Pixel(-5, -5),
        map: window._map,
      });

      // 自动缩放以显示全部轨迹
      window._map.setFitView([polyline], false, [40, 40, 40, 40]);
    }

    document.addEventListener('message', function(e) { handleMsg(e.data); });
    window.addEventListener('message', function(e) { handleMsg(e.data); });

    function handleMsg(data) {
      try {
        var msg = JSON.parse(data);
        if (msg.type === 'DRAW_TRACK') drawTrack(msg.points);
      } catch(e) {}
    }
  </script>
  <script src="https://webapi.amap.com/maps?v=2.0&key=${amapKey}&callback=initMap"></script>
</body>
</html>`;
}

export function StaticTrackMap({ trackPoints, style }: Props) {
  const webViewRef = useRef<WebView>(null);
  const drawnRef = useRef(false);

  const sendTrack = () => {
    if (trackPoints.length < 2 || drawnRef.current) return;
    drawnRef.current = true;
    webViewRef.current?.postMessage(
      JSON.stringify({ type: 'DRAW_TRACK', points: trackPoints })
    );
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        style={styles.webview}
        source={{ html: buildStaticMapHTML(AMAP_KEY, AMAP_SECURITY_CODE) }}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        onLoadEnd={sendTrack}
        onError={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  webview: { flex: 1, backgroundColor: '#0d1f20' },
});
