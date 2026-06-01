import {query} from '../db';
import {AppError} from './authService';

/**
 * Session Service — 陪行会话业务逻辑
 *
 * 管理 companion_sessions 的查询与状态变更：
 * - 获取用户当前活跃会话（含陪行人/行程详情）
 * - 获取单个会话详情
 * - 暂停/恢复/结束/紧急结束会话
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
  /** 经过的分钟数（基于 started_at 计算） */
  elapsed_minutes: number;
  companion: SessionCompanion;
  trip: SessionTrip;
  /** 匹配分数 */
  match_score: number | null;
  /** 模拟的陪行人实时位置（经纬度） */
  companion_location: {lat: number; lon: number} | null;
  /** 模拟的行程进度百分比 */
  progress_percent: number;
}

// ---- 模拟陪行人扩展数据 ----

const COMPANION_EXTRA: Record<string, {
  phone: string;
  rating: number;
  completed_trips: number;
  certifications: string[];
  tags: string[];
  hourly_rate_cents: number | null;
}> = {
  comp_001: {phone: '138****6789', rating: 4.8, completed_trips: 156, certifications: ['基础培训', '急救认证'], tags: ['耐心细致', '熟悉本地', '轮椅经验'], hourly_rate_cents: null},
  comp_002: {phone: '139****7890', rating: 4.9, completed_trips: 203, certifications: ['基础培训', '手语翻译', '导盲犬认证'], tags: ['手语熟练', '视障陪护', '温柔体贴'], hourly_rate_cents: null},
  comp_003: {phone: '137****5678', rating: 4.6, completed_trips: 89, certifications: ['基础培训'], tags: ['年轻力壮', '响应快速'], hourly_rate_cents: null},
  pro_001: {phone: '136****4567', rating: 4.9, completed_trips: 512, certifications: ['护士执业证', '康复治疗师', '急救认证'], tags: ['临床经验', '康复护理', '无障碍专家'], hourly_rate_cents: 8000},
  pro_002: {phone: '135****3456', rating: 4.7, completed_trips: 298, certifications: ['护理员证', '急救认证'], tags: ['细心周到', '价格实惠', '熟悉医院'], hourly_rate_cents: 5000},
};

/**
 * 获取用户当前活跃的陪行会话
 */
export async function getActiveSession(userId: string): Promise<SessionDetail | null> {
  const result = await query(
    `SELECT
      cs.id,
      cs.trip_id,
      cs.match_id,
      cs.user_id,
      cs.companion_id,
      cs.status,
      cs.started_at,
      cs.ended_at,
      t.start_address,
      t.end_address,
      t.companion_type,
      t.special_needs,
      t.budget_cents,
      t.start_time,
      u.name as companion_name,
      u.role as companion_role,
      m.match_score
    FROM companion_sessions cs
    JOIN trips t ON t.id = cs.trip_id
    JOIN users u ON u.id = cs.companion_id
    LEFT JOIN matches m ON m.id = cs.match_id
    WHERE cs.user_id = $1
      AND cs.status IN ('active', 'paused')
    ORDER BY cs.started_at DESC
    LIMIT 1`,
    [userId],
  );

  if (result.rows.length === 0) return null;

  return buildSessionDetail(result.rows[0]);
}

/**
 * 获取单个会话详情
 */
export async function getSessionDetail(
  sessionId: string,
  userId: string,
): Promise<SessionDetail> {
  const result = await query(
    `SELECT
      cs.id,
      cs.trip_id,
      cs.match_id,
      cs.user_id,
      cs.companion_id,
      cs.status,
      cs.started_at,
      cs.ended_at,
      t.start_address,
      t.end_address,
      t.companion_type,
      t.special_needs,
      t.budget_cents,
      t.start_time,
      u.name as companion_name,
      u.role as companion_role,
      m.match_score
    FROM companion_sessions cs
    JOIN trips t ON t.id = cs.trip_id
    JOIN users u ON u.id = cs.companion_id
    LEFT JOIN matches m ON m.id = cs.match_id
    WHERE cs.id = $1 AND cs.user_id = $2`,
    [sessionId, userId],
  );

  if (result.rows.length === 0) {
    throw new AppError('会话不存在', 404);
  }

  return buildSessionDetail(result.rows[0]);
}

