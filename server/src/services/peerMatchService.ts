import {query, pool} from '../db';
import {AppError} from './authService';

/**
 * Peer Match Service — 同行者匹配业务逻辑
 *
 * 残障用户发布行程时可选择"寻找同行者"，
 * 系统基于路线重叠度 + 残障类型互补性进行匹配。
 */

// ---- 残障类型互补评分矩阵 ----
// 分数越高越互补（满分 100）
const COMPLEMENTARITY_MATRIX: Record<string, Record<string, number>> = {
  physical:  { physical: 10, visual: 90, hearing: 70, cognitive: 60 },
  visual:    { physical: 90, visual: 10, hearing: 80, cognitive: 50 },
  hearing:   { physical: 70, visual: 80, hearing: 10, cognitive: 50 },
  cognitive: { physical: 60, visual: 50, hearing: 50, cognitive: 20 },
};

const COMPLEMENTARITY_DESC: Record<string, Record<string, string>> = {
  physical:  {
    visual: '肢体障碍+视力障碍：视力方可导航指引，肢体方可协助开门、推轮椅等',
    hearing: '肢体障碍+听力障碍：听力方可交流沟通，肢体方可协助行动',
    cognitive: '肢体障碍+认知障碍：肢体方协助行动，认知方专注决策',
  },
  visual:    {
    physical: '视力障碍+肢体障碍：视力方可导航指引，肢体方可协助通行障碍',
    hearing: '视力障碍+听力障碍：视力方可指引方向，听力方可沟通交流',
    cognitive: '视力障碍+认知障碍：双方互补完成导航与决策',
  },
  hearing:   {
    physical: '听力障碍+肢体障碍：听力方可沟通，肢体方可协助行动',
    visual: '听力障碍+视力障碍：听力方可交流，视力方可导航',
  },
  cognitive: {
    physical: '认知障碍+肢体障碍：认知方决策，肢体方行动',
    visual: '认知障碍+视力障碍：双方互补完成出行',
  },
};

function getComplementarity(typeA: string, typeB: string): {score: number; desc: string | null} {
  const score = COMPLEMENTARITY_MATRIX[typeA]?.[typeB] || 20;
  const desc = COMPLEMENTARITY_DESC[typeA]?.[typeB] || null;
  return {score, desc};
}

/**
 * 计算两点间的粗略距离（米），使用简化的球面余弦公式
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * 计算路线重叠度（0-100）
 * 基于起终点对的距离：起点越近、终点越近，重叠度越高
 */
function calcRouteOverlap(
  startA_lat: number, startA_lon: number, endA_lat: number, endA_lon: number,
  startB_lat: number, startB_lon: number, endB_lat: number, endB_lon: number,
): number {
  const startDist = haversineDistance(startA_lat, startA_lon, startB_lat, startB_lon);
  const endDist = haversineDistance(endA_lat, endA_lon, endB_lat, endB_lon);

  // 起点在 500m 内满分 50，终点在 500m 内满分 50
  const startScore = Math.max(0, 50 - (startDist / 500) * 50);
  const endScore = Math.max(0, 50 - (endDist / 500) * 50);
  return Math.round(startScore + endScore);
}

// ---- 数据模型 ----

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

// ---- 业务逻辑 ----

/**
 * 为行程开启同行者匹配
 */
export async function enablePeerMatching(
  userId: string,
  tripId: string,
): Promise<void> {
  const result = await query(
    'SELECT * FROM trips WHERE id = $1 AND user_id = $2',
    [tripId, userId],
  );
  if (result.rows.length === 0) {
    throw new AppError('行程不存在', 404);
  }

  await query(
    'UPDATE trips SET peer_matching = true, updated_at = NOW() WHERE id = $1',
    [tripId],
  );
}

/**
 * 获取当前用户的同行者匹配候选列表
 * 返回路线重叠 + 类型互补的 top 5
 */
