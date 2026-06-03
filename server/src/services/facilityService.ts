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
  query?: string;
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
  // ===== 地铁站无障碍设施 =====
  {id: 'fac_001', name: '王府井地铁站 — 无障碍厕所', facility_type: 'accessible_toilet', location: {type: 'Point', coordinates: [116.417, 39.914]}, address: '王府井地铁站 B1 层', floor: 'B1', door_width_cm: 90, has_handrail: true, description: '站内无障碍厕所，宽敞干净，配有紧急呼叫按钮', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-30T10:00:00Z', valid_until: null}]},
  {id: 'fac_002', name: '天安门广场 — 无障碍坡道', facility_type: 'ramp', location: {type: 'Point', coordinates: [116.397, 39.909]}, address: '天安门广场东侧入口', floor: null, door_width_cm: null, has_handrail: true, description: '广场东侧无障碍坡道，坡度平缓，两侧有扶手', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-30T08:00:00Z', valid_until: null}]},
  {id: 'fac_003', name: '协和医院 — 无障碍电梯', facility_type: 'elevator', location: {type: 'Point', coordinates: [116.409, 39.913]}, address: '协和医院门诊楼 1 层大厅', floor: '1', door_width_cm: 100, has_handrail: true, description: '门诊楼大厅无障碍电梯，可直达各楼层，有语音播报', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-29T14:00:00Z', valid_until: null}]},
  {id: 'fac_004', name: '北京站 — 无障碍停车位', facility_type: 'parking', location: {type: 'Point', coordinates: [116.428, 39.903]}, address: '北京站地下停车场 B2 层', floor: 'B2', door_width_cm: null, has_handrail: false, description: '地下停车场 B2 层，靠近电梯口，共 4 个无障碍车位', source: 'amap', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-28T09:00:00Z', valid_until: null}]},
  {id: 'fac_005', name: '北京大学校医院 — 无障碍厕所', facility_type: 'accessible_toilet', location: {type: 'Point', coordinates: [116.310, 39.992]}, address: '北大校医院 1 层', floor: '1', door_width_cm: 85, has_handrail: true, description: '校医院一楼无障碍厕所，配有扶手和紧急按钮', source: 'user_report', verified: false, current_status: 'maintenance', status_history: [{status: 'maintenance', note: '水龙头维修中', reported_by: null, reported_at: '2026-05-30T12:00:00Z', valid_until: '2026-06-02T12:00:00Z'}]},
  {id: 'fac_006', name: '西单大悦城 — 低位柜台', facility_type: 'low_counter', location: {type: 'Point', coordinates: [116.374, 39.913]}, address: '西单大悦城 3 层服务台', floor: '3', door_width_cm: null, has_handrail: false, description: '服务台设有低位柜台，轮椅用户可方便办理业务', source: 'user_report', verified: false, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-27T15:00:00Z', valid_until: null}]},
  {id: 'fac_007', name: '国贸商城 — 无障碍电梯', facility_type: 'elevator', location: {type: 'Point', coordinates: [116.461, 39.909]}, address: '国贸商城 B1 至 5F', floor: 'B1', door_width_cm: 95, has_handrail: true, description: '地下至 5 层直达无障碍电梯，有盲文按钮和语音提示', source: 'amap', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-26T11:00:00Z', valid_until: null}]},
  {id: 'fac_008', name: '朝阳公园 — 无障碍坡道', facility_type: 'ramp', location: {type: 'Point', coordinates: [116.473, 39.945]}, address: '朝阳公园南门入口', floor: null, door_width_cm: null, has_handrail: true, description: '南门主入口右侧无障碍坡道，直通公园主路', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-25T08:00:00Z', valid_until: null}]},
  {id: 'fac_009', name: '地铁西直门站 — 盲文标识', facility_type: 'braille_sign', location: {type: 'Point', coordinates: [116.357, 39.939]}, address: '西直门地铁站换乘通道', floor: null, door_width_cm: null, has_handrail: false, description: '换乘通道全程盲文标识引导，触觉清晰', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-24T16:00:00Z', valid_until: null}]},
  {id: 'fac_010', name: '积水潭医院 — 无障碍停车位', facility_type: 'parking', location: {type: 'Point', coordinates: [116.380, 39.949]}, address: '积水潭医院停车场 1 层', floor: '1', door_width_cm: null, has_handrail: false, description: '地上停车场，2 个无障碍车位，靠近门诊入口', source: 'user_report', verified: false, current_status: 'crowded', status_history: [{status: 'crowded', note: '今日车位紧张，建议错峰前往', reported_by: null, reported_at: '2026-05-31T09:00:00Z', valid_until: '2026-05-31T18:00:00Z'}]},
  {id: 'fac_011', name: '海淀黄庄 — 无障碍厕所', facility_type: 'accessible_toilet', location: {type: 'Point', coordinates: [116.316, 39.978]}, address: '海淀黄庄地铁站 C 口附近', floor: null, door_width_cm: 88, has_handrail: true, description: 'C 出口旁公共无障碍厕所，24 小时开放', source: 'amap', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-23T10:00:00Z', valid_until: null}]},
  {id: 'fac_012', name: '首都图书馆 — 低位柜台', facility_type: 'low_counter', location: {type: 'Point', coordinates: [116.453, 39.875]}, address: '首都图书馆 1 层借阅大厅', floor: '1', door_width_cm: null, has_handrail: false, description: '借阅大厅设有低位服务柜台，轮椅可直接靠近办理', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-22T13:00:00Z', valid_until: null}]},
  // ===== 新增地铁站设施 =====
  {id: 'fac_013', name: '西单地铁站 — 无障碍电梯', facility_type: 'elevator', location: {type: 'Point', coordinates: [116.374, 39.913]}, address: '西单地铁站 F 口', floor: 'F1', door_width_cm: 95, has_handrail: true, description: '站外直达无障碍电梯，从地面直达站厅', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-06-01T08:00:00Z', valid_until: null}]},
  {id: 'fac_014', name: '东直门地铁站 — 无障碍厕所', facility_type: 'accessible_toilet', location: {type: 'Point', coordinates: [116.433, 39.940]}, address: '东直门地铁站换乘大厅', floor: 'B1', door_width_cm: 90, has_handrail: true, description: '换乘大厅无障碍厕所，维护良好，有婴儿护理台', source: 'amap', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-06-01T10:00:00Z', valid_until: null}]},
  {id: 'fac_015', name: '国家图书馆地铁站 — 盲文标识', facility_type: 'braille_sign', location: {type: 'Point', coordinates: [116.330, 39.946]}, address: '国家图书馆站全站', floor: null, door_width_cm: null, has_handrail: false, description: '全站盲文导向标识覆盖，是全国盲文标识最完善的地铁站之一', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-20T09:00:00Z', valid_until: null}]},
  {id: 'fac_016', name: '北京南站 — 无障碍电梯', facility_type: 'elevator', location: {type: 'Point', coordinates: [116.379, 39.865]}, address: '北京南站北广场入口', floor: '1', door_width_cm: 110, has_handrail: true, description: '超大无障碍电梯，可容纳轮椅+陪同人员+行李', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-18T14:00:00Z', valid_until: null}]},
  // ===== 公园和景区 =====
  {id: 'fac_017', name: '颐和园 — 无障碍坡道', facility_type: 'ramp', location: {type: 'Point', coordinates: [116.272, 39.999]}, address: '颐和园东宫门入口', floor: null, door_width_cm: null, has_handrail: true, description: '东宫门无障碍通道，可直达长廊和昆明湖畔', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-15T08:00:00Z', valid_until: null}]},
  {id: 'fac_018', name: '故宫博物院 — 无障碍厕所', facility_type: 'accessible_toilet', location: {type: 'Point', coordinates: [116.397, 39.918]}, address: '故宫午门入口右侧', floor: '1', door_width_cm: 85, has_handrail: true, description: '午门入口无障碍厕所，可免费借用轮椅', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-20T09:30:00Z', valid_until: null}]},
  {id: 'fac_019', name: '鸟巢 · 国家体育场 — 无障碍电梯', facility_type: 'elevator', location: {type: 'Point', coordinates: [116.390, 39.992]}, address: '国家体育场 C 入口', floor: '1', door_width_cm: 100, has_handrail: true, description: '观赛专用无障碍电梯，可直达各层看台', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-10T16:00:00Z', valid_until: null}]},
  {id: 'fac_020', name: '北海公园 — 无障碍坡道', facility_type: 'ramp', location: {type: 'Point', coordinates: [116.389, 39.928]}, address: '北海公园南门', floor: null, door_width_cm: null, has_handrail: true, description: '南门无障碍通道，可沿湖游览白塔景区', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-12T07:00:00Z', valid_until: null}]},
  {id: 'fac_021', name: '天坛公园 — 无障碍厕所', facility_type: 'accessible_toilet', location: {type: 'Point', coordinates: [116.410, 39.882]}, address: '天坛公园祈年殿西侧', floor: '1', door_width_cm: 88, has_handrail: true, description: '祈年殿附近无障碍厕所，清洁频率高', source: 'amap', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-22T11:00:00Z', valid_until: null}]},
  {id: 'fac_022', name: '圆明园遗址公园 — 无障碍停车位', facility_type: 'parking', location: {type: 'Point', coordinates: [116.304, 40.008]}, address: '圆明园南门停车场', floor: '1', door_width_cm: null, has_handrail: false, description: '南门停车场 6 个无障碍车位，距入口 50 米', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-18T08:00:00Z', valid_until: null}]},
  // ===== 医院 =====
  {id: 'fac_023', name: '北京友谊医院 — 无障碍电梯', facility_type: 'elevator', location: {type: 'Point', coordinates: [116.398, 39.897]}, address: '友谊医院门诊楼大厅', floor: '1', door_width_cm: 105, has_handrail: true, description: '门诊大厅无障碍电梯，空间宽敞，可容纳担架', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-28T09:00:00Z', valid_until: null}]},
  {id: 'fac_024', name: '北京同仁医院 — 无障碍厕所', facility_type: 'accessible_toilet', location: {type: 'Point', coordinates: [116.413, 39.899]}, address: '同仁医院门诊楼 2 层', floor: '2', door_width_cm: 90, has_handrail: true, description: '2 层眼科门诊附近无障碍厕所', source: 'user_report', verified: false, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-25T10:00:00Z', valid_until: null}]},
  {id: 'fac_025', name: '北京儿童医院 — 低位柜台', facility_type: 'low_counter', location: {type: 'Point', coordinates: [116.353, 39.915]}, address: '儿童医院 1 层挂号大厅', floor: '1', door_width_cm: null, has_handrail: false, description: '挂号大厅设有低位服务窗口，方便轮椅儿童及家长', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-20T14:00:00Z', valid_until: null}]},
  {id: 'fac_026', name: '北京安贞医院 — 无障碍停车位', facility_type: 'parking', location: {type: 'Point', coordinates: [116.414, 39.970]}, address: '安贞医院停车场 B1', floor: 'B1', door_width_cm: null, has_handrail: false, description: '地下一层无障碍车位 3 个，紧邻电梯厅', source: 'amap', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-15T08:00:00Z', valid_until: null}]},
  {id: 'fac_027', name: '301 医院 · 解放军总医院 — 无障碍电梯', facility_type: 'elevator', location: {type: 'Point', coordinates: [116.285, 39.907]}, address: '301 医院门诊楼', floor: '1', door_width_cm: 110, has_handrail: true, description: '超大型无障碍电梯，军医院最高标准', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-06-01T07:00:00Z', valid_until: null}]},
  // ===== 商场 =====
  {id: 'fac_028', name: '三里屯太古里 — 无障碍厕所', facility_type: 'accessible_toilet', location: {type: 'Point', coordinates: [116.455, 39.932]}, address: '太古里南区 B1', floor: 'B1', door_width_cm: 92, has_handrail: true, description: '南区地下一层无障碍厕所，干净整洁，有婴儿台', source: 'amap', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-30T16:00:00Z', valid_until: null}]},
  {id: 'fac_029', name: 'SKP 商场 — 无障碍电梯', facility_type: 'elevator', location: {type: 'Point', coordinates: [116.468, 39.911]}, address: 'SKP 正门右侧', floor: '1', door_width_cm: 100, has_handrail: true, description: '正门无障碍电梯直达各层，有语音提示', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-28T12:00:00Z', valid_until: null}]},
  {id: 'fac_030', name: '朝阳大悦城 — 无障碍停车位', facility_type: 'parking', location: {type: 'Point', coordinates: [116.522, 39.923]}, address: '朝阳大悦城 B2 停车场', floor: 'B2', door_width_cm: null, has_handrail: false, description: 'B2 层电梯口附近 8 个无障碍车位', source: 'amap', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-26T10:00:00Z', valid_until: null}]},
  {id: 'fac_031', name: '荟聚购物中心 — 低位柜台', facility_type: 'low_counter', location: {type: 'Point', coordinates: [116.325, 39.787]}, address: '西红门荟聚 1 层服务台', floor: '1', door_width_cm: null, has_handrail: false, description: '服务台设有宽敞低位柜台，方便轮椅用户', source: 'user_report', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-19T15:00:00Z', valid_until: null}]},
  // ===== 公共建筑和文化 =====
  {id: 'fac_032', name: '国家大剧院 — 无障碍电梯', facility_type: 'elevator', location: {type: 'Point', coordinates: [116.389, 39.903]}, address: '国家大剧院北门入口', floor: '1', door_width_cm: 100, has_handrail: true, description: '北门无障碍电梯，配语音播报和盲文按钮', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-14T18:00:00Z', valid_until: null}]},
  {id: 'fac_033', name: '国家博物馆 — 无障碍坡道', facility_type: 'ramp', location: {type: 'Point', coordinates: [116.401, 39.905]}, address: '国家博物馆西门', floor: null, door_width_cm: null, has_handrail: true, description: '西门无障碍通道直达展厅，可免费租用轮椅', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-16T09:00:00Z', valid_until: null}]},
  {id: 'fac_034', name: '中国美术馆 — 低位柜台', facility_type: 'low_counter', location: {type: 'Point', coordinates: [116.408, 39.924]}, address: '中国美术馆 1 层售票处', floor: '1', door_width_cm: null, has_handrail: false, description: '售票处低位窗口，方便轮椅用户购票', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-11T10:00:00Z', valid_until: null}]},
  {id: 'fac_035', name: '北京西站 — 盲文标识', facility_type: 'braille_sign', location: {type: 'Point', coordinates: [116.322, 39.895]}, address: '北京西站候车大厅及站台', floor: null, door_width_cm: null, has_handrail: false, description: '全站覆盖盲文导向标识，含电梯按钮盲文', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-08T14:00:00Z', valid_until: null}]},
  {id: 'fac_036', name: '北京市政务服务中心 — 无障碍厕所', facility_type: 'accessible_toilet', location: {type: 'Point', coordinates: [116.455, 39.900]}, address: '六里桥政务中心 1 层', floor: '1', door_width_cm: 95, has_handrail: true, description: '一层大厅无障碍厕所，设施完善', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-13T08:30:00Z', valid_until: null}]},
  // ===== 高校 =====
  {id: 'fac_037', name: '清华大学 — 无障碍坡道', facility_type: 'ramp', location: {type: 'Point', coordinates: [116.326, 40.000]}, address: '清华大学主楼入口', floor: null, door_width_cm: null, has_handrail: true, description: '主楼无障碍通道，连接主要教学楼区', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-21T08:00:00Z', valid_until: null}]},
  {id: 'fac_038', name: '北京大学 — 无障碍厕所', facility_type: 'accessible_toilet', location: {type: 'Point', coordinates: [116.310, 39.992]}, address: '北大图书馆 1 层', floor: '1', door_width_cm: 88, has_handrail: true, description: '图书馆一层无障碍厕所，安静整洁', source: 'amap', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-17T09:00:00Z', valid_until: null}]},
  {id: 'fac_039', name: '北京师范大学 — 无障碍电梯', facility_type: 'elevator', location: {type: 'Point', coordinates: [116.367, 39.962]}, address: '北师大教二楼', floor: '1', door_width_cm: 90, has_handrail: true, description: '教学楼无障碍电梯，可达各层教室', source: 'user_report', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-09T11:00:00Z', valid_until: null}]},
  {id: 'fac_040', name: '中国人民大学 — 盲文标识', facility_type: 'braille_sign', location: {type: 'Point', coordinates: [116.316, 39.970]}, address: '人大图书馆全楼', floor: null, door_width_cm: null, has_handrail: false, description: '图书馆盲文标识系统，含楼层导航和紧急出口指引', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-07T15:00:00Z', valid_until: null}]},
  // ===== 运动场馆 =====
  {id: 'fac_041', name: '国家游泳中心 · 水立方 — 无障碍厕所', facility_type: 'accessible_toilet', location: {type: 'Point', coordinates: [116.391, 39.993]}, address: '水立方 1 层大厅', floor: '1', door_width_cm: 92, has_handrail: true, description: '一层无障碍厕所，赛后保持良好维护', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-19T16:00:00Z', valid_until: null}]},
  {id: 'fac_042', name: '工人体育场 — 无障碍坡道', facility_type: 'ramp', location: {type: 'Point', coordinates: [116.448, 39.930]}, address: '工体北门入口', floor: null, door_width_cm: null, has_handrail: true, description: '北门无障碍通道，有专用观赛区', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-23T18:00:00Z', valid_until: null}]},
  {id: 'fac_043', name: '五棵松体育馆 — 无障碍停车位', facility_type: 'parking', location: {type: 'Point', coordinates: [116.276, 39.909]}, address: '五棵松体育馆停车场 A 区', floor: '1', door_width_cm: null, has_handrail: false, description: 'A 区 12 个无障碍车位，距入口最近', source: 'amap', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-29T15:00:00Z', valid_until: null}]},
  // ===== 交通枢纽 =====
  {id: 'fac_044', name: '首都机场 T3 — 无障碍厕所', facility_type: 'accessible_toilet', location: {type: 'Point', coordinates: [116.614, 40.054]}, address: 'T3 航站楼出发层', floor: '3', door_width_cm: 95, has_handrail: true, description: '出发层无障碍厕所，另有淋浴间和更衣室', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-06-02T06:00:00Z', valid_until: null}]},
  {id: 'fac_045', name: '首都机场 T3 — 低位柜台', facility_type: 'low_counter', location: {type: 'Point', coordinates: [116.614, 40.054]}, address: 'T3 航站楼值机大厅', floor: '3', door_width_cm: null, has_handrail: false, description: '值机大厅多个低位值机柜台，轮椅可直接办理', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-06-02T06:00:00Z', valid_until: null}]},
  {id: 'fac_046', name: '北京大兴机场 — 无障碍电梯', facility_type: 'elevator', location: {type: 'Point', coordinates: [116.410, 39.510]}, address: '大兴机场航站楼中心', floor: '1', door_width_cm: 110, has_handrail: true, description: '超大型无障碍电梯群，配多语言语音导航', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-31T07:00:00Z', valid_until: null}]},
  {id: 'fac_047', name: '北京南站 — 低位柜台', facility_type: 'low_counter', location: {type: 'Point', coordinates: [116.379, 39.865]}, address: '北京南站售票大厅', floor: '1', door_width_cm: null, has_handrail: false, description: '售票厅低位窗口，轮椅用户可舒适购票', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-24T08:00:00Z', valid_until: null}]},
  // ===== 社区设施 =====
  {id: 'fac_048', name: '望京社区卫生服务中心 — 无障碍坡道', facility_type: 'ramp', location: {type: 'Point', coordinates: [116.482, 39.998]}, address: '望京社区卫生服务中心正门', floor: null, door_width_cm: null, has_handrail: true, description: '正门无障碍坡道，坡度适中，适合轮椅和助行器', source: 'user_report', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-15T09:00:00Z', valid_until: null}]},
  {id: 'fac_049', name: '回龙观社区公园 — 无障碍厕所', facility_type: 'accessible_toilet', location: {type: 'Point', coordinates: [116.341, 40.073]}, address: '回龙观体育公园内', floor: '1', door_width_cm: 85, has_handrail: true, description: '公园无障碍厕所，居民反馈后新改造', source: 'user_report', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-12T10:00:00Z', valid_until: null}]},
  {id: 'fac_050', name: '方庄社区 — 盲文标识', facility_type: 'braille_sign', location: {type: 'Point', coordinates: [116.430, 39.868]}, address: '方庄社区服务中心全楼', floor: null, door_width_cm: null, has_handrail: false, description: '社区服务中心盲文导引，含各窗口服务说明', source: 'user_report', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-06T14:00:00Z', valid_until: null}]},
  // ===== 北京核心景点 =====
  {id: 'fac_051', name: '景山公园 — 无障碍坡道', facility_type: 'ramp', location: {type: 'Point', coordinates: [116.396, 39.925]}, address: '景山公园南门', floor: null, door_width_cm: null, has_handrail: true, description: '南门无障碍通道，可达万春亭山脚', source: 'official', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-03T08:00:00Z', valid_until: null}]},
  {id: 'fac_052', name: '雍和宫 — 无障碍厕所', facility_type: 'accessible_toilet', location: {type: 'Point', coordinates: [116.418, 39.947]}, address: '雍和宫入口广场右侧', floor: '1', door_width_cm: 85, has_handrail: true, description: '入口广场无障碍厕所，游客服务中心旁', source: 'amap', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-01T09:00:00Z', valid_until: null}]},
  {id: 'fac_053', name: '南锣鼓巷 — 无障碍坡道', facility_type: 'ramp', location: {type: 'Point', coordinates: [116.403, 39.938]}, address: '南锣鼓巷南口', floor: null, door_width_cm: null, has_handrail: true, description: '南口主入口无障碍通道，可通主巷', source: 'user_report', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-05T11:00:00Z', valid_until: null}]},
  // ===== 商场补充 =====
  {id: 'fac_054', name: '王府井 APM — 无障碍电梯', facility_type: 'elevator', location: {type: 'Point', coordinates: [116.416, 39.915]}, address: 'APM 商场 1 层中庭', floor: '1', door_width_cm: 95, has_handrail: true, description: '中庭全景无障碍电梯，语音播报+盲文按钮', source: 'amap', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-27T13:00:00Z', valid_until: null}]},
  {id: 'fac_055', name: '蓝色港湾 — 无障碍停车位', facility_type: 'parking', location: {type: 'Point', coordinates: [116.473, 39.951]}, address: '蓝色港湾地下停车场 A 区', floor: 'B1', door_width_cm: null, has_handrail: false, description: '地下 A 区 5 个无障碍车位，电梯直达商业区', source: 'amap', verified: true, current_status: 'normal', status_history: [{status: 'normal', note: null, reported_by: null, reported_at: '2026-05-25T14:00:00Z', valid_until: null}]},
];

// ---- 业务逻辑 ----

/**
 * 搜索无障碍设施
 */
export async function searchFacilities(
  params: FacilitySearchParams = {},
): Promise<{facilities: FacilitySummary[]; total: number}> {
  let result = [...MOCK_FACILITIES];

  // 关键词搜索（模糊匹配名称/地址）
  if (params.query) {
    const q = params.query.toLowerCase();
    result = result.filter(f =>
      f.name.toLowerCase().includes(q) ||
      (f.address && f.address.toLowerCase().includes(q))
    );
  }

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
