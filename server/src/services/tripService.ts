import {query} from '../db';
import {Trip} from '../models';
import {AppError} from './authService';

/**
 * Trip Service — 行程业务逻辑
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
  start_time?: string; // ISO 8601
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
 * 获取用户当前活跃行程
 */
export async function getActiveTrip(userId: string): Promise<ActiveTrip | null> {
  const result = await query<ActiveTrip>(
    `SELECT
      t.id,
      t.user_id,
      t.start_address,
      t.end_address,
      t.start_lat,
      t.start_lon,
      t.end_lat,
      t.end_lon,
      t.start_time,
      t.companion_type,
      t.status,
      t.created_at,
      t.updated_at,
      u.name as companion_name
    FROM trips t
    LEFT JOIN companion_sessions cs ON cs.trip_id = t.id AND cs.status = 'active'
    LEFT JOIN users u ON u.id = cs.companion_id
    WHERE t.user_id = $1 AND t.status = 'in_progress'
    ORDER BY t.created_at DESC
    LIMIT 1`,
    [userId],
  );

  return result.rows[0] || null;
}

/**
 * 创建新行程
 *
 * 1. 验证必填字段
 * 2. 检查用户是否有进行中的行程
 * 3. 插入 trips 表（起终点使用模拟坐标）
 * 4. 返回创建的行程
 */
export async function createTrip(
  userId: string,
  input: CreateTripInput,
): Promise<TripResult> {
  // 验证
  if (!input.start_address || !input.start_address.trim()) {
    throw new AppError('请输入出发地', 400);
  }
  if (!input.end_address || !input.end_address.trim()) {
    throw new AppError('请输入目的地', 400);
  }
  if (!['volunteer', 'professional'].includes(input.companion_type)) {
    throw new AppError('请选择有效的陪行类型', 400);
  }

  // 检查是否有进行中的行程
  const activeTrip = await getActiveTrip(userId);
  if (activeTrip) {
    throw new AppError('您有一个进行中的行程，请先结束当前行程', 409);
  }

  // 模拟坐标（生产环境使用高德 Geocoding API）
  // 北京天安门附近随机偏移
  const startLon = 116.397 + (Math.random() - 0.5) * 0.02;
  const startLat = 39.908 + (Math.random() - 0.5) * 0.02;
  const endLon = 116.407 + (Math.random() - 0.5) * 0.02;
  const endLat = 39.918 + (Math.random() - 0.5) * 0.02;

  const result = await query<Trip>(
    `INSERT INTO trips (
      user_id,
      start_lat, start_lon,
      end_lat, end_lon,
      start_address,
      end_address,
      companion_type,
      special_needs,
      budget_cents,
      status,
      start_time
    ) VALUES (
      $1,
      $2, $3,
      $4, $5,
      $6,
      $7,
      $8,
      $9,
      $10,
      'pending',
      $11
    )
    RETURNING *`,
    [
      userId,
      startLat,
      startLon,
      endLat,
      endLon,
      input.start_address.trim(),
      input.end_address.trim(),
      input.companion_type,
      input.special_needs || [],
      input.budget_cents || null,
      input.start_time || null,
    ],
  );

  const trip = result.rows[0];

  return {
    id: trip.id,
    user_id: trip.user_id,
    start_address: trip.start_address || '',
    end_address: trip.end_address || '',
    companion_type: trip.companion_type,
    special_needs: trip.special_needs || [],
    budget_cents: trip.budget_cents,
    status: trip.status,
    start_time: trip.start_time?.toISOString() || null,
    created_at: trip.created_at.toISOString(),
  };
}

/**
 * 获取用户的所有行程（分页）
 */
