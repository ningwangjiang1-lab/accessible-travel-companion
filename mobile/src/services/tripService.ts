import api from './api';

/**
 * Trip Service — 封装行程相关 API 调用
 */

export interface ActiveTrip {
  id: string;
  user_id: string;
  start_address: string | null;
  end_address: string | null;
  start_lat: number | null;
  start_lon: number | null;
  end_lat: number | null;
  end_lon: number | null;
  start_time: string | null;
  companion_type: string;
  status: string;
  companion_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTripInput {
  start_address: string;
  end_address: string;
  companion_type: 'volunteer' | 'professional';
  special_needs?: string[];
  budget_cents?: number;
  start_time?: string;
}

export interface TripResult {
  id: string;
  user_id: string;
  start_address: string;
  end_address: string;
  companion_type: string;
  special_needs: string[];
  budget_cents: number | null;
  status: string;
  start_time: string | null;
  created_at: string;
}

/**
 * 获取当前用户的进行中行程
 */
export async function getActiveTrip(): Promise<ActiveTrip | null> {
  const response = await api.get('/trips/active');
  return response.data as ActiveTrip | null;
}

/**
 * 发布新行程
 */
export async function createTrip(input: CreateTripInput): Promise<TripResult> {
  const response = await api.post('/trips', input);
  return response.data as TripResult;
}

/**
 * 获取用户行程列表
 */
export async function getUserTrips(limit = 10, offset = 0): Promise<TripResult[]> {
  const response = await api.get('/trips', {params: {limit, offset}});
  return response.data as TripResult[];
}

/** 服务模式：可接单的行程 */
export interface AvailableTrip {
  id: string;
  user_name: string;
  disability_type: string;
  start_address: string;
  end_address: string;
  companion_type: string;
  special_needs: string[];
  status: string;
  created_at: string;
}

/** 获取附近待接单行程（服务模式） */
export async function getAvailableTrips(): Promise<AvailableTrip[]> {
  const response = await api.get('/trips/available');
  return response.data as AvailableTrip[];
}

/** 服务模式：我已接单的行程 */
export interface AcceptedTrip {
  id: string;
  user_name: string;
  disability_type: string;
  start_address: string;
  end_address: string;
  companion_type: string;
  special_needs: string[];
  status: string;
  match_status: string;
  match_id: string;
  created_at: string;
}

/** 获取我已接单的行程 */
export async function getMyAcceptedTrips(): Promise<AcceptedTrip[]> {
  const response = await api.get('/trips/accepted');
  return response.data as AcceptedTrip[];
}

/** 志愿者接单 */
export async function acceptTrip(tripId: string): Promise<any> {
  const response = await api.post(`/trips/${tripId}/accept`);
  return response.data;
}

/** 取消行程 */
export async function cancelTrip(tripId: string): Promise<void> {
  await api.post(`/trips/${tripId}/cancel`);
}
