import api from './api';

/**
 * Navigation Service — 封装实时导航 API 调用
 */

export interface NavigationStep {
  index: number;
  instruction: string;
  distance_meters: number;
  duration_seconds: number;
  accessibility_note: string | null;
  type: string;
  accessibility_level: 'good' | 'ok' | 'warning' | 'danger';
}

export interface ObstacleWarning {
  id: string;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  distance_ahead_meters: number;
  icon: string;
}

export interface NavigationData {
  route: {
    id: string;
    name: string;
    origin_address: string;
    destination_address: string;
    distance_display: string;
    duration_display: string;
    accessibility_score: number;
  };
  steps: NavigationStep[];
  obstacles: ObstacleWarning[];
  companion: {
    name: string;
    phone: string;
  } | null;
}

/**
 * 获取路线导航数据（逐向导航指令 + 障碍提醒）
 */
export async function getNavigationData(routeId: string): Promise<NavigationData> {
  const response = await api.get(`/routes/${routeId}/navigate`);
  return response.data as NavigationData;
}