export async function getPeerCandidates(userId: string): Promise<PeerCandidate[]> {
  // 获取用户自己的开启 peer_matching 的行程
  const myTrips = await query(
    `SELECT t.*, dp.disability_type
     FROM trips t
     JOIN disability_profiles dp ON dp.user_id = t.user_id
     WHERE t.user_id = $1
       AND t.peer_matching = true
       AND t.status IN ('pending', 'matching', 'matched')
     ORDER BY t.created_at DESC
     LIMIT 1`,
    [userId],
  );

  if (myTrips.rows.length === 0) {
    throw new AppError('您没有开启同行者匹配的行程，请先发布行程并开启同行者匹配', 400);
  }

  const myTrip = myTrips.rows[0];
  const myType = myTrip.disability_type || 'physical';

  // 查询其他人的开启 peer_matching 的行程
  const otherTrips = await query(
    `SELECT
       t.id, t.user_id, t.start_address, t.end_address,
       t.start_lat, t.start_lon, t.end_lat, t.end_lon,
       t.start_time, t.special_needs,
       u.name as user_name,
       dp.disability_type
     FROM trips t
     JOIN users u ON u.id = t.user_id
     JOIN disability_profiles dp ON dp.user_id = t.user_id
     WHERE t.user_id != $1
       AND t.peer_matching = true
       AND t.status IN ('pending', 'matching', 'matched')
       -- 排除已有 peer_match 的
       AND t.id NOT IN (
         SELECT trip_b_id FROM peer_matches WHERE trip_a_id = $2
         UNION
         SELECT trip_a_id FROM peer_matches WHERE trip_b_id = $2
       )
     LIMIT 50`,
    [userId, myTrip.id],
  );

  // 计算每个候选的分数
  const candidates: PeerCandidate[] = otherTrips.rows.map((row: any) => {
    const routeOverlap = calcRouteOverlap(
      myTrip.start_lat || 0, myTrip.start_lon || 0,
      myTrip.end_lat || 0, myTrip.end_lon || 0,
      row.start_lat || 0, row.start_lon || 0,
      row.end_lat || 0, row.end_lon || 0,
    );
    const comp = getComplementarity(myType, row.disability_type);
    const totalScore = Math.round(routeOverlap * 0.6 + comp.score * 0.4);

    return {
      trip_id: row.id,
      user_id: row.user_id,
      user_name: row.user_name || '匿名用户',
      disability_type: row.disability_type,
      start_address: row.start_address || '',
      end_address: row.end_address || '',
      start_time: row.start_time ? new Date(row.start_time).toISOString() : null,
      route_overlap_pct: routeOverlap,
      complementarity_score: comp.score,
      complementarity_desc: comp.desc,
      total_score: totalScore,
    };
  });

  // 按总分降序排列，取 top 5
  candidates.sort((a, b) => b.total_score - a.total_score);
  return candidates.slice(0, 5);
}

/**
 * 接受同行匹配
 */
