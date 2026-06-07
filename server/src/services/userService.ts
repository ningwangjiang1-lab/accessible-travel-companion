import {query} from '../db';
import {User, DisabilityProfile} from '../models';
import {AppError} from './authService';

/**
 * User Service — 用户业务逻辑
 */

export interface UserWithProfile extends User {
  profile: DisabilityProfile | null;
}

/**
 * 获取当前用户信息（含残障画像）
 */
export async function getUserById(userId: string): Promise<UserWithProfile> {
  const userResult = await query<User>('SELECT * FROM users WHERE id = $1', [userId]);
  if (userResult.rows.length === 0) {
    throw new AppError('用户不存在', 404);
  }

  const profileResult = await query<DisabilityProfile>(
    'SELECT * FROM disability_profiles WHERE user_id = $1',
    [userId],
  );

  return {
    ...userResult.rows[0],
    profile: profileResult.rows[0] || null,
  };
}

/**
 * 更新用户画像
 */
export interface UpdateProfileInput {
  name?: string;
  user_type?: string;
  disability_type?: string;
  assistive_device?: string;
  nav_preference?: string;
  avatar?: string;
  gender?: string;
  birth_year?: number;
  city?: string;
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<UserWithProfile> {
  // 更新 users 表
  if (input.name !== undefined || input.avatar !== undefined || input.user_type !== undefined
      || input.gender !== undefined || input.birth_year !== undefined || input.city !== undefined) {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(input.name);
    }
    if (input.avatar !== undefined) {
      updates.push(`avatar = $${paramIndex++}`);
      params.push(input.avatar);
    }
    if (input.user_type !== undefined) {
      updates.push(`user_type = $${paramIndex++}`);
      params.push(input.user_type);
    }
    if (input.gender !== undefined) {
      updates.push(`gender = $${paramIndex++}`);
      params.push(input.gender);
    }
    if (input.birth_year !== undefined) {
      updates.push(`birth_year = $${paramIndex++}`);
      params.push(input.birth_year);
    }
    if (input.city !== undefined) {
      updates.push(`city = $${paramIndex++}`);
      params.push(input.city);
    }

    if (updates.length > 0) {
      params.push(userId);
      await query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        params,
      );
    }
  }

  // 更新 disability_profiles 表
  const profileFields: Record<string, string> = {
    disability_type: 'disability_type',
    assistive_device: 'assistive_device',
    nav_preference: 'nav_preference',
  };

  const profileUpdates: string[] = [];
  const profileParams: any[] = [];
  let profileParamIndex = 1;

  for (const [key, col] of Object.entries(profileFields)) {
    if ((input as any)[key] !== undefined) {
      profileUpdates.push(`${col} = $${profileParamIndex++}`);
      profileParams.push((input as any)[key]);
    }
  }

  if (profileUpdates.length > 0) {
    profileParams.push(userId);
    await query(
      `UPDATE disability_profiles SET ${profileUpdates.join(', ')} WHERE user_id = $${profileParamIndex}`,
      profileParams,
    );
  }

  // 返回更新后的完整信息
  return getUserById(userId);
}

export interface UserRating {
  average: number | null;
  count: number;
}

/**
 * 获取用户平均评分（作为被评价方）
 */
export async function getUserRating(userId: string): Promise<UserRating> {
  const result = await query(
    `SELECT COALESCE(ROUND(AVG(score)::numeric, 1), 0) as average, COUNT(*)::int as count
     FROM ratings
     WHERE reviewee_id = $1`,
    [userId],
  );

  const row = result.rows[0];
  return {
    average: row.count > 0 ? parseFloat(row.average) : null,
    count: row.count,
  };
}
