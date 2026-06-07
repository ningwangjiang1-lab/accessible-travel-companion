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

// ============ 同行者匹配 ============

export interface PeerCandidate {
  trip_id: string;
  user_id: string;
  user_name: string;
  disability_type: string;
  start_address: string;
  end_address: string;
  start_time: string | null;
  route_overlap_pct: number;
  complementarity_score: number;
  complementarity_desc: string | null;
  total_score: number;
}

export interface PeerMatch {
  id: string;
  trip_a_id: string;
  trip_b_id: string;
  user_a_id: string;
  user_b_id: string;
  peer_name: string;
  peer_disability_type: string;
  peer_start_address: string;
  peer_end_address: string;
  route_overlap_pct: number | null;
  complementarity_score: number | null;
  status: string;
  created_at: string;
}

export interface ActivePeerMatch {
  id: string;
  my_trip_id: string;
  peer_trip_id: string;
  peer_user_id: string;
  peer_name: string;
  peer_disability_type: string;
  route_overlap_pct: number | null;
  complementarity_score: number | null;
  complementarity_desc: string | null;
  peer_start_address: string;
  peer_end_address: string;
  peer_lat: number;
  peer_lon: number;
  my_start_lat: number;
  my_start_lon: number;
  my_end_lat: number;
  my_end_lon: number;
  status: string;
}

/** 开启同行者匹配 */
export async function enablePeerMatching(tripId: string): Promise<void> {
  await api.post(`/trips/${tripId}/peer-match`);
}

/** 获取同行候选列表 */
export async function getPeerCandidates(): Promise<PeerCandidate[]> {
  const response = await api.get('/trips/peer-candidates');
  return response.data.candidates as PeerCandidate[];
}

/** 创建同行邀请 */
export async function createPeerMatch(candidateTripId: string): Promise<PeerMatch> {
  const response = await api.post('/peer-matches', {candidate_trip_id: candidateTripId});
  return response.data as PeerMatch;
}

/** 接受同行匹配 */
export async function acceptPeerMatch(matchId: string): Promise<PeerMatch> {
  const response = await api.post(`/peer-matches/${matchId}/accept`);
  return response.data as PeerMatch;
}

/** 拒绝同行匹配 */
export async function rejectPeerMatch(matchId: string): Promise<void> {
  await api.post(`/peer-matches/${matchId}/reject`);
}

/** 获取活跃同行关系 */
export async function getActivePeerMatch(): Promise<ActivePeerMatch | null> {
  const response = await api.get('/peer-matches/active');
  return response.data.active as ActivePeerMatch | null;
}
