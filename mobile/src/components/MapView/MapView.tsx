import React from 'react';
import {View, StyleSheet, Text} from 'react-native';

/**
 * MapView — 地图组件
 *
 * Web 端使用 iframe 嵌入 OpenStreetMap，
 * 原生端使用 react-native-maps（后续替换）。
 */

export interface MapMarker {
  lat: number;
  lon: number;
  label: string;
  color: string;
}

export interface MapViewProps {
  /** 地图中心 [lat, lon] */
  center?: [number, number];
  /** 缩放级别 */
  zoom?: number;
  /** 标记点列表 */
  markers?: MapMarker[];
  /** 路线坐标数组 [[lat,lon], ...] */
  route?: [number, number][];
  /** 高度 */
  height?: number;
  /** 当前 GPS 位置（蓝色脉冲点） */
  currentPosition?: [number, number];
}

const MapView: React.FC<MapViewProps> = ({
  center = [39.908, 116.397],
  zoom = 15,
  markers = [],
  route,
  height = 280,
  currentPosition,
}) => {
  const isWeb = typeof window !== 'undefined';

  if (!isWeb) {
    return (
      <View style={[styles.container, {height}]}>
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>📍 地图组件（原生端集成 react-native-maps）</Text>
        </View>
      </View>
    );
  }

  // 构建 OpenStreetMap iframe URL
  // 使用 osm-map-embed 方式：https://www.openstreetmap.org/export/embed.html
  const bbox = `${center[1] - 0.01},${center[0] - 0.01},${center[1] + 0.01},${center[0] + 0.01}`;

  // 构建标记参数
  let markerParams = markers.length > 0
    ? `&marker=${markers.map(m => `${m.lat},${m.lon}`).join('&marker=')}`
    : `&marker=${center[0]},${center[1]}`;

  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik${markerParams}`;

  return (
    <View style={[styles.container, {height}]}>
      <iframe
        src={osmUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '8px',
        }}
        title="OpenStreetMap"
        loading="lazy"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  fallback: {
    flex: 1,
    backgroundColor: '#E8F1FB',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  fallbackText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default MapView;
