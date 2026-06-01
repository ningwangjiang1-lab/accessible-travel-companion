import api from './api';

/**
 * Route Service — 封装路线规划 API 调用
 */

export interface RouteFeature {
  label: string;
  type: 'positive' | 'warning' | 'negative';
}

export interface RouteOption {
  id: string;
  name: string;
  accessibility_score: number;
  distance_meters: number;
  duration_seconds: number;
  distance_display: string;
  duration_display: string;
  features: RouteFeature[];
  is_recommended: boolean;
  origin_address: string;
  destination_address: string;
}

/**
 * AI 路线规划
 * @param destination 目的地地址
 * @param origin 出发地（选填）
 */
export async function planRoutes(
  destination: string,
  origin?: string,
): Promise<RouteOption[]> {
  const response = await api.post('/routes/plan', {destination, origin});
  return response.data as RouteOption[];
}

/**
 * 获取路线详情
 */
export async function getRouteById(id: string): Promise<RouteOption | null> {
  const response = await api.get(`/routes/${id}`);
  return response.data as RouteOption | null;
}
