import {query} from '../db';
import {AppError} from './authService';

/**
 * Professional Service — 专业陪护人员列表
 *
 * 提供已认证专业陪护人员的查询，支持按专长/价格/评分筛选。
 * 当前使用模拟数据（后续可接入 professional_certifications 表查询）。
 */

// ---- 数据模型 ----

export interface ProfessionalSummary {
  id: string;
  name: string;
  avatar: string | null;
  /** 专长标签 */
  specialties: string[];
  /** 持有的证书 */
  certifications: string[];
  /** 综合评分 1-5 */
  rating: number;
  /** 完成的陪行次数 */
  completed_trips: number;
  /** 时薪（分），null 表示面议 */
  hourly_rate_cents: number | null;
  /** 从业年限 */
  years_of_experience: number;
  /** 服务区域（区/街道） */
  service_area: string[];
  /** 一句话介绍 */
  bio: string;
}

export interface ProfessionalDetail extends ProfessionalSummary {
  /** 证书详情 */
  certification_details: {
    cert_name: string;
    issuing_body: string;
    issued_at: string;
    expires_at: string | null;
  }[];
  /** 近期评价摘要 */
  recent_reviews: {
    reviewer_name: string;
    score: number;
    comment: string;
    created_at: string;
  }[];
  /** 可服务时段 */
  available_schedule: string;
  /** 联系电话（脱敏） */
  contact_phone: string;
}

export interface ProfessionalListParams {
  specialty?: string;
  max_rate_cents?: number;
  min_rating?: number;
  sort_by?: 'rating' | 'completed_trips' | 'hourly_rate';
  limit?: number;
  offset?: number;
}

// ---- 模拟专业陪护人员数据 ----

