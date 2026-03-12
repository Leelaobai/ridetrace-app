/**
 * 轨迹缩略图（列表卡片封面用）
 *
 * 方案：高德 REST 静态地图把轨迹烧录进图片（API 自动 fitView + 画轨迹线），
 * 上层加半透明暗色 View 让底图融入 App 暗色主题。
 *
 * 为什么不用 SVG 叠加：
 *   GPS 点是 WGS-84，高德 API 内部是 GCJ-02（火星坐标），偏差 100-700m；
 *   用 API 烧录轨迹则坐标系由 API 统一处理，无偏差问题。
 */

import { useCallback, useState } from 'react';
import { View, Image, StyleSheet, LayoutChangeEvent } from 'react-native';
import { buildStaticMapUrl } from '../../utils/amapStatic';
import { AMAP_REST_KEY } from '../../constants/config';

type Point = { lat: number; lng: number };

interface Props {
  points: Point[];
  style?: object;
}

export function TrackPreview({ points, style }: Props) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setSize(prev =>
        prev && Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1
          ? prev
          : { w: Math.round(width), h: Math.round(height) },
      );
    }
  }, []);

  if (points.length < 2) return null;

  const W = size?.w ?? 600;
  const H = size?.h ?? 140;
  const mapUrl = buildStaticMapUrl(points, AMAP_REST_KEY, W, H);

  return (
    <View style={[styles.container, style]} onLayout={onLayout}>
      {mapUrl && (
        <Image
          source={{ uri: mapUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="stretch"
        />
      )}
      {/* 暗色遮罩：压暗底图，让亮色（青色轨迹、绿/红标记）更突出 */}
      <View style={[StyleSheet.absoluteFill, styles.overlay]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', backgroundColor: '#081112' },
  overlay: { backgroundColor: 'rgba(0, 0, 0, 0.38)' },
});
