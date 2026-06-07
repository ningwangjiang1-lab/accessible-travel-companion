import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {STORAGE_KEY_TOKEN} from './api';

/**
 * Auth Service — 封装认证相关 API 调用
 */

export interface User {
  id: string;
  phone: string;
  name: string | null;
  avatar: string | null;
  role: 'user' | 'volunteer' | 'professional' | 'admin';
  user_type?: 'disabled' | 'non_disabled';
  gender?: 'male' | 'female' | 'other' | null;
  birth_year?: number | null;
  city?: string | null;
}

export interface DisabilityProfile {
  disability_type: 'physical' | 'visual' | 'hearing' | 'cognitive' | 'none';
  assistive_device: string | null;
  nav_preference: string;
}

export interface AuthResult {
  token: string;
  user: User;
  profile: DisabilityProfile;
}

export interface RegisterInput {
  phone: string;
  code: string;
  name?: string;
  user_type?: string;
  disability_type?: string;
  assistive_device?: string;
  nav_preference?: string;
  gender?: string;
  birth_year?: number;
  city?: string;
}

/**
 * 发送短信验证码
 */
export async function sendVerificationCode(phone: string): Promise<{success: boolean}> {
  const response = await api.post('/auth/send-code', {phone});
  return response.data;
}

/**
 * 用户注册
 */
export async function register(input: RegisterInput): Promise<AuthResult> {
  const response = await api.post('/auth/register', input);
  const result: AuthResult = response.data;

  // 持久化存储 token
  await AsyncStorage.setItem(STORAGE_KEY_TOKEN, result.token);

  return result;
}

/**
 * 用户登录
 */
export async function login(phone: string, code: string): Promise<AuthResult> {
  const response = await api.post('/auth/login', {phone, code});
  const result: AuthResult = response.data;

  // 持久化存储 token
  await AsyncStorage.setItem(STORAGE_KEY_TOKEN, result.token);

  return result;
}

/**
 * 获取当前用户信息（含画像）
 */
export async function getCurrentUser(): Promise<{user: User; profile: DisabilityProfile}> {
  const response = await api.get('/users/me');
  return {
    user: response.data as User,
    profile: response.data.profile as DisabilityProfile,
  };
}

/**
 * 更新用户画像
 */
export async function updateProfile(input: Partial<RegisterInput>): Promise<{user: User; profile: DisabilityProfile}> {
  const response = await api.put('/users/me/profile', input);
  return {
    user: response.data as User,
    profile: response.data.profile as DisabilityProfile,
  };
}

/**
 * 登出（清除本地 token）
 */
export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY_TOKEN);
}

export interface UserRating {
  average: number | null;
  count: number;
}

/**
 * 获取当前用户的平均评分
 */
export async function getMyRating(): Promise<UserRating> {
  const response = await api.get('/users/me/rating');
  return response.data as UserRating;
}

/**
 * 检查是否已登录（尝试恢复 token）
 */
export async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEY_TOKEN);
}
