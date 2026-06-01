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
      ST_Y(t.start_location::geometry) as start_lat,
      ST_X(t.start_location::geometry) as start_lon,
      ST_Y(t.end_location::geometry) as end_lat,
      ST_X(t.end_location::geometry) as end_lon,
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
      start_location,
      end_location,
      start_address,
      end_address,
      companion_type,
      special_needs,
      budget_cents,
      status,
      start_time
    ) VALUES (
      $1,
      ST_SetSRID(ST_MakePoint($2, $3), 4326),
      ST_SetSRID(ST_MakePoint($4, $5), 4326),
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
      startLon,
      startLat,
      endLon,
      endLat,
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