/**
 * 更新会话状态
 *
 * 支持的操作：
 * - pause: active → paused
 * - resume: paused → active
 * - complete: active/paused → completed（同时更新 trip 状态）
 * - emergency_end: active/paused → emergency_ended（同时更新 trip 状态）
 */
export async function updateSessionStatus(
  sessionId: string,
  userId: string,
  newStatus: 'active' | 'paused' | 'completed' | 'emergency_ended',
): Promise<SessionDetail> {
  // 查询会话
  const sessionResult = await query(
    `SELECT cs.*, t.id as trip_id
     FROM companion_sessions cs
     JOIN trips t ON t.id = cs.trip_id
     WHERE cs.id = $1 AND cs.user_id = $2`,
    [sessionId, userId],
  );

  if (sessionResult.rows.length === 0) {
    throw new AppError('会话不存在', 404);
  }

  const session = sessionResult.rows[0];

  // 验证状态转换
  const validTransitions: Record<string, string[]> = {
    active: ['paused', 'completed', 'emergency_ended'],
    paused: ['active', 'completed', 'emergency_ended'],
    completed: [],
    emergency_ended: [],
  };

  if (!validTransitions[session.status]?.includes(newStatus)) {
    throw new AppError(
      `无法从 ${session.status} 转为 ${newStatus}`,
      400,
    );
  }

  // 更新会话状态
  const endedAt = ['completed', 'emergency_ended'].includes(newStatus)
    ? 'NOW()'
    : 'NULL';

  await query(
    `UPDATE companion_sessions
     SET status = $1,
         ended_at = ${endedAt},
         updated_at = NOW()
     WHERE id = $2`,
    [newStatus, sessionId],
  );

  // 同步更新 trip 状态
  const tripStatusMap: Record<string, string> = {
    active: 'in_progress',
    paused: 'in_progress',
    completed: 'completed',
    emergency_ended: 'cancelled',
  };

  await query(
    `UPDATE trips SET status = $1, updated_at = NOW()
     WHERE id = $2`,
    [tripStatusMap[newStatus], session.trip_id],
  );

  // 返回更新后的详情
  return getSessionDetail(sessionId, userId);
}

// ---- 辅助函数 ----

function buildSessionDetail(row: any): SessionDetail {
  const companionId: string = row.companion_id;
  const extra = COMPANION_EXTRA[companionId] || {
    phone: '138****0000',
    rating: 4.5,
    completed_trips: 0,
    certifications: [],
    tags: [],
    hourly_rate_cents: null,
  };

  const startedAt = new Date(row.started_at);
  const now = new Date();
  const elapsedMinutes = Math.floor((now.getTime() - startedAt.getTime()) / 60000);

  // 模拟进度（基于经过时间，最多 95%）
  const progressPercent = Math.min(95, Math.floor(elapsedMinutes / 30 * 100));

  return {
    id: row.id,
    trip_id: row.trip_id,
    match_id: row.match_id || null,
    user_id: row.user_id,
    companion_id: row.companion_id,
    status: row.status,
    started_at: row.started_at instanceof Date ? row.started_at.toISOString() : row.started_at,
    ended_at: row.ended_at
      ? (row.ended_at instanceof Date ? row.ended_at.toISOString() : row.ended_at)
      : null,
    elapsed_minutes: elapsedMinutes,
    companion: {
      id: companionId,
      name: row.companion_name || '陪行人',
      avatar: null,
      role: row.companion_role || 'volunteer',
      phone: extra.phone,
      rating: extra.rating,
      completed_trips: extra.completed_trips,
      certifications: extra.certifications,
      tags: extra.tags,
      hourly_rate_cents: extra.hourly_rate_cents,
    },
    trip: {
      id: row.trip_id,
      start_address: row.start_address || '',
      end_address: row.end_address || '',
      companion_type: row.companion_type || 'volunteer',
      special_needs: row.special_needs || [],
      budget_cents: row.budget_cents || null,
      start_time: row.start_time instanceof Date ? row.start_time.toISOString() : (row.start_time || null),
    },
    match_score: row.match_score ? Number(row.match_score) : null,
    companion_location: {
      lat: 39.908 + (Math.random() - 0.5) * 0.005,
      lon: 116.397 + (Math.random() - 0.5) * 0.005,
    },
    progress_percent: progressPercent,
  };
}