export async function getUserTrips(
  userId: string,
  limit: number = 10,
  offset: number = 0,
): Promise<TripResult[]> {
  const result = await query<Trip>(
    `SELECT * FROM trips
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );

  return result.rows.map(trip => ({
    id: trip.id,
    user_id: trip.user_id,
    start_address: trip.start_address || '',
    end_address: trip.end_address || '',
    companion_type: trip.companion_type,
    special_needs: trip.special_needs || [],
    budget_cents: trip.budget_cents,
    status: trip.status,
    start_time: trip.start_time?.toISOString() || null,
    created_at: trip.created_at.toISOString(),
  }));
}

/** 可接单行程（服务模式首页） */
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

/** 获取附近所有待接单的行程（排除自己的行程） */
export async function getAvailableTrips(userId: string): Promise<AvailableTrip[]> {
  const result = await query(
    `SELECT
      t.id, t.start_address, t.end_address, t.companion_type,
      t.special_needs, t.status, t.created_at,
      u.name as user_name,
      dp.disability_type
     FROM trips t
     JOIN users u ON u.id = t.user_id
     LEFT JOIN disability_profiles dp ON dp.user_id = t.user_id
     WHERE t.user_id != $1
       AND t.status IN ('pending', 'matching')
     ORDER BY t.created_at DESC
     LIMIT 50`,
    [userId],
  );

  return result.rows.map(r => ({
    id: r.id,
    user_name: r.user_name || '匿名用户',
    disability_type: r.disability_type || 'unknown',
    start_address: r.start_address || '',
    end_address: r.end_address || '',
    companion_type: r.companion_type,
    special_needs: r.special_needs || [],
    status: r.status,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  }));
}

/** 已接单的行程（服务模式 — 我接的单） */
export async function getMyAcceptedTrips(userId: string): Promise<any[]> {
  const result = await query(
    `SELECT
      t.id, t.start_address, t.end_address, t.companion_type,
      t.special_needs, t.status, t.created_at, t.updated_at,
      u.name as user_name,
      dp.disability_type,
      m.id as match_id, m.status as match_status
     FROM trips t
     JOIN matches m ON m.trip_id = t.id AND m.companion_id = $1
     JOIN users u ON u.id = t.user_id
     LEFT JOIN disability_profiles dp ON dp.user_id = t.user_id
     ORDER BY t.created_at DESC
     LIMIT 50`,
    [userId],
  );

  return result.rows.map(r => ({
    id: r.id,
    user_name: r.user_name || '匿名用户',
    disability_type: r.disability_type || 'unknown',
    start_address: r.start_address || '',
    end_address: r.end_address || '',
    companion_type: r.companion_type,
    special_needs: r.special_needs || [],
    status: r.status,
    match_status: r.match_status,
    match_id: r.match_id,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  }));
}

/** 接单：志愿者接受一个待接单行程 */
export async function acceptTrip(
  companionId: string,
  tripId: string,
): Promise<{trip: any; match: any}> {
  const {pool} = await import('../db');

  // 检查用户角色
  const userResult = await query('SELECT role FROM users WHERE id = $1', [companionId]);
  if (userResult.rows.length === 0) {
    throw new AppError('用户不存在', 404);
  }
  const role = userResult.rows[0].role;
  if (role !== 'volunteer' && role !== 'professional' && role !== 'admin') {
    throw new AppError('仅志愿者或专业陪护可以接单，请先完成认证', 403);
  }

  // 检查是否已有进行中的陪行（不能同时接多单）
  const activeCount = await query(
    `SELECT COUNT(*) as cnt FROM matches m
     JOIN trips t ON t.id = m.trip_id
     WHERE m.companion_id = $1
       AND m.status = 'accepted'
       AND t.status IN ('matched', 'in_progress')`,
    [companionId],
  );
  if (parseInt(activeCount.rows[0].cnt) > 0) {
    throw new AppError('您已有进行中的陪行订单，请先完成当前订单再接新单', 409);
  }

  // 检查行程
  const tripResult = await query('SELECT * FROM trips WHERE id = $1', [tripId]);
  if (tripResult.rows.length === 0) {
    throw new AppError('行程不存在', 404);
  }
  const trip = tripResult.rows[0];
  if (trip.status !== 'pending' && trip.status !== 'matching') {
    throw new AppError('该行程已被接单或已取消', 409);
  }
  if (trip.user_id === companionId) {
    throw new AppError('不能接自己的行程', 400);
  }

  // 事务：更新行程状态 + 创建匹配记录
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE trips SET status = 'matched', updated_at = NOW() WHERE id = $1`,
      [tripId],
    );

    const matchResult = await client.query(
      `INSERT INTO matches (trip_id, companion_id, match_score, status)
       VALUES ($1, $2, $3, 'accepted')
       RETURNING *`,
      [tripId, companionId, 85],
    );

    await client.query('COMMIT');

    return {
      trip: {id: trip.id, status: 'matched', ...trip},
      match: matchResult.rows[0],
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** 取消行程（仅 pending/matching/matched 状态可取消） */
export async function cancelTrip(userId: string, tripId: string): Promise<void> {
  const tripResult = await query('SELECT * FROM trips WHERE id = $1 AND user_id = $2', [tripId, userId]);
  if (tripResult.rows.length === 0) {
    throw new AppError('行程不存在', 404);
  }
  const trip = tripResult.rows[0];
  if (!['pending', 'matching', 'matched'].includes(trip.status)) {
    throw new AppError('该行程当前状态不可取消（仅待匹配/已匹配状态可取消）', 400);
  }

  await query(
    `UPDATE trips SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
    [tripId],
  );

  // 同时取消相关的 pending match 记录
  await query(
    `UPDATE matches SET status = 'rejected', updated_at = NOW()
     WHERE trip_id = $1 AND status IN ('pending', 'accepted')`,
    [tripId],
  );
}
