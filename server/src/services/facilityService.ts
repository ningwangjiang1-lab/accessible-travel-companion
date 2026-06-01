import {query} from '../db';
import {AppError} from './authService';

/**
 * Facility Service — 无障碍设施查询
 *
 * 提供无障碍设施（厕所/电梯/坡道/停车位/低位柜台/盲文标识）的
 * 搜索和详情查询。当前使用模拟数据。
 */

// ---- 数据模型 ----

export type FacilityType = 'accessible_toilet' | 'parking' | 'elevator' | 'ramp' | 'low_counter' | 'braille_sign';
export type FacilityStatus = 'normal' | 'maintenance' | 'out_of_service' | 'crowded';

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface FacilitySummary {
  id: string;
  name: string;
  facility_type: FacilityType;
  location: GeoPoint;
  address: string | null;
  floor: string | null;
  door_width_cm: number | null;
  has_handrail: boolean;
  description: string | null;
  source: string;
  verified: boolean;
  /** 当前运行状态 */
  current_status: FacilityStatus | null;
  /** 距离（米），搜索时计算 */
  distance_meters?: number;
}

export interface FacilityDetail extends FacilitySummary {
  /** 状态历史 */
  status_history: {
    status: FacilityStatus;
    note: string | null;
    reported_by: string | null;
    reported_at: string;
    valid_until: string | null;
  }[];
}

export interface FacilitySearchParams {
  facility_type?: FacilityType;
  lat?: number;
  lng?: number;
  radius_meters?: number;
  limit?: number;
  offset?: number;
}

// ---- 设施类型配置 ----

export const FACILITY_TYPE_CONFIG: Record<FacilityType, {label: string; icon: string}> = {
  accessible_toilet: {label: '无障碍厕所', icon: '🚻'},
  parking: {label: '无障碍停车位', icon: '🅿️'},
  elevator: {label: '无障碍电梯', icon: '🛗'},
  ramp: {label: '坡道', icon: '🔽'},
  low_counter: {label: '低位柜台', icon: '🪟'},
  braille_sign: {label: '盲文标识', icon: '🖐️'},
};

export const STATUS_LABELS: Record<FacilityStatus, string> = {
  normal: '正常',
  maintenance: '维护中',
  out_of_service: '暂停使用',
  crowded: '拥挤',
};

// ---- 模拟设施数据（北京地区） ----