const MOCK_PROFESSIONALS: ProfessionalDetail[] = [
  {
    id: 'pro_001',
    name: '陈主任',
    avatar: null,
    specialties: ['康复护理', '无障碍出行', '术后陪护'],
    certifications: ['护士执业证', '康复治疗师', '急救认证'],
    rating: 4.9,
    completed_trips: 512,
    hourly_rate_cents: 8000,
    years_of_experience: 12,
    service_area: ['朝阳区', '东城区', '西城区'],
    bio: '三甲医院退休护士长，12 年临床护理经验，擅长康复护理与无障碍出行规划。对待每一位服务对象都如同家人。',
    certification_details: [
      {cert_name: '护士执业证', issuing_body: '国家卫健委', issued_at: '2010-03-15', expires_at: '2028-03-15'},
      {cert_name: '康复治疗师', issuing_body: '中国康复医学会', issued_at: '2015-07-01', expires_at: null},
      {cert_name: '急救认证', issuing_body: '中国红十字会', issued_at: '2022-01-10', expires_at: '2025-01-10'},
    ],
    recent_reviews: [
      {reviewer_name: '张先生', score: 5, comment: '陈主任非常专业，全程照顾周到，妈妈很放心。', created_at: '2026-05-28T10:30:00Z'},
      {reviewer_name: '李女士', score: 5, comment: '术后复查的路上给了很多护理建议，太感谢了！', created_at: '2026-05-25T14:00:00Z'},
      {reviewer_name: '王大爷', score: 4, comment: '路线很熟，轮椅推得稳，就是稍微迟到了一会儿。', created_at: '2026-05-20T09:15:00Z'},
    ],
    available_schedule: '周一至周六 8:00-18:00',
    contact_phone: '139****6789',
  },
  {
    id: 'pro_002',
    name: '刘护工',
    avatar: null,
    specialties: ['日常陪护', '医院陪诊', '轮椅护送'],
    certifications: ['护理员证', '急救认证'],
    rating: 4.7,
    completed_trips: 298,
    hourly_rate_cents: 5000,
    years_of_experience: 5,
    service_area: ['海淀区', '丰台区', '石景山区'],
    bio: '5 年养老机构护理员经验，耐心细致，价格实惠。熟悉北京各大医院就诊流程，擅长轮椅出行护送。',
    certification_details: [
      {cert_name: '护理员证', issuing_body: '北京市人社局', issued_at: '2021-06-01', expires_at: '2026-06-01'},
      {cert_name: '急救认证', issuing_body: '中国红十字会', issued_at: '2023-03-20', expires_at: '2026-03-20'},
    ],
    recent_reviews: [
      {reviewer_name: '赵先生', score: 5, comment: '价格公道，服务态度好，全程帮忙推轮椅。', created_at: '2026-05-29T16:00:00Z'},
      {reviewer_name: '钱阿姨', score: 4, comment: '小伙子很勤快，下次还找他。', created_at: '2026-05-22T11:30:00Z'},
    ],
    available_schedule: '周一至周日 7:00-20:00',
    contact_phone: '136****8901',
  },
  {
    id: 'pro_003',
    name: '杨康复',
    avatar: null,
    specialties: ['运动康复', '无障碍出行', '辅具指导'],
    certifications: ['物理治疗师', '康复医学技师', '无障碍设计师'],
    rating: 4.8,
    completed_trips: 187,
    hourly_rate_cents: 12000,
    years_of_experience: 9,
    service_area: ['西城区', '海淀区', '朝阳区'],
    bio: '国家认证物理治疗师，曾参与无障碍设施改造项目。擅长运动康复训练和辅具使用指导，帮助残障人士自主出行。',
    certification_details: [
      {cert_name: '物理治疗师', issuing_body: '国家卫健委', issued_at: '2017-09-01', expires_at: null},
      {cert_name: '康复医学技师', issuing_body: '中国康复医学会', issued_at: '2019-04-15', expires_at: '2028-04-15'},
      {cert_name: '无障碍设计师', issuing_body: '中国残联', issued_at: '2021-11-01', expires_at: null},
    ],
    recent_reviews: [
      {reviewer_name: '孙先生', score: 5, comment: '杨老师对轮椅使用和辅具非常了解，给了我很多实用建议。', created_at: '2026-05-30T08:00:00Z'},
      {reviewer_name: '周女士', score: 5, comment: '专业又有耐心，帮我们规划了最优的无障碍路线。', created_at: '2026-05-27T13:45:00Z'},
      {reviewer_name: '吴奶奶', score: 4, comment: '非常专业，就是价格稍贵了些。', created_at: '2026-05-18T10:00:00Z'},
    ],
    available_schedule: '周二至周日 9:00-17:00',
    contact_phone: '137****2345',
  },
  {
    id: 'pro_004',
    name: '赵陪护',
    avatar: null,
    specialties: ['视障陪护', '导盲犬配合', '日常出行'],
    certifications: ['视障陪护员', '导盲犬训练师', '急救认证'],
    rating: 4.9,
    completed_trips: 320,
    hourly_rate_cents: 9000,
    years_of_experience: 7,
    service_area: ['东城区', '西城区', '通州区'],
    bio: '专注视障人士陪护 7 年，熟悉导盲犬配合出行。会用语音描述周围环境，让视障人士有"看得见"的安全感。',
    certification_details: [
      {cert_name: '视障陪护员', issuing_body: '中国盲人协会', issued_at: '2019-02-01', expires_at: '2026-02-01'},
      {cert_name: '导盲犬训练师', issuing_body: '中国导盲犬协会', issued_at: '2020-08-15', expires_at: null},
      {cert_name: '急救认证', issuing_body: '中国红十字会', issued_at: '2024-01-05', expires_at: '2027-01-05'},
    ],
    recent_reviews: [
      {reviewer_name: '郑先生', score: 5, comment: '我是盲人，赵陪护的语音描述非常清晰，走起来很安心。', created_at: '2026-05-31T09:00:00Z'},
      {reviewer_name: '陈阿姨', score: 5, comment: '陪我家老爷子去医院，一路搀扶，非常细心。', created_at: '2026-05-26T15:30:00Z'},
    ],
    available_schedule: '周一至周六 7:30-19:00',
    contact_phone: '135****4567',
  },
  {
    id: 'pro_005',
    name: '马护师',
    avatar: null,
    specialties: ['老年陪护', '慢病管理', '心理陪伴'],
    certifications: ['护士执业证', '老年护理专科', '心理咨询师'],
    rating: 4.6,
    completed_trips: 431,
    hourly_rate_cents: 6500,
    years_of_experience: 15,
    service_area: ['丰台区', '大兴区', '房山区'],
    bio: '15 年老年科护理经验，擅长慢病管理和心理陪伴。不仅仅是出行陪护，更是长辈们的贴心伙伴。',
    certification_details: [
      {cert_name: '护士执业证', issuing_body: '国家卫健委', issued_at: '2011-07-01', expires_at: '2029-07-01'},
      {cert_name: '老年护理专科', issuing_body: '中华护理学会', issued_at: '2016-03-01', expires_at: null},
      {cert_name: '心理咨询师', issuing_body: '人社部', issued_at: '2018-11-01', expires_at: null},
    ],
    recent_reviews: [
      {reviewer_name: '黄大爷', score: 5, comment: '小马陪我聊天解闷，比亲闺女还贴心！', created_at: '2026-05-24T11:00:00Z'},
      {reviewer_name: '杨女士', score: 4, comment: '照顾老人很有一套，爸妈都喜欢。', created_at: '2026-05-19T16:30:00Z'},
      {reviewer_name: '徐先生', score: 4, comment: '服务态度好，经验丰富。', created_at: '2026-05-15T08:45:00Z'},
    ],
    available_schedule: '周一至周五 8:00-16:00',
    contact_phone: '138****7890',
  },
  {
    id: 'pro_006',
    name: '孙护工',
    avatar: null,
    specialties: ['无障碍出行', '辅具维修', '志愿者培训'],
    certifications: ['护理员证', '辅具工程师', '志愿者培训师'],
    rating: 4.5,
    completed_trips: 165,
    hourly_rate_cents: 4500,
    years_of_experience: 4,
    service_area: ['朝阳区', '通州区', '顺义区'],
    bio: '年轻且充满热情的专业护理员，同时具备辅具维修技能。在路上遇到轮椅故障也不怕，随时能处理。',
    certification_details: [
      {cert_name: '护理员证', issuing_body: '北京市人社局', issued_at: '2022-03-15', expires_at: '2027-03-15'},
      {cert_name: '辅具工程师', issuing_body: '中国康复辅助器具协会', issued_at: '2023-06-01', expires_at: null},
      {cert_name: '志愿者培训师', issuing_body: '北京市残联', issued_at: '2024-01-10', expires_at: '2027-01-10'},
    ],
    recent_reviews: [
      {reviewer_name: '马先生', score: 5, comment: '路上轮椅出了点小问题，小孙当场就修好了，太厉害了！', created_at: '2026-05-30T14:00:00Z'},
      {reviewer_name: '刘女士', score: 4, comment: '年轻有活力，沟通顺畅，价格实惠。', created_at: '2026-05-21T10:30:00Z'},
    ],
    available_schedule: '周一至周日 8:00-21:00',
    contact_phone: '133****0123',
  },
];

