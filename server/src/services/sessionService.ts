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

// ---- 模拟陪行人扩展数据（与 matchService.ts 保持一致） ----

const COMP_001_UUID = 'a0000001-0001-0001-0001-000000000001';
const COMP_002_UUID = 'a0000001-0001-0001-0001-000000000002';
const COMP_003_UUID = 'a0000001-0001-0001-0001-000000000003';
const PRO_001_UUID  = 'b0000001-0001-0001-0001-000000000001';
const PRO_002_UUID  = 'b0000001-0001-0001-0001-000000000002';

interface MockCompanionFull {
  id: string;
  phone: string;
  name: string;
  role: 'volunteer' | 'professional';
  rating: number;
  completed_trips: number;
  certifications: string[];
  tags: string[];
  hourly_rate_cents: number | null;
}

const ALL_COMPANIONS: MockCompanionFull[] = [
  {id: COMP_001_UUID, phone: '138****6789', name: '李国华', role: 'volunteer', rating: 4.8, completed_trips: 156, certifications: ['基础培训', '急救认证'], tags: ['耐心细致', '熟悉本地', '轮椅经验'], hourly_rate_cents: null},
  {id: COMP_002_UUID, phone: '139****7890', name: '王晓芳', role: 'volunteer', rating: 4.9, completed_trips: 203, certifications: ['基础培训', '手语翻译', '导盲犬认证'], tags: ['手语熟练', '视障陪护', '温柔体贴'], hourly_rate_cents: null},
  {id: COMP_003_UUID, phone: '137****5678', name: '张永强', role: 'volunteer', rating: 4.6, completed_trips: 89, certifications: ['基础培训'], tags: ['年轻力壮', '响应快速'], hourly_rate_cents: null},
  {id: PRO_001_UUID,  phone: '136****4567', name: '陈主任', role: 'professional', rating: 4.9, completed_trips: 512, certifications: ['护士执业证', '康复治疗师', '急救认证'], tags: ['临床经验', '康复护理', '无障碍专家'], hourly_rate_cents: 8000},
  {id: PRO_002_UUID,  phone: '135****3456', name: '刘护工', role: 'professional', rating: 4.7, completed_trips: 298, certifications: ['护理员证', '急救认证'], tags: ['细心周到', '价格实惠', '熟悉医院'], hourly_rate_cents: 5000},
];

let _companionsEnsured = false;

async function ensureCompanionUsers(): Promise<void> {
  if (_companionsEnsured) return;
  for (const comp of ALL_COMPANIONS) {
    await query(
      `INSERT INTO users (id, phone, name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET name = $3, role = $4`,
      [comp.id, comp.phone, comp.name, comp.role],
    );
  }
  _companionsEnsured = true;
}

const COMPANION_EXTRA: Record<string, {
  phone: string;
  rating: number;
  completed_trips: number;
  certifications: string[];
  tags: string[];
  hourly_rate_cents: number | null;
}> = {};

for (const comp of ALL_COMPANIONS) {
  COMPANION_EXTRA[comp.id] = {
    phone: comp.phone,
    rating: comp.rating,
    completed_trips: comp.completed_trips,
    certifications: comp.certifications,
    tags: comp.tags,
    hourly_rate_cents: comp.hourly_rate_cents,
  };
}

/**
 * 获取用户当前活跃的陪行会话
 */
export async function getActiveSession(userId: string): Promise<SessionDetail | null> {
  await ensureCompanionUsers();
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
  await ensureCompanionUsers();
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

/**
 * 开始陪行：从已匹配的行程创建 companion_session
 * 志愿者点击"开始陪行"时调用
 */
export async function startSession(
  companionId: string,
  tripId: string,
): Promise<SessionDetail> {
  await ensureCompanionUsers();

  // 验证：行程存在
  const tripResult = await query(
    'SELECT * FROM trips WHERE id = $1',
    [tripId],
  );
  if (tripResult.rows.length === 0) {
    throw new AppError('行程不存在', 404);
  }
  const trip = tripResult.rows[0];

  // 验证：match 记录存在且 companion 是当前用户
  const matchResult = await query(
    'SELECT * FROM matches WHERE trip_id = $1 AND companion_id = $2 AND status = $3',
    [tripId, companionId, 'accepted'],
  );
  if (matchResult.rows.length === 0) {
    throw new AppError('您尚未接此行程的单', 403);
  }
  const match = matchResult.rows[0];

  // 如果已有活跃 session，直接返回
  const existingSession = await query(
    'SELECT * FROM companion_sessions WHERE trip_id = $1 AND companion_id = $2 AND status IN ($3, $4)',
    [tripId, companionId, 'active', 'paused'],
  );
  if (existingSession.rows.length > 0) {
    return getSessionDetail(existingSession.rows[0].id, companionId);
  }

  // 如果行程已在进行中但无 session（异常情况），仍允许创建
  if (trip.status !== 'matched' && trip.status !== 'in_progress') {
    throw new AppError('该行程状态不允许开始陪行（当前状态：' + trip.status + '）', 400);
  }

  // 创建 session
  const sessionResult = await query(
    `INSERT INTO companion_sessions (trip_id, match_id, user_id, companion_id, status)
     VALUES ($1, $2, $3, $4, 'active')
     RETURNING *`,
    [tripId, match.id, trip.user_id, companionId],
  );

  // 更新 trip 状态为 in_progress
  await query(
    `UPDATE trips SET status = 'in_progress', updated_at = NOW() WHERE id = $1`,
    [tripId],
  );

  return getSessionDetail(sessionResult.rows[0].id, companionId);
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
