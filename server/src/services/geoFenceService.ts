import {query} from '../db';
import {AppError} from './authService';

/**
 * Geo Fence Service — 电子围栏管理
 *
 * 用户可创建以某个位置为中心的圆形电子围栏。
 * 当用户（或其陪行人）离开围栏范围时，系统可触发安全通知。
 *
 * 数据使用 PostGIS geometry 存储中心点。
 */

// ---- 数据模型 ----

/** GeoJSON Point */
export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface CreateFenceInput {
  name: string;
  /** 中心点（GeoJSON Point） */
  center: GeoPoint;
  /** 半径（米），默认 500 */
  radius_meters?: number;
}

export interface UpdateFenceInput {
  name?: string;
  center?: GeoPoint;
  radius_meters?: number;
  is_active?: boolean;
}

export interface GeoFence {
  id: string;
  user_id: string;
  name: string;
  /** 中心点 GeoJSON */
  center: GeoPoint;
  /** 半径（米） */
  radius_meters: number;
  /** 是否启用 */
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** 围栏数量上限 */
const MAX_FENCES = 5;

/** 半径预设选项 */
export const RADIUS_PRESETS = [
  {value: 300, label: '300m — 社区范围'},
  {value: 500, label: '500m — 街区范围'},
  {value: 1000, label: '1km — 片区范围'},
  {value: 2000, label: '2km — 区域范围'},
  {value: 5000, label: '5km — 全区范围'},
];

// ---- 业务逻辑 ----

/**
 * 获取用户所有电子围栏
 */
export async function getFences(userId: string): Promise<GeoFence[]> {
  const result = await query(
    `SELECT id, user_id, name,
            ST_AsGeoJSON(center)::jsonb AS center,
            radius_meters, is_active, created_at, updated_at
     FROM geo_fences
     WHERE user_id = $1
     ORDER BY is_active DESC, created_at ASC`,
    [userId],
  );

  return result.rows.map(formatFence);
}

/**
 * 根据 ID 获取单个围栏（带所有权验证）
 */
export async function getFenceById(
  fenceId: string,
  userId: string,
): Promise<GeoFence> {
  const result = await query(
    `SELECT id, user_id, name,
            ST_AsGeoJSON(center)::jsonb AS center,
            radius_meters, is_active, created_at, updated_at
     FROM geo_fences
     WHERE id = $1 AND user_id = $2`,
    [fenceId, userId],
  );

  if (result.rows.length === 0) {
    throw new AppError('围栏不存在', 404);
  }

  return formatFence(result.rows[0]);
}

/**
 * 创建电子围栏
 *
 * 1. 验证必填字段
 * 2. 检查数量上限
 * 3. 写入（center 使用 ST_SetSRID + ST_MakePoint）
 */
export async function createFence(
  userId: string,
  input: CreateFenceInput,
): Promise<GeoFence> {
  if (!input.name?.trim()) {
    throw new AppError('围栏名称不能为空', 400);
  }

  if (!input.center?.coordinates || input.center.coordinates.length !== 2) {
    throw new AppError('请提供有效的中心点坐标', 400);
  }

  const [lng, lat] = input.center.coordinates;
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    throw new AppError('坐标范围不合法', 400);
  }

  const radius = input.radius_meters || 500;
  if (radius < 100 || radius > 10000) {
    throw new AppError('半径需在 100m ~ 10000m 之间', 400);
  }

  // 检查数量上限
  const countResult = await query(
    `SELECT COUNT(*) as cnt FROM geo_fences WHERE user_id = $1`,
    [userId],
  );
  if (parseInt(countResult.rows[0].cnt, 10) >= MAX_FENCES) {
    throw new AppError(`最多创建 ${MAX_FENCES} 个电子围栏`, 400);
  }

  const result = await query(
    `INSERT INTO geo_fences (user_id, name, center, radius_meters, is_active)
     VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, true)
     RETURNING id, user_id, name,
               ST_AsGeoJSON(center)::jsonb AS center,
               radius_meters, is_active, created_at, updated_at`,
    [userId, input.name.trim(), lng, lat, radius],
  );

  return formatFence(result.rows[0]);
}

/**
 * 更新电子围栏
 */
export async function updateFence(
  fenceId: string,
  userId: string,
  input: UpdateFenceInput,
): Promise<GeoFence> {
  // 验证所有权
  await getFenceById(fenceId, userId);

  // 半径校验
  if (input.radius_meters !== undefined) {
    if (input.radius_meters < 100 || input.radius_meters > 10000) {
      throw new AppError('半径需在 100m ~ 10000m 之间', 400);
    }
  }

  // 坐标校验
  if (input.center) {
    const [lng, lat] = input.center.coordinates;
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      throw new AppError('坐标范围不合法', 400);
    }
  }

  // 动态构建 UPDATE
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (input.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(input.name.trim());
  }
  if (input.center !== undefined) {
    fields.push(`center = ST_SetSRID(ST_MakePoint($${idx++}, $${idx++}), 4326)`);
    values.push(input.center.coordinates[0], input.center.coordinates[1]);
  }
  if (input.radius_meters !== undefined) {
    fields.push(`radius_meters = $${idx++}`);
    values.push(input.radius_meters);
  }
  if (input.is_active !== undefined) {
    fields.push(`is_active = $${idx++}`);
    values.push(input.is_active);
  }

  if (fields.length === 0) {
    throw new AppError('没有需要更新的字段', 400);
  }

  fields.push(`updated_at = NOW()`);
  values.push(fenceId);
  values.push(userId);

  const result = await query(
    `UPDATE geo_fences
     SET ${fields.join(', ')}
     WHERE id = $${idx++} AND user_id = $${idx}
     RETURNING id, user_id, name,
               ST_AsGeoJSON(center)::jsonb AS center,
               radius_meters, is_active, created_at, updated_at`,
    values,
  );

  return formatFence(result.rows[0]);
}

/**
 * 删除电子围栏
 */
export async function deleteFence(
  fenceId: string,
  userId: string,
): Promise<void> {
  await getFenceById(fenceId, userId);

  await query(
    `DELETE FROM geo_fences WHERE id = $1 AND user_id = $2`,
    [fenceId, userId],
  );
}

/**
 * 切换围栏启用/禁用
 */
export async function toggleFence(
  fenceId: string,
  userId: string,
): Promise<GeoFence> {
  const fence = await getFenceById(fenceId, userId);

  const result = await query(
    `UPDATE geo_fences
     SET is_active = NOT is_active, updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING id, user_id, name,
               ST_AsGeoJSON(center)::jsonb AS center,
               radius_meters, is_active, created_at, updated_at`,
    [fenceId, userId],
  );

  return formatFence(result.rows[0]);
}

// ---- helpers ----

function formatFence(row: any): GeoFence {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    center: typeof row.center === 'string' ? JSON.parse(row.center) : row.center,
    radius_meters: row.radius_meters,
    is_active: row.is_active,
    created_at:
      row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updated_at:
      row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}
