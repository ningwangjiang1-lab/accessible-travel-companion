import api from './api';

/**
 * Volunteer Certification Service — 封装志愿者认证 API
 */

export type CertType = 'basic' | 'professional' | 'first_aid' | 'sign_language' | 'guide_dog_handler';
export type CertStatus = 'pending' | 'approved' | 'rejected';

export interface VolunteerCertification {
  id: string;
  user_id: string;
  real_name: string;
  id_card_number: string | null;
  id_card_photo: string | null;
  cert_type: CertType;
  cert_photo: string | null;
  training_completed: boolean;
  status: CertStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmitCertInput {
  real_name: string;
  id_card_number?: string;
  cert_type: CertType;
  training_completed?: boolean;
}

export interface CertTypeInfo {
  value: CertType;
  label: string;
  icon: string;
  description: string;
  requirements: string[];
}

/** 认证状态中文映射 */
export const STATUS_CONFIG: Record<CertStatus, {label: string; icon: string; variant: 'warning' | 'success' | 'danger'; description: string}> = {
  pending: {
    label: '审核中',
    icon: '⏳',
    variant: 'warning',
    description: '您的认证申请正在审核，预计 3-5 个工作日内完成',
  },
  approved: {
    label: '已认证',
    icon: '✅',
    variant: 'success',
    description: '恭喜！您已通过志愿者认证',
  },
  rejected: {
    label: '未通过',
    icon: '❌',
    variant: 'danger',
    description: '您的认证申请未通过审核，可查看原因后重新提交',
  },
};

/** 获取我的认证状态 */
export async function getMyCertification(): Promise<{
  has_cert: boolean;
  certification: VolunteerCertification | null;
}> {
  const response = await api.get('/volunteer-certs');
  return response.data;
}

/** 提交认证申请 */
export async function submitCertification(
  input: SubmitCertInput,
): Promise<VolunteerCertification> {
  const response = await api.post('/volunteer-certs', input);
  return response.data as VolunteerCertification;
}

/** 获取认证类型列表 */
export async function getCertTypes(): Promise<CertTypeInfo[]> {
  const response = await api.get('/volunteer-certs/types');
  return response.data.types as CertTypeInfo[];
}