export async function acceptPeerMatch(
  userId: string,
  matchId: string,
): Promise<PeerMatch> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const matchResult = await client.query(
      `SELECT * FROM peer_matches WHERE id = $1 AND status = 'pending'
       AND (user_a_id = $2 OR user_b_id = $2)`,
      [matchId, userId],
    );
    if (matchResult.rows.length === 0) {
      throw new AppError('匹配记录不存在或已处理', 404);
    }

    await client.query(
      `UPDATE peer_matches SET status = 'accepted', updated_at = NOW() WHERE id = $1`,
      [matchId],
    );

    // 将相关行程状态更新为 matched
    const match = matchResult.rows[0];
    await client.query(
      `UPDATE trips SET status = 'matched', updated_at = NOW()
       WHERE id IN ($1, $2)`,
      [match.trip_a_id, match.trip_b_id],
    );

    await client.query('COMMIT');

    return {
      id: match.id,
      trip_a_id: match.trip_a_id,
      trip_b_id: match.trip_b_id,
      user_a_id: match.user_a_id,
      user_b_id: match.user_b_id,
      peer_name: '',
      peer_disability_type: '',
      peer_start_address: '',
      peer_end_address: '',
      route_overlap_pct: match.route_overlap_pct,
      complementarity_score: match.complementarity_score,
      status: 'accepted',
      created_at: new Date().toISOString(),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 拒绝/跳过同行匹配
 */
export async function rejectPeerMatch(
  userId: string,
  matchId: string,
): Promise<void> {
  const result = await query(
    `SELECT * FROM peer_matches WHERE id = $1 AND status = 'pending'
     AND (user_a_id = $2 OR user_b_id = $2)`,
    [matchId, userId],
  );
  if (result.rows.length === 0) {
    throw new AppError('匹配记录不存在或已处理', 404);
  }

  await query(
    `UPDATE peer_matches SET status = 'rejected', updated_at = NOW() WHERE id = $1`,
    [matchId],
  );
}

/**
 * 创建同行匹配记录（用于候选确定后）
 */
export async function createPeerMatch(
  userId: string,
  candidateTripId: string,
): Promise<PeerMatch> {
  // 获取用户自己的行程
  const myTrips = await query(
    `SELECT t.*, dp.disability_type
     FROM trips t
     JOIN disability_profiles dp ON dp.user_id = t.user_id
     WHERE t.user_id = $1 AND t.peer_matching = true
       AND t.status IN ('pending', 'matching', 'matched')
     ORDER BY t.created_at DESC LIMIT 1`,
    [userId],
  );
  if (myTrips.rows.length === 0) {
    throw new AppError('您没有开启同行者匹配的行程', 400);
  }

  const myTrip = myTrips.rows[0];

  // 获取目标行程
  const candidateTrips = await query(
    `SELECT t.*, dp.disability_type
     FROM trips t
     JOIN disability_profiles dp ON dp.user_id = t.user_id
     WHERE t.id = $1 AND t.peer_matching = true`,
    [candidateTripId],
  );
  if (candidateTrips.rows.length === 0) {
    throw new AppError('目标行程不存在或未开启同行匹配', 404);
  }

  const candidateTrip = candidateTrips.rows[0];

  // 计算匹配分数
  const routeOverlap = calcRouteOverlap(
    myTrip.start_lat || 0, myTrip.start_lon || 0,
    myTrip.end_lat || 0, myTrip.end_lon || 0,
    candidateTrip.start_lat || 0, candidateTrip.start_lon || 0,
    candidateTrip.end_lat || 0, candidateTrip.end_lon || 0,
  );
  const comp = getComplementarity(myTrip.disability_type, candidateTrip.disability_type);

  // 检查是否已存在
  const existing = await query(
    `SELECT * FROM peer_matches
     WHERE (trip_a_id = $1 AND trip_b_id = $2)
        OR (trip_a_id = $2 AND trip_b_id = $1)`,
    [myTrip.id, candidateTripId],
  );
  if (existing.rows.length > 0) {
    throw new AppError('已向该行程发送过同行邀请', 409);
  }

  const result = await query(
    `INSERT INTO peer_matches
     (trip_a_id, trip_b_id, user_a_id, user_b_id, route_overlap_pct, complementarity_score, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')
     RETURNING *`,
    [myTrip.id, candidateTripId, userId, candidateTrip.user_id, routeOverlap, comp.score],
  );

  const match = result.rows[0];
  return {
    id: match.id,
    trip_a_id: match.trip_a_id,
    trip_b_id: match.trip_b_id,
    user_a_id: match.user_a_id,
    user_b_id: match.user_b_id,
    peer_name: '',
    peer_disability_type: candidateTrip.disability_type,
    peer_start_address: candidateTrip.start_address || '',
    peer_end_address: candidateTrip.end_address || '',
    route_overlap_pct: match.route_overlap_pct,
    complementarity_score: match.complementarity_score,
    status: match.status,
    created_at: match.created_at.toISOString(),
  };
}

/**
 * 获取当前用户的活跃同行关系
 */
export async function getActivePeerMatch(userId: string): Promise<any | null> {
  const result = await query(
    `SELECT
       pm.*,
       ua.name as user_a_name, ub.name as user_b_name,
       dpa.disability_type as type_a, dpb.disability_type as type_b,
       ta.start_address as a_start, ta.end_address as a_end,
       tb.start_address as b_start, tb.end_address as b_end,
       ta.start_lat as a_start_lat, ta.start_lon as a_start_lon,
       ta.end_lat as a_end_lat, ta.end_lon as a_end_lon,
       tb.start_lat as b_start_lat, tb.start_lon as b_start_lon,
       tb.end_lat as b_end_lat, tb.end_lon as b_end_lon
     FROM peer_matches pm
     JOIN users ua ON ua.id = pm.user_a_id
     JOIN users ub ON ub.id = pm.user_b_id
     JOIN disability_profiles dpa ON dpa.user_id = pm.user_a_id
     JOIN disability_profiles dpb ON dpb.user_id = pm.user_b_id
     JOIN trips ta ON ta.id = pm.trip_a_id
     JOIN trips tb ON tb.id = pm.trip_b_id
     WHERE (pm.user_a_id = $1 OR pm.user_b_id = $1)
       AND pm.status = 'accepted'
       AND ta.status IN ('matched', 'in_progress')
       AND tb.status IN ('matched', 'in_progress')
     ORDER BY pm.updated_at DESC
     LIMIT 1`,
    [userId],
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const isUserA = row.user_a_id === userId;

  return {
    id: row.id,
    my_trip_id: isUserA ? row.trip_a_id : row.trip_b_id,
    peer_trip_id: isUserA ? row.trip_b_id : row.trip_a_id,
    peer_user_id: isUserA ? row.user_b_id : row.user_a_id,
    peer_name: isUserA ? row.user_b_name : row.user_a_name,
    peer_disability_type: isUserA ? row.type_b : row.type_a,
    route_overlap_pct: row.route_overlap_pct,
    complementarity_score: row.complementarity_score,
    complementarity_desc: getComplementarity(
      isUserA ? row.type_a : row.type_b,
      isUserA ? row.type_b : row.type_a,
    ).desc,
    peer_start_address: isUserA ? row.b_start : row.a_start,
    peer_end_address: isUserA ? row.b_end : row.a_end,
    peer_lat: isUserA ? row.b_start_lat : row.a_start_lat,
    peer_lon: isUserA ? row.b_start_lon : row.a_start_lon,
    my_start_lat: isUserA ? row.a_start_lat : row.b_start_lat,
    my_start_lon: isUserA ? row.a_start_lon : row.b_start_lon,
    my_end_lat: isUserA ? row.a_end_lat : row.b_end_lat,
    my_end_lon: isUserA ? row.a_end_lon : row.b_end_lon,
    status: row.status,
  };
}
