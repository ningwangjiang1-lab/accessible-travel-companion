import {query} from '../db';
import {AppError} from './authService';

/**
 * Match Service — 智能匹配业务逻辑
 *
 * 为行程生成/获取匹配的陪行人（志愿者或专业人士），
 * 支持接受/拒绝匹配，接受后自动创建 companion_session。
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

// ---- 固定 UUID（合法 UUID 格式，用于 mock 陪行人） ----
const COMP_001_UUID = 'a0000001-0001-0001-0001-000000000001';
const COMP_002_UUID = 'a0000001-0001-0001-0001-000000000002';
const COMP_003_UUID = 'a0000001-0001-0001-0001-000000000003';
const PRO_001_UUID  = 'b0000001-0001-0001-0001-000000000001';
const PRO_002_UUID  = 'b0000001-0001-0001-0001-000000000002';

// ---- 模拟陪行人数据库 ----

interface MockCompanionBase {
  id: string;
  phone: string;
  name: string;
  role: 'volunteer' | 'professional';
  distance_meters: number;
  rating: number;
  completed_trips: number;
  certifications: string[];
  tags: string[];
  hourly_rate_cents: number | null;
}

const MOCK_COMPANION_DEFS: MockCompanionBase[] = [
  {
    id: COMP_001_UUID,
    phone: '138****6789',
    name: '李国华',
    role: 'volunteer',
    distance_meters: 350,
    rating: 4.8,
    completed_trips: 156,
    certifications: ['基础培训', '急救认证'],
    tags: ['耐心细致', '熟悉本地', '轮椅经验'],
    hourly_rate_cents: null,
  },
  {
    id: COMP_002_UUID,
    phone: '139****7890',
    name: '王晓芳',
    role: 'volunteer',
    distance_meters: 620,
    rating: 4.9,
    completed_trips: 203,
    certifications: ['基础培训', '手语翻译', '导盲犬认证'],
    tags: ['手语熟练', '视障陪护', '温柔体贴'],
    hourly_rate_cents: null,
  },
  {
    id: COMP_003_UUID,
    phone: '137****5678',
    name: '张永强',
    role: 'volunteer',
    distance_meters: 800,
    rating: 4.6,
    completed_trips: 89,
    certifications: ['基础培训'],
    tags: ['年轻力壮', '响应快速'],
    hourly_rate_cents: null,
  },
  {
    id: PRO_001_UUID,
    phone: '136****4567',
    name: '陈主任',
    role: 'professional',
    distance_meters: 500,
    rating: 4.9,
    completed_trips: 512,
    certifications: ['护士执业证', '康复治疗师', '急救认证'],
    tags: ['临床经验', '康复护理', '无障碍专家'],
    hourly_rate_cents: 8000,
  },
  {
    id: PRO_002_UUID,
    phone: '135****3456',
    name: '刘护工',
    role: 'professional',
    distance_meters: 420,
    rating: 4.7,
    completed_trips: 298,
    certifications: ['护理员证', '急救认证'],
    tags: ['细心周到', '价格实惠', '熟悉医院'],
    hourly_rate_cents: 5000,
  },
];

// 全局缓存
let _companionsEnsured = false;

/**
 * 确保 mock 陪行人已存入 users 表
 */
async function ensureCompanionUsers(): Promise<void> {
  if (_companionsEnsured) return;
  for (const comp of MOCK_COMPANION_DEFS) {
    await query(
      `INSERT INTO users (id, phone, name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET name = $3, role = $4`,
      [comp.id, comp.phone, comp.name, comp.role],
    );
  }
  _companionsEnsured = true;
}

const MOCK_COMPANIONS: Omit<CompanionCandidate, 'match_id' | 'match_status' | 'match_score' | 'route_overlap'>[] =
  MOCK_COMPANION_DEFS.map(c => ({
    id: c.id,
    name: c.name,
    avatar: null,
    role: c.role,
    distance_meters: c.distance_meters,
    rating: c.rating,
    completed_trips: c.completed_trips,
    certifications: c.certifications,
    tags: c.tags,
    hourly_rate_cents: c.hourly_rate_cents,
  }));

/**
 * 获取行程的匹配列表
 *
 * 如果行程状态为 pending 且尚无可用的 pending 匹配，自动生成匹配。
 */
export async function getMatchesForTrip(
  tripId: string,
  userId: string,
): Promise<MatchResult> {
  // 确保 mock 陪行人用户存在
  await ensureCompanionUsers();

  // 验证行程归属
  const tripResult = await query(
    'SELECT * FROM trips WHERE id = $1 AND user_id = $2',
    [tripId, userId],
  );
  if (tripResult.rows.length === 0) {
    throw new AppError('行程不存在', 404);
  }
  const trip = tripResult.rows[0];

  // 查询已有匹配
  const existingMatches = await query(
    `SELECT * FROM matches WHERE trip_id = $1 ORDER BY match_score DESC`,
    [tripId],
  );

  // 如果尚无匹配，自动生成
  if (existingMatches.rows.length === 0) {
    await generateMatches(tripId, trip.companion_type, trip.special_needs || []);
  }

  // 重新查询（包含刚生成的）
  const allMatches = await query(
    `SELECT * FROM matches WHERE trip_id = $1 ORDER BY match_score DESC`,
    [tripId],
  );

  // 组装候选人信息
  const candidates: CompanionCandidate[] = allMatches.rows.map(match => {
    const mockCompanion = MOCK_COMPANIONS.find(c => c.id === match.companion_id);
    if (!mockCompanion) {
      // Fallback — 创建一个基本对象
      return {
        id: match.companion_id,
        name: '陪行人',
        avatar: null,
        role: 'volunteer' as const,
        match_score: Number(match.match_score),
        route_overlap: match.route_overlap ? Number(match.route_overlap) : null,
        distance_meters: 0,
        rating: 4.5,
        completed_trips: 0,
        certifications: [],
        tags: [],
        hourly_rate_cents: null,
        match_id: match.id,
        match_status: match.status,
      };
    }
    return {
      ...mockCompanion,
      match_score: Number(match.match_score),
      route_overlap: match.route_overlap ? Number(match.route_overlap) : null,
      match_id: match.id,
      match_status: match.status,
    };
  });

  return {
    trip_id: tripId,
    trip_status: trip.status,
    candidates,
  };
}

