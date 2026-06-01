import api from './api';

/**
 * Match Service — 封装智能匹配 API 调用
 */

export interface CompanionCandidate {
  id: string;
  name: string;
  avatar: string | null;
  role: 'volunteer' | 'professional';
  match_score: number;
  route_overlap: number | null;
  distance_meters: number;
  rating: number;
  completed_trips: number;
  certifications: string[];
  tags: string[];
  hourly_rate_cents: number | null;
  match_id: string;
  match_status: 'pending' | 'accepted' | 'rejected';
}

export interface MatchResult {
  trip_id: string;
  trip_status: string;
  candidates: CompanionCandidate[];
}

/**
 * 获取行程的匹配列表
 */
export async function getMatchesForTrip(tripId: string): Promise<MatchResult> {
  const response = await api.get(`/trips/${tripId}/matches`);
  return response.data as MatchResult;
}

/**
 * 接受匹配
 */
export async function acceptMatch(matchId: string): Promise<{success: boolean; session_id: string}> {
  const response = await api.post(`/matches/${matchId}/accept`);
  return response.data as {success: boolean; session_id: string};
}

/**
 * 拒绝匹配
 */
export async function rejectMatch(matchId: string): Promise<{success: boolean}> {
  const response = await api.post(`/matches/${matchId}/reject`);
  return response.data as {success: boolean};
}
