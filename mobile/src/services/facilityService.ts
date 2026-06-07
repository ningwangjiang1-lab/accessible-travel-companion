import api from './api';

/**
 * Facility Service — 封装无障碍设施 API
 */

export type FacilityType = 'accessible_toilet' | 'parking' | 'elevator' | 'ramp' | 'low_counter' | 'braille_sign';
export type FacilityStatus = 'normal' | 'maintenance' | 'out_of_service' | 'crowded';

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface FacilitySummary {
  id: string;
  name: string;
  facility_type: FacilityType;
  lat: number;
  lon: number;
  address: string | null;
  floor: string | null;
  door_width_cm: number | null;
  has_handrail: boolean;
  description: string | null;
  source: string;
  verified: boolean;
  current_status: FacilityStatus | null;
  distance_meters?: number;
}

export interface StatusHistoryItem {
  status: FacilityStatus;
  note: string | null;
  reported_by: string | null;
  reported_at: string;
  valid_until: string | null;
}

export interface FacilityDetail extends FacilitySummary {
  status_history: StatusHistoryItem[];
}

export interface FacilityTypeInfo {
  value: FacilityType;
  label: string;
  icon: string;
}

export interface FacilitySearchParams {
  q?: string;
  facility_type?: FacilityType;
  lat?: number;
  lng?: number;
  radius_meters?: number;
  limit?: number;
  offset?: number;
}

/** 设施类型配置 */
export const FACILITY_TYPE_MAP: Record<FacilityType, {label: string; icon: string}> = {
  accessible_toilet: {label: '无障碍厕所', icon: '🚻'},
  parking: {label: '无障碍停车位', icon: '🅿️'},
  elevator: {label: '无障碍电梯', icon: '🛗'},
  ramp: {label: '坡道', icon: '🔽'},
  low_counter: {label: '低位柜台', icon: '🪟'},
  braille_sign: {label: '盲文标识', icon: '🖐️'},
};

/** 状态中文 */
export const STATUS_LABELS: Record<FacilityStatus, string> = {
  normal: '正常',
  maintenance: '维护中',
  out_of_service: '暂停使用',
  crowded: '拥挤',
};

/** 状态颜色 */
export const STATUS_VARIANTS: Record<FacilityStatus, 'success' | 'warning' | 'danger'> = {
  normal: 'success',
  maintenance: 'warning',
  out_of_service: 'danger',
  crowded: 'warning',
};

/** 搜索半径预设 */
export const RADIUS_OPTIONS = [
  {value: 500, label: '500m'},
  {value: 1000, label: '1km'},
  {value: 2000, label: '2km'},
  {value: 5000, label: '5km'},
];

/** 搜索设施 */
export async function searchFacilities(
  params: FacilitySearchParams = {},
): Promise<{facilities: FacilitySummary[]; total: number}> {
  const response = await api.get('/facilities', {params});
  return response.data;
}

/** 获取设施详情 */
export async function getFacilityById(id: string): Promise<FacilityDetail> {
  const response = await api.get(`/facilities/${id}`);
  return response.data as FacilityDetail;
}

/** 获取设施类型列表 */
export async function getFacilityTypes(): Promise<FacilityTypeInfo[]> {
  const response = await api.get('/facilities/types');
  return response.data.types;
}

// ============ 设施上报 ============

export interface CreateFacilityInput {
  name: string;
  facility_type: FacilityType;
  lat: number;
  lon: number;
  address?: string;
  description?: string;
  photo_url?: string;
}

/** 上报新设施 */
export async function createFacility(input: CreateFacilityInput): Promise<FacilitySummary> {
  const response = await api.post('/facilities', input);
  return response.data as FacilitySummary;
}

/** 上报设施状态变更 */
export async function reportFacilityStatus(
  facilityId: string,
  status: string,
  note?: string,
): Promise<void> {
  await api.post(`/facilities/${facilityId}/status`, {status, note});
}
