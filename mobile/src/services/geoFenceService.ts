import api from './api';

/**
 * Geo Fence Service — 封装电子围栏 API
 */

/** GeoJSON Point */
export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface GeoFence {
  id: string;
  user_id: string;
  name: string;
  /** 中心点 GeoJSON */
  center: GeoPoint;
  /** 半径（米） */
  radius_meters: number;
  /** 是否启用 */
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateFenceInput {
  name: string;
  center: GeoPoint;
  radius_meters?: number;
}

export interface UpdateFenceInput {
  name?: string;
  center?: GeoPoint;
  radius_meters?: number;
  is_active?: boolean;
}

/** 半径预设选项 */
export const RADIUS_PRESETS = [
  {value: 300, icon: '🏘️', label: '300m', description: '社区范围'},
  {value: 500, icon: '🏠', label: '500m', description: '街区范围'},
  {value: 1000, icon: '🏙️', label: '1km', description: '片区范围'},
  {value: 2000, icon: '🌆', label: '2km', description: '区域范围'},
  {value: 5000, icon: '🏛️', label: '5km', description: '全区范围'},
];

/** 常用位置预设（北京地区） */
export const LOCATION_PRESETS: {name: string; coordinates: [number, number]}[] = [
  {name: '🏠 我的家（模拟）', coordinates: [116.397, 39.908]},
  {name: '🏥 协和医院', coordinates: [116.409, 39.913]},
  {name: '🏢 天安门广场', coordinates: [116.397, 39.909]},
  {name: '🚉 北京站', coordinates: [116.428, 39.903]},
  {name: '🏫 北京大学', coordinates: [116.310, 39.992]},
  {name: '🛒 王府井商圈', coordinates: [116.417, 39.914]},
];

/** 获取电子围栏列表 */
export async function getFences(): Promise<GeoFence[]> {
  const response = await api.get('/geo-fences');
  return response.data as GeoFence[];
}

/** 创建电子围栏 */
export async function createFence(input: CreateFenceInput): Promise<GeoFence> {
  const response = await api.post('/geo-fences', input);
  return response.data as GeoFence;
}

/** 更新电子围栏 */
export async function updateFence(
  id: string,
  input: UpdateFenceInput,
): Promise<GeoFence> {
  const response = await api.put(`/geo-fences/${id}`, input);
  return response.data as GeoFence;
}

/** 删除电子围栏 */
export async function deleteFence(id: string): Promise<void> {
  await api.delete(`/geo-fences/${id}`);
}

/** 切换启用/禁用 */
export async function toggleFence(id: string): Promise<GeoFence> {
  const response = await api.patch(`/geo-fences/${id}/toggle`);
  return response.data as GeoFence;
}