const MOCK_FACILITIES: FacilityDetail[] = [
  {
    id: 'fac_001',
    name: '王府井地铁站 — 无障碍厕所',
    facility_type: 'accessible_toilet',
    location: {type: 'Point', coordinates: [116.417, 39.914]},
    address: '王府井地铁站 B1 层',
    floor: 'B1',
    door_width_cm: 90,
    has_handrail: true,
    description: '站内无障碍厕所，宽敞干净，配有紧急呼叫按钮',
    source: 'official',
    verified: true,
    current_status: 'normal',
    status_history: [
      {status: 'normal', note: null, reported_by: null, reported_at: '2026-05-30T10:00:00Z', valid_until: null},
    ],
  },
  {
    id: 'fac_002',
    name: '天安门广场 — 无障碍坡道',
    facility_type: 'ramp',
    location: {type: 'Point', coordinates: [116.397, 39.909]},
    address: '天安门广场东侧入口',
    floor: null,
    door_width_cm: null,
    has_handrail: true,
    description: '广场东侧无障碍坡道，坡度平缓，两侧有扶手',
    source: 'official',
    verified: true,
    current_status: 'normal',
    status_history: [
      {status: 'normal', note: null, reported_by: null, reported_at: '2026-05-30T08:00:00Z', valid_until: null},
    ],
  },
  {
    id: 'fac_003',
    name: '协和医院 — 无障碍电梯',
    facility_type: 'elevator',
    location: {type: 'Point', coordinates: [116.409, 39.913]},
    address: '协和医院门诊楼 1 层大厅',
    floor: '1',
    door_width_cm: 100,
    has_handrail: true,
    description: '门诊楼大厅无障碍电梯，可直达各楼层，有语音播报',
    source: 'official',
    verified: true,
    current_status: 'normal',
    status_history: [
      {status: 'normal', note: null, reported_by: null, reported_at: '2026-05-29T14:00:00Z', valid_until: null},
    ],
  },
  {
    id: 'fac_004',
    name: '北京站 — 无障碍停车位',
    facility_type: 'parking',
    location: {type: 'Point', coordinates: [116.428, 39.903]},
    address: '北京站地下停车场 B2 层',
    floor: 'B2',
    door_width_cm: null,
    has_handrail: false,
    description: '地下停车场 B2 层，靠近电梯口，共 4 个无障碍车位',
    source: 'amap',
    verified: true,
    current_status: 'normal',
    status_history: [
      {status: 'normal', note: null, reported_by: null, reported_at: '2026-05-28T09:00:00Z', valid_until: null},
    ],
  },
  {
    id: 'fac_005',
    name: '北京大学校医院 — 无障碍厕所',
    facility_type: 'accessible_toilet',
    location: {type: 'Point', coordinates: [116.310, 39.992]},
    address: '北大校医院 1 层',
    floor: '1',
    door_width_cm: 85,
    has_handrail: true,
    description: '校医院一楼无障碍厕所，配有扶手和紧急按钮',
    source: 'user_report',
    verified: false,
    current_status: 'maintenance',
    status_history: [
      {status: 'maintenance', note: '水龙头维修中，预计 3 天后恢复', reported_by: null, reported_at: '2026-05-30T12:00:00Z', valid_until: '2026-06-02T12:00:00Z'},
    ],
  },
  {
    id: 'fac_006',
    name: '西单大悦城 — 低位柜台',
    facility_type: 'low_counter',
    location: {type: 'Point', coordinates: [116.374, 39.913]},
    address: '西单大悦城 3 层服务台',
    floor: '3',
    door_width_cm: null,
    has_handrail: false,
    description: '服务台设有低位柜台，轮椅用户可方便办理业务',
    source: 'user_report',
    verified: false,
    current_status: 'normal',
    status_history: [
      {status: 'normal', note: null, reported_by: null, reported_at: '2026-05-27T15:00:00Z', valid_until: null},
    ],
  },
  {
    id: 'fac_007',
    name: '国贸商城 — 无障碍电梯',
    facility_type: 'elevator',
    location: {type: 'Point', coordinates: [116.461, 39.909]},
    address: '国贸商城 B1 至 5F',
    floor: 'B1',
    door_width_cm: 95,
    has_handrail: true,
    description: '地下至 5 层直达无障碍电梯，有盲文按钮和语音提示',
    source: 'amap',
    verified: true,
    current_status: 'normal',
    status_history: [
      {status: 'normal', note: null, reported_by: null, reported_at: '2026-05-26T11:00:00Z', valid_until: null},
    ],
  },
  {
    id: 'fac_008',
    name: '朝阳公园 — 无障碍坡道',
    facility_type: 'ramp',
    location: {type: 'Point', coordinates: [116.473, 39.945]},
    address: '朝阳公园南门入口',
    floor: null,
    door_width_cm: null,
    has_handrail: true,
    description: '南门主入口右侧无障碍坡道，直接通往公园主路',
    source: 'official',
    verified: true,
    current_status: 'normal',
    status_history: [
      {status: 'normal', note: null, reported_by: null, reported_at: '2026-05-25T08:00:00Z', valid_until: null},
    ],
  },
  {
    id: 'fac_009',
    name: '地铁西直门站 — 盲文标识',
    facility_type: 'braille_sign',
    location: {type: 'Point', coordinates: [116.357, 39.939]},
    address: '西直门地铁站换乘通道',
    floor: null,
    door_width_cm: null,
    has_handrail: false,
    description: '换乘通道全程盲文标识引导，触觉清晰',
    source: 'official',
    verified: true,
    current_status: 'normal',
    status_history: [
      {status: 'normal', note: null, reported_by: null, reported_at: '2026-05-24T16:00:00Z', valid_until: null},
    ],
  },
  {
    id: 'fac_010',
    name: '积水潭医院 — 无障碍停车位',
    facility_type: 'parking',
    location: {type: 'Point', coordinates: [116.380, 39.949]},
    address: '积水潭医院停车场 1 层',
    floor: '1',
    door_width_cm: null,
    has_handrail: false,
    description: '地上停车场，2 个无障碍车位，靠近门诊入口',
    source: 'user_report',
    verified: false,
    current_status: 'crowded',
    status_history: [
      {status: 'crowded', note: '今日车位紧张，建议错峰前往', reported_by: null, reported_at: '2026-05-31T09:00:00Z', valid_until: '2026-05-31T18:00:00Z'},
    ],
  },
  {
    id: 'fac_011',
    name: '海淀黄庄 — 无障碍厕所',
    facility_type: 'accessible_toilet',
    location: {type: 'Point', coordinates: [116.316, 39.978]},
    address: '海淀黄庄地铁站 C 口附近',
    floor: null,
    door_width_cm: 88,
    has_handrail: true,
    description: 'C 出口旁公共无障碍厕所，24 小时开放',
    source: 'amap',
    verified: true,
    current_status: 'normal',
    status_history: [
      {status: 'normal', note: null, reported_by: null, reported_at: '2026-05-23T10:00:00Z', valid_until: null},
    ],
  },
  {
    id: 'fac_012',
    name: '首都图书馆 — 低位柜台',
    facility_type: 'low_counter',
    location: {type: 'Point', coordinates: [116.453, 39.875]},
    address: '首都图书馆 1 层借阅大厅',
    floor: '1',
    door_width_cm: null,
    has_handrail: false,
    description: '借阅大厅设有低位服务柜台，轮椅可直接靠近办理',
    source: 'official',
    verified: true,
    current_status: 'normal',
    status_history: [
      {status: 'normal', note: null, reported_by: null, reported_at: '2026-05-22T13:00:00Z', valid_until: null},
    ],
  },
];

