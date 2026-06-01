import api from './api';

/**
 * Professional Service — 封装专业陪护人员 API
 */

export interface ProfessionalSummary {
  id: string;
  name: string;
  avatar: string | null;
  specialties: string[];
  certifications: string[];
  rating: number;
  completed_trips: number;
  hourly_rate_cents: number | null;
  years_of_experience: number;
  service_area: string[];
  bio: string;
}

export interface CertificationDetail {
  cert_name: string;
  issuing_body: string;
  issued_at: string;
  expires_at: string | null;
}

export interface ReviewItem {
  reviewer_name: string;
  score: number;
  comment: string;
  created_at: string;
}

export interface ProfessionalDetail extends ProfessionalSummary {
  certification_details: CertificationDetail[];
  recent_reviews: ReviewItem[];
  available_schedule: string;
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

export interface ProfessionalListResult {
  professionals: ProfessionalSummary[];
  total: number;
}

/** 获取专业陪护人员列表 */
export async function getProfessionals(
  params: ProfessionalListParams = {},
): Promise<ProfessionalListResult> {
  const response = await api.get('/professionals', {params});
  return response.data as ProfessionalListResult;
}

/** 获取专业人员详情 */
export async function getProfessionalById(
  id: string,
): Promise<ProfessionalDetail> {
  const response = await api.get(`/professionals/${id}`);
  return response.data as ProfessionalDetail;
}

/** 获取筛选标签 */
export async function getSpecialtyFilters(): Promise<string[]> {
  const response = await api.get('/professionals/filters');
  return response.data.specialties as string[];
}

/** 排序选项 */
export const SORT_OPTIONS: {value: ProfessionalListParams['sort_by']; label: string; icon: string}[] = [
  {value: 'rating', label: '评分最高', icon: '⭐'},
  {value: 'completed_trips', label: '经验最多', icon: '🏆'},
  {value: 'hourly_rate', label: '价格最低', icon: '💰'},
];