/** 全部专长标签（从 mock 数据中提取的去重列表） */
export const ALL_SPECIALTIES = [
  ...new Set(MOCK_PROFESSIONALS.flatMap(p => p.specialties)),
];

// ---- 业务逻辑 ----

/**
 * 获取专业陪护人员列表（带筛选和排序）
 */
export async function getProfessionals(
  params: ProfessionalListParams = {},
): Promise<{professionals: ProfessionalSummary[]; total: number}> {
  let result = [...MOCK_PROFESSIONALS];

  // 筛选：专长
  if (params.specialty) {
    result = result.filter(p =>
      p.specialties.some(s => s.includes(params.specialty!)),
    );
  }

  // 筛选：最高时薪
  if (params.max_rate_cents !== undefined) {
    result = result.filter(
      p => p.hourly_rate_cents !== null && p.hourly_rate_cents <= params.max_rate_cents!,
    );
  }

  // 筛选：最低评分
  if (params.min_rating !== undefined) {
    result = result.filter(p => p.rating >= params.min_rating!);
  }

  // 排序
  const sortBy = params.sort_by || 'rating';
  result.sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating;
      case 'completed_trips':
        return b.completed_trips - a.completed_trips;
      case 'hourly_rate':
        // null（面议）排最后
        if (a.hourly_rate_cents === null) return 1;
        if (b.hourly_rate_cents === null) return -1;
        return a.hourly_rate_cents - b.hourly_rate_cents;
      default:
        return 0;
    }
  });

  const total = result.length;

  // 分页
  const offset = params.offset || 0;
  const limit = params.limit || 20;
  const paged = result.slice(offset, offset + limit);

  // 去掉详情字段，只返回摘要
  const professionals: ProfessionalSummary[] = paged.map(p => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    specialties: p.specialties,
    certifications: p.certifications,
    rating: p.rating,
    completed_trips: p.completed_trips,
    hourly_rate_cents: p.hourly_rate_cents,
    years_of_experience: p.years_of_experience,
    service_area: p.service_area,
    bio: p.bio,
  }));

  return {professionals, total};
}

/**
 * 获取专业陪护人员详情
 */
export async function getProfessionalById(
  professionalId: string,
): Promise<ProfessionalDetail> {
  const professional = MOCK_PROFESSIONALS.find(p => p.id === professionalId);

  if (!professional) {
    throw new AppError('专业人员不存在', 404);
  }

  return professional;
}

/**
 * 获取所有专长标签（用于筛选 UI）
 */
export async function getSpecialtyFilters(): Promise<string[]> {
  return ALL_SPECIALTIES;
}
