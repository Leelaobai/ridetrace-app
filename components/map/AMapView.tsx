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
import type { WebView as WebViewType } from 'react-native-webview';
import { WebView } from 'react-native-webview';
import { AMAP_KEY, AMAP_SECURITY_CODE } from '../../constants/config';

interface Props {
  trackPoints: { lat: number; lng: number }[];
  followUser?: boolean;
  locatePoint?: { lat: number; lng: number; ts: number } | null;
  userLocation?: { lat: number; lng: number } | null;
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
    window._pendingLocation = null;
    window._polyline = null;
    window._userMarker = null;
    window._map = null;
    window._trackTipAdded = false;
    window._rawPoints = [];

    // Catmull-Rom 曲线插值：在相邻 GPS 点之间生成平滑曲线，仅用于显示
    function buildSmoothPath(pts) {
      if (pts.length < 2) {
        return pts.map(function(p) { return new AMap.LngLat(p.lng, p.lat); });
      }
      var STEPS = 4;
      var path = [new AMap.LngLat(pts[0].lng, pts[0].lat)];
      for (var i = 0; i < pts.length - 1; i++) {
        var p0 = pts[Math.max(0, i - 1)];
        var p1 = pts[i];
        var p2 = pts[i + 1];
        var p3 = pts[Math.min(pts.length - 1, i + 2)];
        for (var s = 1; s <= STEPS; s++) {
          var t = s / STEPS, t2 = t * t, t3 = t2 * t;
          var lat = 0.5 * ((2*p1.lat) + (-p0.lat+p2.lat)*t + (2*p0.lat-5*p1.lat+4*p2.lat-p3.lat)*t2 + (-p0.lat+3*p1.lat-3*p2.lat+p3.lat)*t3);
          var lng = 0.5 * ((2*p1.lng) + (-p0.lng+p2.lng)*t + (2*p0.lng-5*p1.lng+4*p2.lng-p3.lng)*t2 + (-p0.lng+3*p1.lng-3*p2.lng+p3.lng)*t3);
          path.push(new AMap.LngLat(lng, lat));
        }
      }
      return path;
    }

    function initMap() {
      window._map = new AMap.Map('map', {
        zoom: 16,
        center: [121.4737, 31.2304],
        mapStyle: 'amap://styles/dark',
        showLabel: true,
      });

      // 先标记已加载，再处理积压消息，避免 setUserLocation 内部再次进入 pending
      window._amapLoaded = true;

      var pt = window._pendingTrack;
      window._pendingTrack = null;
      if (pt && pt.length > 0) updateTrack(pt);

      var pl = window._pendingLocation;
      window._pendingLocation = null;
      if (pl) setUserLocation(pl.lat, pl.lng, pl.pan);
    }

    function updateTrack(points) {
      if (!window._amapLoaded || !window._map) {
        window._pendingTrack = points;
        return;
      }
      if (points.length < 2) return;

      window._rawPoints = points;
      window._trackTipAdded = false;

      var smoothPath = buildSmoothPath(points);
      var last = new AMap.LngLat(points[points.length - 1].lng, points[points.length - 1].lat);

      if (window._polyline) {
        window._polyline.setPath(smoothPath);
      } else {
        window._polyline = new AMap.Polyline({
          path: smoothPath,
          strokeColor: '#0de3f2',
          strokeWeight: 5,
          strokeOpacity: 0.9,
          lineJoin: 'round',
          lineCap: 'round',
          showDir: true,
        });
        window._map.add(window._polyline);
      }

      window._map.setCenter(last);
    }

    function resetTrack() {
      if (window._polyline) {
        window._map && window._map.remove(window._polyline);
        window._polyline = null;
      }
      window._trackTipAdded = false;
    }

    // 将轨迹的最后一个点实时更新为当前位置，让轨迹始终连到用户点
    function extendTrackTip(lat, lng) {
      if (!window._polyline || !window._amapLoaded) return;
      var path = window._polyline.getPath();
      var tip = new AMap.LngLat(lng, lat);
      if (window._trackTipAdded) {
        path[path.length - 1] = tip;
      } else {
        path.push(tip);
        window._trackTipAdded = true;
      }
      window._polyline.setPath(path);
    }

