import api from './api';

/**
 * Rating Service — 封装评价 API 调用
 */

export interface CreateRatingInput {
  score: number;
  tags?: string[];
  comment?: string;
  tip_cents?: number;
}

export interface RatingResult {
  id: string;
  session_id: string;
  reviewer_id: string;
  reviewee_id: string;
  score: number;
  tags: string[];
  comment: string | null;
  tip_cents: number;
  created_at: string;
  companion_name: string;
  companion_role: string;
}

/** 预定义评价标签 */
export const RATING_TAGS = [
  '耐心细致',
  '准时到达',
  '服务周到',
  '熟悉路线',
  '无障碍意识强',
  '沟通顺畅',
  '温柔体贴',
  '专业高效',
  '乐于助人',
  '安全意识高',
];

/**
 * 提交评价
 */
export async function submitRating(
  sessionId: string,
  input: CreateRatingInput,
): Promise<RatingResult> {
  const response = await api.post(`/sessions/${sessionId}/rate`, input);
  return response.data as RatingResult;
}

/**
 * 查询是否已评价
 */
export async function checkRating(
  sessionId: string,
): Promise<{rated: boolean; rating?: RatingResult}> {
  const response = await api.get(`/sessions/${sessionId}/rating`);
  return response.data as {rated: boolean; rating?: RatingResult};
}
