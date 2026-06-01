import {AppError} from './authService';
import type {RouteFeature} from './routeService';

/**
 * Navigation Service — 实时导航业务逻辑
 *
 * 为指定路线生成逐向导航指令和障碍提醒。
 * 当前为模拟数据，生产环境接入高德导航 SDK。
 */

// ---- 导航数据 ----

export interface NavigationStep {
  /** 序号 (1-based) */
  index: number;
  /** 导航指令 */
  instruction: string;
  /** 本段距离（米） */
  distance_meters: number;
  /** 本段耗时（秒） */
  duration_seconds: number;
  /** 无障碍提示 */
  accessibility_note: string | null;
  /** 步骤类型 */
  type: 'straight' | 'turn_left' | 'turn_right' | 'elevator' | 'ramp' | 'stairs_up' | 'stairs_down' | 'crosswalk' | 'underpass' | 'overpass' | 'arrive';
  /** 无障碍友好程度 */
  accessibility_level: 'good' | 'ok' | 'warning' | 'danger';
}

export interface ObstacleWarning {
  id: string;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  distance_ahead_meters: number;
  icon: string;
}

export interface NavigationData {
  route: {
    id: string;
    name: string;
    origin_address: string;
    destination_address: string;
    distance_display: string;
    duration_display: string;
    accessibility_score: number;
  };
  steps: NavigationStep[];
  obstacles: ObstacleWarning[];
  companion: {
    name: string;
    phone: string;
  } | null;
}

// ---- 模拟导航步骤模板 ----

const NAV_STEP_TEMPLATES: Record<string, Omit<NavigationStep, 'index' | 'distance_meters' | 'duration_seconds'>[]> = {
  barrier_free: [
    {instruction: '沿当前道路直行', type: 'straight', accessibility_note: '人行道宽阔平坦', accessibility_level: 'good'},
    {instruction: '前方右转进入建设路', type: 'turn_right', accessibility_note: '路口有坡道衔接', accessibility_level: 'good'},
    {instruction: '乘坐无障碍电梯至地下通道', type: 'elevator', accessibility_note: '电梯门宽 1.2m，按钮高度 1.1m', accessibility_level: 'good'},
    {instruction: '沿地下通道直行约 200m', type: 'underpass', accessibility_note: '全程平坦，照明充足', accessibility_level: 'good'},
    {instruction: '出地下通道后左转', type: 'turn_left', accessibility_note: '坡道坡度约 5%', accessibility_level: 'ok'},
    {instruction: '沿人行道直行至目的地', type: 'straight', accessibility_note: '路面平坦，无台阶', accessibility_level: 'good'},
    {instruction: '到达目的地', type: 'arrive', accessibility_note: '入口有无障碍坡道', accessibility_level: 'good'},
  ],
  standard: [
    {instruction: '沿当前道路直行', type: 'straight', accessibility_note: '人行道宽度 1.5m', accessibility_level: 'ok'},
    {instruction: '前方右转进入建设路', type: 'turn_right', accessibility_note: '路口有小台阶，注意抬脚', accessibility_level: 'warning'},
    {instruction: '前方过街天桥', type: 'overpass', accessibility_note: '⚠ 台阶约 40 级，无电梯', accessibility_level: 'danger'},
    {instruction: '沿人行道直行', type: 'straight', accessibility_note: '部分路段较窄 (0.8m)', accessibility_level: 'warning'},
    {instruction: '通过斑马线过街', type: 'crosswalk', accessibility_note: '信号灯时长 30 秒', accessibility_level: 'ok'},
    {instruction: '到达目的地', type: 'arrive', accessibility_note: '入口有 3 级台阶', accessibility_level: 'warning'},
  ],
  shortest: [
    {instruction: '沿当前道路直行', type: 'straight', accessibility_note: null, accessibility_level: 'ok'},
    {instruction: '前方右转', type: 'turn_right', accessibility_note: null, accessibility_level: 'ok'},
    {instruction: '上台阶通过天桥', type: 'overpass', accessibility_note: '⚠ 台阶约 50 级，无电梯', accessibility_level: 'danger'},
    {instruction: '下天桥后直行', type: 'straight', accessibility_note: '⚠ 下桥坡度较陡', accessibility_level: 'warning'},
    {instruction: '穿过小巷', type: 'straight', accessibility_note: '⚠ 路面不平，通道狭窄', accessibility_level: 'danger'},
    {instruction: '到达目的地', type: 'arrive', accessibility_note: null, accessibility_level: 'ok'},
  ],
};

const OBSTACLE_TEMPLATES: ObstacleWarning[] = [
  {
    id: 'obs_1',
    type: 'construction',
    description: '前方 150m 人行道施工，请走临时通道',
    severity: 'medium',
    distance_ahead_meters: 150,
    icon: '🚧',
  },
  {
    id: 'obs_2',
    type: 'parked_vehicle',
    description: '前方 400m 可能有违停车辆占用人行道',
    severity: 'low',
    distance_ahead_meters: 400,
    icon: '🚗',
  },
  {
    id: 'obs_3',
    type: 'broken_elevator',
    description: '天桥电梯处于维护中，请使用坡道绕行',
    severity: 'high',
    distance_ahead_meters: 250,
    icon: '🛗',
  },
];

/**
 * 获取路线导航数据
 */
export async function getNavigationData(
  userId: string,
  routeId: string,
): Promise<NavigationData> {
  if (!routeId) {
    throw new AppError('路线 ID 不能为空', 400);
  }

  // 根据路线 ID 末尾数字决定使用哪个模板
  const lastChar = routeId.slice(-1);
  const templateKey =
    lastChar === '0' ? 'barrier_free' :
    lastChar === '1' ? 'standard' : 'shortest';

  const template = NAV_STEP_TEMPLATES[templateKey];

  // 生成导航步骤（每段分配距离和时间）
  const stepDistances = [150, 80, 120, 200, 100, 200, 0];
  const stepDurations = [120, 60, 90, 180, 80, 150, 0];

  const steps: NavigationStep[] = template.map((tpl, i) => ({
    ...tpl,
    index: i + 1,
    distance_meters: stepDistances[i] || 0,
    duration_seconds: stepDurations[i] || 0,
  }));

  // 筛选相关障碍（去掉不匹配的）
  const obstacles: ObstacleWarning[] = templateKey === 'barrier_free'
    ? [OBSTACLE_TEMPLATES[0]] // 无障碍路线障碍最少
    : templateKey === 'standard'
    ? [OBSTACLE_TEMPLATES[0], OBSTACLE_TEMPLATES[1]]
    : OBSTACLE_TEMPLATES; // 最短路径障碍最多

  return {
    route: {
      id: routeId,
      name: templateKey === 'barrier_free' ? '无障碍优先路线' : templateKey === 'standard' ? '标准路线' : '最短路线',
      origin_address: '我的位置',
      destination_address: '目的地',
      distance_display: '1.2km',
      duration_display: '15分钟',
      accessibility_score: templateKey === 'barrier_free' ? 92 : templateKey === 'standard' ? 78 : 71,
    },
    steps,
    obstacles,
    companion: null, // 当前无陪行人，后续关联 companion_sessions
  };
}