    function setUserLocation(lat, lng, panToUser) {
      if (!window._amapLoaded || !window._map) {
        window._pendingLocation = { lat: lat, lng: lng, pan: panToUser };
        return;
      }
      var pos = new AMap.LngLat(lng, lat);
      if (window._userMarker) {
        window._userMarker.setPosition(pos);
      } else {
        var dot = document.createElement('div');
        dot.style.cssText = 'width:14px;height:14px;border-radius:50%;background:#0de3f2;border:3px solid #fff;box-shadow:0 0 8px rgba(13,227,242,0.7);';
        window._userMarker = new AMap.Marker({
          position: pos,
          content: dot,
          offset: new AMap.Pixel(-7, -7),
          zIndex: 200,
        });
        window._map.add(window._userMarker);
      }
      if (panToUser) {
        window._map.setCenter(pos);
      }
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
        } else if (msg.type === 'RESET_TRACK') {
          resetTrack();
        } else if (msg.type === 'EXTEND_TRACK_TIP') {
          extendTrackTip(msg.lat, msg.lng);
        } else if (msg.type === 'SET_CENTER') {
          if (window._amapLoaded && window._map) {
            window._map.setCenter(new AMap.LngLat(msg.lng, msg.lat));
          }
        } else if (msg.type === 'SET_LOCATION') {
          setUserLocation(msg.lat, msg.lng, msg.pan);
        }
      } catch(e) {}
    }
  </script>
  <script src="https://webapi.amap.com/maps?v=2.0&key=${amapKey}&callback=initMap"></script>
</body>
</html>`;
}

export function AMapView({ trackPoints, followUser = true, locatePoint, userLocation, style }: Props) {
  const webViewRef = useRef<WebViewType>(null);
  const prevLenRef = useRef(0);
  const isReadyRef = useRef(false);
  const pendingLocationRef = useRef<{ lat: number; lng: number; pan: boolean } | null>(null);

  const postMsg = (msg: object) => {
    webViewRef.current?.postMessage(JSON.stringify(msg));
  };

  const handleLoadEnd = () => {
    isReadyRef.current = true;
    if (pendingLocationRef.current) {
      const { lat, lng, pan } = pendingLocationRef.current;
      postMsg({ type: 'SET_LOCATION', lat, lng, pan });
      pendingLocationRef.current = null;
    }
  };

  useEffect(() => {
    if (trackPoints.length === prevLenRef.current) return;
    prevLenRef.current = trackPoints.length;
    if (!isReadyRef.current) return;
    postMsg({ type: 'UPDATE_TRACK', points: trackPoints });
  }, [trackPoints]);

  useEffect(() => {
    if (!locatePoint) return;
    if (!isReadyRef.current) return;
    postMsg({ type: 'SET_CENTER', lat: locatePoint.lat, lng: locatePoint.lng });
  }, [locatePoint]);

  // userLocation 变化时更新用户点位置；followUser=true 时地图跟随（pan）
  useEffect(() => {
    if (!userLocation) return;
    const msg = { type: 'SET_LOCATION', lat: userLocation.lat, lng: userLocation.lng, pan: followUser };
    if (!isReadyRef.current) {
      pendingLocationRef.current = { lat: userLocation.lat, lng: userLocation.lng, pan: followUser || (pendingLocationRef.current?.pan ?? false) };
      return;
    }
    postMsg(msg);
    // 将轨迹终点实时拉到当前位置，确保轨迹线始终与用户点相连
    postMsg({ type: 'EXTEND_TRACK_TIP', lat: userLocation.lat, lng: userLocation.lng });
  }, [userLocation, followUser]);

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
        onLoadEnd={handleLoadEnd}
        onError={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  webview: { flex: 1, backgroundColor: '#0d1f20' },
});