/**
 * 生成模拟匹配
 */
async function generateMatches(
  tripId: string,
  companionType: string,
  specialNeeds: string[],
): Promise<void> {
  // 根据陪行类型筛选候选人池
  const pool = MOCK_COMPANIONS.filter(c => c.role === companionType);

  if (pool.length === 0) return;

  // 为每个候选人计算匹配分数
  for (const companion of pool) {
    let score = 70 + Math.floor(Math.random() * 25); // 70-95 base

    // 特殊需求匹配加分
    for (const need of specialNeeds) {
      const tagMatch = companion.tags.some(t => t.includes(need.replace(/[优先避免通行]/g, '')));
      if (tagMatch) score += 3;
    }

    // 距离近加分
    if (companion.distance_meters < 500) score += 5;

    // 经验加分
    if (companion.completed_trips > 100) score += 3;
    if (companion.completed_trips > 200) score += 2;

    score = Math.min(99, score);

    const routeOverlap = 60 + Math.floor(Math.random() * 35); // 60-95%

    await query(
      `INSERT INTO matches (trip_id, companion_id, match_score, route_overlap, status)
       VALUES ($1, $2, $3, $4, 'pending')
       ON CONFLICT (trip_id, companion_id) DO UPDATE
       SET match_score = $3, route_overlap = $4, status = 'pending', updated_at = NOW()`,
      [tripId, companion.id, score, routeOverlap],
    );
  }

  // 更新行程状态为 matching
  await query(
    `UPDATE trips SET status = 'matching' WHERE id = $1 AND status = 'pending'`,
    [tripId],
  );
}

/**
 * 接受匹配
 *
 * 1. 验证匹配归属
 * 2. 更新 match.status = 'accepted'
 * 3. 更新 trip.status = 'matched'
 * 4. 拒绝同行程的其他 pending 匹配
 * 5. 创建 companion_session
 */
export async function acceptMatch(
  matchId: string,
  userId: string,
): Promise<{success: boolean; session_id: string}> {
  // 查询匹配记录
  const matchResult = await query(
    `SELECT m.*, t.user_id as trip_user_id
     FROM matches m
     JOIN trips t ON t.id = m.trip_id
     WHERE m.id = $1`,
    [matchId],
  );
  if (matchResult.rows.length === 0) {
    throw new AppError('匹配记录不存在', 404);
  }
  const match = matchResult.rows[0];

  // 验证行程归属
  if (match.trip_user_id !== userId) {
    throw new AppError('无权操作', 403);
  }

  if (match.status !== 'pending') {
    throw new AppError('该匹配已处理', 400);
  }

  // 1. 接受该匹配
  await query(
    `UPDATE matches SET status = 'accepted' WHERE id = $1`,
    [matchId],
  );

  // 2. 拒绝其他匹配
  await query(
    `UPDATE matches SET status = 'rejected'
     WHERE trip_id = $1 AND id != $2 AND status = 'pending'`,
    [match.trip_id, matchId],
  );

  // 3. 更新行程状态
  await query(
    `UPDATE trips SET status = 'matched' WHERE id = $1`,
    [match.trip_id],
  );

  // 4. 创建陪行会话
  const sessionResult = await query(
    `INSERT INTO companion_sessions (trip_id, match_id, user_id, companion_id, status)
     VALUES ($1, $2, $3, $4, 'active')
     RETURNING id`,
    [match.trip_id, matchId, match.trip_user_id, match.companion_id],
  );
  const sessionId = sessionResult.rows[0].id;

  return {success: true, session_id: sessionId};
}

/**
 * 拒绝匹配
 */
export async function rejectMatch(
  matchId: string,
  userId: string,
): Promise<{success: boolean}> {
  const matchResult = await query(
    `SELECT m.*, t.user_id as trip_user_id
     FROM matches m
     JOIN trips t ON t.id = m.trip_id
     WHERE m.id = $1`,
    [matchId],
  );
  if (matchResult.rows.length === 0) {
    throw new AppError('匹配记录不存在', 404);
  }
  const match = matchResult.rows[0];

  if (match.trip_user_id !== userId) {
    throw new AppError('无权操作', 403);
  }

  if (match.status !== 'pending') {
    throw new AppError('该匹配已处理', 400);
  }

  await query(
    `UPDATE matches SET status = 'rejected' WHERE id = $1`,
    [matchId],
  );

  // 检查是否还有 pending 匹配，没有则回退行程状态
  const remainingResult = await query(
    `SELECT COUNT(*) as cnt FROM matches WHERE trip_id = $1 AND status = 'pending'`,
    [match.trip_id],
  );
  if (parseInt(remainingResult.rows[0].cnt) === 0) {
    await query(
      `UPDATE trips SET status = 'pending' WHERE id = $1`,
      [match.trip_id],
    );
  }

  return {success: true};
}
