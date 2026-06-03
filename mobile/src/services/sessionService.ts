import api from './api';

/**
 * Session Service — 封装陪行会话 API 调用
 */

export interface SessionCompanion {
  id: string;
  name: string;
  avatar: string | null;
  role: 'volunteer' | 'professional';
  phone: string;
  rating: number;
  completed_trips: number;
  certifications: string[];
  tags: string[];
  hourly_rate_cents: number | null;
}

export interface SessionTrip {
  id: string;
  start_address: string;
  end_address: string;
  companion_type: string;
  special_needs: string[];
  budget_cents: number | null;
  start_time: string | null;
}

export interface SessionDetail {
  id: string;
  trip_id: string;
  match_id: string | null;
  user_id: string;
  companion_id: string;
  status: 'active' | 'paused' | 'completed' | 'emergency_ended';
  started_at: string;
  ended_at: string | null;
  elapsed_minutes: number;
  companion: SessionCompanion;
  trip: SessionTrip;
  match_score: number | null;
  companion_location: {lat: number; lon: number} | null;
  progress_percent: number;
}

export type SessionStatus = 'active' | 'paused' | 'completed' | 'emergency_ended';

/**
 * 开始陪行：从已匹配行程创建会话
 */
export async function startSession(tripId: string): Promise<SessionDetail> {
  const response = await api.post('/sessions/start', {trip_id: tripId});
  return response.data as SessionDetail;
}

/**
 * 获取当前活跃的陪行会话
 */
export async function getActiveSession(): Promise<SessionDetail> {
  const response = await api.get('/sessions/active');
  return response.data as SessionDetail;
}

/**
 * 获取单个会话详情
 */
export async function getSessionDetail(sessionId: string): Promise<SessionDetail> {
  const response = await api.get(`/sessions/${sessionId}`);
  return response.data as SessionDetail;
}

/**
 * 更新会话状态
 */
export async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus,
): Promise<SessionDetail> {
  const response = await api.patch(`/sessions/${sessionId}/status`, {status});
  return response.data as SessionDetail;
}
