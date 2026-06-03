import {query} from '../db';
import {DisabilityProfile, NavPreference, DisabilityType} from '../models';
import {AppError} from './authService';

/**
 * Route Service — AI 路线规划业务逻辑
 *
 * 根据用户残障画像和导航偏好，生成无障碍路线方案。
 * 当前为算法模拟（Mock），生产环境接入高德无障碍导航 API。
 */

// ---- 路线规划结果 ----

export interface RouteOption {
  id: string;
  name: string;
  accessibility_score: number;
  distance_meters: number;
  duration_seconds: number;
  distance_display: string;
  duration_display: string;
  features: RouteFeature[];
  is_recommended: boolean;
  origin_address: string;
  destination_address: string;
}

export interface RouteFeature {
  label: string;
  type: 'positive' | 'warning' | 'negative';
}

export interface PlanRoutesInput {
  destination: string;
  origin?: string;
}

// ---- 模拟路线库（无障碍特征模板）----

const FEATURE_TEMPLATES: Record<string, RouteFeature[]> = {
  barrier_free: [
    {label: '✓ 无障碍优先路线', type: 'positive'},
    {label: '✓ 全程坡道', type: 'positive'},
    {label: '✓ 宽通道 (>1.2m)', type: 'positive'},
    {label: '✓ 无障碍电梯', type: 'positive'},
  ],
  avoid_overpass: [
    {label: '✓ 避开天桥', type: 'positive'},
    {label: '✓ 地下通道优先', type: 'positive'},
    {label: '✓ 斑马线过街', type: 'positive'},
    {label: '✓ 平路为主', type: 'positive'},
  ],
  prefer_ramp: [
    {label: '✓ 坡道优先', type: 'positive'},
    {label: '✓ 避开台阶', type: 'positive'},
    {label: '⚠ 部分路段较陡', type: 'warning'},
  ],
  flat_only: [
    {label: '✓ 完全平坦', type: 'positive'},
    {label: '✓ 零台阶', type: 'positive'},
    {label: '⚠ 路程可能较长', type: 'warning'},
  ],
  standard: [
    {label: '✓ 标准路线', type: 'positive'},
    {label: '⚠ 部分路段有台阶', type: 'warning'},
    {label: '✕ 途经天桥', type: 'negative'},
  ],
  shortest: [
    {label: '⚠ 最短路径', type: 'warning'},
    {label: '✕ 需经过天桥', type: 'negative'},
    {label: '⚠ 有陡坡路段', type: 'warning'},
  ],
};

/**
 * 根据残障类型计算路线无障碍指数
 */
function calcAccessibilityScore(
  baseScore: number,
  disabilityType: DisabilityType,
  navPreference: NavPreference,
  routeType: string,
): number {
  let score = baseScore;

  // 残障类型对路线的影响
  switch (disabilityType) {
    case 'physical':
      score += routeType === 'barrier_free' ? 15 : routeType === 'prefer_ramp' ? 10 : routeType === 'flat_only' ? 8 : -5;
      break;
    case 'visual':
      score += routeType === 'barrier_free' ? 8 : routeType === 'avoid_overpass' ? 10 : routeType === 'standard' ? -3 : 0;
      break;
    case 'hearing':
      score += routeType === 'barrier_free' ? 5 : routeType === 'standard' ? 3 : routeType === 'shortest' ? 2 : 0;
      break;
    case 'cognitive':
      score += routeType === 'barrier_free' ? 12 : routeType === 'flat_only' ? 8 : routeType === 'standard' ? 5 : -2;
      break;
    case 'elderly':
      score += routeType === 'barrier_free' ? 10 : routeType === 'prefer_ramp' ? 8 : routeType === 'flat_only' ? 5 : 0;
      break;
    default:
      // 'none' or unknown — no adjustment
      break;
  }

  // 导航偏好对路线的影响
  if (routeType === navPreference || routeType === 'barrier_free') {
    score += 10;
  }

  // 最短路径对某些残障类型不友好
  if (routeType === 'shortest') {
    score -= disabilityType === 'physical' ? 10 : disabilityType === 'visual' ? 8 : 3;
  }

  return Math.max(30, Math.min(98, score));
}

/**
 * AI 路线规划
 *
 * 1. 获取用户残障画像
 * 2. 根据画像生成 3 条路线方案
 * 3. 返回排序后的路线列表（推荐在前）
 */
export async function planRoutes(
  userId: string,
  input: PlanRoutesInput,
): Promise<RouteOption[]> {
  // 1. 获取用户残障画像
  const profileResult = await query<DisabilityProfile>(
    'SELECT * FROM disability_profiles WHERE user_id = $1',
    [userId],
  );
  const profile = profileResult.rows[0];

  if (!profile) {
    throw new AppError('请先完成残障画像设置', 400);
  }

  const origin = input.origin || '我的位置';
  const destination = input.destination;

  if (!destination || destination.trim().length === 0) {
    throw new AppError('请输入目的地', 400);
  }

  // 2. 生成 3 条模拟路线
  const baseDistances = [
    {meters: 1200, seconds: 900},   // 1.2km, 15min
    {meters: 850, seconds: 660},     // 0.85km, 11min
    {meters: 1500, seconds: 1080},   // 1.5km, 18min
  ];

  const routeTypes = ['barrier_free', 'standard', 'shortest'];
  const routeNames = ['无障碍优先路线', '标准路线', '最短路线'];

  const routes: RouteOption[] = routeTypes.map((type, i) => {
    const features = [...FEATURE_TEMPLATES[type]];
    const score = calcAccessibilityScore(
      75 - i * 10,
      profile.disability_type,
      profile.nav_preference,
      type,
    );

    return {
      id: `route_${Date.now()}_${i}`,
      name: routeNames[i],
      accessibility_score: score,
      distance_meters: baseDistances[i].meters,
      duration_seconds: baseDistances[i].seconds,
      distance_display: formatDistance(baseDistances[i].meters),
      duration_display: formatDuration(baseDistances[i].seconds),
      features,
      is_recommended: i === 0, // 无障碍优先路线默认为推荐
      origin_address: origin,
      destination_address: destination,
    };
  });

  // 3. 按无障碍指数降序排列
  routes.sort((a, b) => b.accessibility_score - a.accessibility_score);

  // 最高分标记为推荐
  routes.forEach((r, i) => {
    r.is_recommended = i === 0;
  });

  return routes;
}

/**
 * 获取单条路线详情
 */
export async function getRouteById(
  userId: string,
  routeId: string,
): Promise<RouteOption | null> {
  // Mock 实现：返回一条模拟路线
  return {
    id: routeId,
    name: '无障碍优先路线',
    accessibility_score: 92,
    distance_meters: 1200,
    duration_seconds: 900,
    distance_display: '1.2km',
    duration_display: '15分钟',
    features: FEATURE_TEMPLATES.barrier_free,
    is_recommended: true,
    origin_address: '我的位置',
    destination_address: '目的地',
  };
}

// ---- 格式化辅助 ----

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km`;
  }
  return `${meters}m`;
}

function formatDuration(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return m > 0 ? `${h}小时${m}分钟` : `${h}小时`;
  }
  const m = Math.floor(seconds / 60);
  return `${m}分钟`;
}
