import {query} from '../db';
import {AppError} from './authService';

/**
 * Rating Service — 评价业务逻辑
 *
 * 在陪行会话完成后，用户对陪行人进行评分（1-5 星）、标签评价、
 * 文字评论和打赏（tip）。
 */

export interface CreateRatingInput {
  score: number;         // 1-5 星
  tags?: string[];       // 评价标签
  comment?: string;      // 文字评论（可选）
  tip_cents?: number;    // 打赏金额（分，0-50000）
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
  /** 陪行人信息（用于展示） */
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
 * 创建评价
 *
 * 1. 验证 session 存在且属于当前用户
 * 2. 验证 session 状态为 completed 或 emergency_ended
 * 3. 检查是否已评价（防止重复）
 * 4. 写入 ratings 表
 */
export async function createRating(
  sessionId: string,
  userId: string,
  input: CreateRatingInput,
): Promise<RatingResult> {
  // 验证评分范围
  if (!input.score || input.score < 1 || input.score > 5) {
    throw new AppError('评分必须在 1-5 之间', 400);
  }

  // 验证打赏金额
  const tipCents = input.tip_cents ?? 0;
  if (tipCents < 0 || tipCents > 50000) {
    throw new AppError('打赏金额不能超过 ¥500', 400);
  }

  // 查询会话
  const sessionResult = await query(
    `SELECT cs.*, u.name as companion_name, u.role as companion_role
     FROM companion_sessions cs
     JOIN users u ON u.id = cs.companion_id
     WHERE cs.id = $1 AND cs.user_id = $2`,
    [sessionId, userId],
  );

  if (sessionResult.rows.length === 0) {
    throw new AppError('会话不存在', 404);
  }

  const session = sessionResult.rows[0];

  // 验证会话已完成
  if (!['completed', 'emergency_ended'].includes(session.status)) {
    throw new AppError('只能评价已完成的陪行会话', 400);
  }

  // 检查是否已评价
  const existingRating = await query(
    `SELECT id FROM ratings WHERE session_id = $1 AND reviewer_id = $2`,
    [sessionId, userId],
  );

  if (existingRating.rows.length > 0) {
    throw new AppError('您已经评价过本次陪行', 409);
  }

  // 创建评价
  const result = await query(
    `INSERT INTO ratings (session_id, reviewer_id, reviewee_id, score, tags, comment, tip_cents)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      sessionId,
      userId,
      session.companion_id,
      input.score,
      input.tags || [],
      input.comment || null,
      tipCents,
    ],
  );

  const rating = result.rows[0];

  return {
    id: rating.id,
    session_id: rating.session_id,
    reviewer_id: rating.reviewer_id,
    reviewee_id: rating.reviewee_id,
    score: rating.score,
    tags: rating.tags || [],
    comment: rating.comment || null,
    tip_cents: rating.tip_cents || 0,
    created_at: rating.created_at instanceof Date ? rating.created_at.toISOString() : rating.created_at,
    companion_name: session.companion_name || '陪行人',
    companion_role: session.companion_role || 'volunteer',
  };
}

/**
 * 获取会话的评价（检查是否已评）
 */
export async function getRatingBySession(
  sessionId: string,
  userId: string,
): Promise<RatingResult | null> {
  const result = await query(
    `SELECT r.*, u.name as companion_name, u.role as companion_role
     FROM ratings r
     JOIN companion_sessions cs ON cs.id = r.session_id
     JOIN users u ON u.id = cs.companion_id
     WHERE r.session_id = $1 AND r.reviewer_id = $2`,
    [sessionId, userId],
  );

  if (result.rows.length === 0) return null;

  const rating = result.rows[0];
  return {
    id: rating.id,
    session_id: rating.session_id,
    reviewer_id: rating.reviewer_id,
    reviewee_id: rating.reviewee_id,
    score: rating.score,
    tags: rating.tags || [],
    comment: rating.comment || null,
    tip_cents: rating.tip_cents || 0,
    created_at: rating.created_at instanceof Date ? rating.created_at.toISOString() : rating.created_at,
    companion_name: rating.companion_name || '陪行人',
    companion_role: rating.companion_role || 'volunteer',
  };
}