// ---- 业务逻辑 ----

/**
 * 搜索无障碍设施
 */
export async function searchFacilities(
  params: FacilitySearchParams = {},
): Promise<{facilities: FacilitySummary[]; total: number}> {
  let result = [...MOCK_FACILITIES];

  // 按类型筛选
  if (params.facility_type) {
    result = result.filter(f => f.facility_type === params.facility_type);
  }

  // 按距离筛选（模拟：基于坐标简单排序）
  if (params.lat !== undefined && params.lng !== undefined) {
    result = result.map(f => {
      const [flng, flat] = f.location.coordinates;
      const dLat = (flat - params.lat!) * 111000; // 1° ≈ 111km
      const dLng = (flng - params.lng!) * 111000 * Math.cos(params.lat! * Math.PI / 180);
      const distance = Math.sqrt(dLat * dLat + dLng * dLng);
      return {...f, distance_meters: Math.round(distance)};
    });

    // 按距离排序
    result.sort((a, b) => (a.distance_meters || 0) - (b.distance_meters || 0));

    // 半径筛选
    if (params.radius_meters) {
      result = result.filter(f => (f.distance_meters || 0) <= params.radius_meters!);
    }
  }

  const total = result.length;

  // 分页
  const offset = params.offset || 0;
  const limit = params.limit || 20;
  const paged = result.slice(offset, offset + limit);

  // 去掉详情字段
  const facilities: FacilitySummary[] = paged.map(f => ({
    id: f.id,
    name: f.name,
    facility_type: f.facility_type,
    location: f.location,
    address: f.address,
    floor: f.floor,
    door_width_cm: f.door_width_cm,
    has_handrail: f.has_handrail,
    description: f.description,
    source: f.source,
    verified: f.verified,
    current_status: f.current_status,
    distance_meters: f.distance_meters,
  }));

  return {facilities, total};
}

/**
 * 获取设施详情
 */
export async function getFacilityById(facilityId: string): Promise<FacilityDetail> {
  const facility = MOCK_FACILITIES.find(f => f.id === facilityId);
  if (!facility) {
    throw new AppError('设施不存在', 404);
  }
  return facility;
}

/**
 * 获取设施类型列表
 */
export async function getFacilityTypes() {
  return Object.entries(FACILITY_TYPE_CONFIG).map(([value, config]) => ({
    value,
    ...config,
  }));
}
