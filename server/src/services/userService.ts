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
  font_preference?: string;
  avatar?: string;
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<UserWithProfile> {
  // 更新 users 表
  if (input.name !== undefined || input.avatar !== undefined || input.user_type !== undefined) {
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
    font_preference: 'font_preference',
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
