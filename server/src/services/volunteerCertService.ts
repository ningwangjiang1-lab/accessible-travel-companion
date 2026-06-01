import {query} from '../db';
import {AppError} from './authService';

/**
 * Volunteer Certification Service — 志愿者认证管理
 *
 * 用户可提交志愿者身份认证申请（每位用户限一条记录）。
 * 认证类型包括基础培训、专业培训、急救认证、手语翻译、导盲犬训练。
 */

// ---- 数据模型 ----

export type CertType = 'basic' | 'professional' | 'first_aid' | 'sign_language' | 'guide_dog_handler';
export type CertStatus = 'pending' | 'approved' | 'rejected';

export interface CreateCertInput {
  real_name: string;
  id_card_number?: string;
  cert_type: CertType;
  training_completed?: boolean;
}

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

/** 认证类型配置 */
export const CERT_TYPE_CONFIG: Record<CertType, {label: string; icon: string; description: string; requirements: string[]}> = {
  basic: {
    label: '基础培训',
    icon: '📋',
    description: '完成平台基础无障碍陪护培训',
    requirements: ['年满 18 周岁', '完成在线培训课程', '通过基础考核'],
  },
  professional: {
    label: '专业培训',
    icon: '🎓',
    description: '具备专业护理或康复相关资质',
    requirements: ['持有相关专业证书', '2 年以上从业经验', '通过专业考核'],
  },
  first_aid: {
    label: '急救认证',
    icon: '🏥',
    description: '持有有效急救员证书',
    requirements: ['红十字会或 AHA 急救证书', '证书在有效期内', '通过实操考核'],
  },
  sign_language: {
    label: '手语翻译',
    icon: '🤟',
    description: '具备手语沟通能力',
    requirements: ['手语等级证书', '通过手语面试', '完成无障碍沟通培训'],
  },
  guide_dog_handler: {
    label: '导盲犬训练',
    icon: '🦮',
    description: '具备导盲犬配合出行经验',
    requirements: ['导盲犬训练师认证', '导盲犬配合经验', '通过实操考核'],
  },
};

// ---- 业务逻辑 ----

/**
 * 获取当前用户的认证记录
 * 若无记录返回 null
 */
export async function getMyCertification(userId: string): Promise<VolunteerCertification | null> {
  const result = await query(
    `SELECT * FROM volunteer_certifications WHERE user_id = $1`,
    [userId],
  );

  if (result.rows.length === 0) return null;

  return formatCert(result.rows[0]);
}

/**
 * 提交认证申请
 *
 * 每位用户只能有一条认证记录。
 * 若已有记录且状态为 rejected，允许重新提交（覆盖旧记录）。
 * 若状态为 pending 或 approved，禁止重复提交。
 */
export async function submitCertification(
  userId: string,
  input: CreateCertInput,
): Promise<VolunteerCertification> {
  if (!input.real_name?.trim()) {
    throw new AppError('真实姓名不能为空', 400);
  }

  if (!CERT_TYPE_CONFIG[input.cert_type]) {
    throw new AppError('无效的认证类型', 400);
  }

  // 检查是否已有记录
  const existing = await getMyCertification(userId);

  if (existing) {
    if (existing.status === 'pending') {
      throw new AppError('您的认证申请正在审核中，请耐心等待', 409);
    }
    if (existing.status === 'approved') {
      throw new AppError('您已通过认证，无需重复申请', 409);
    }
    // rejected → 允许重新提交（删除旧记录）
    if (existing.status === 'rejected') {
      await query(
        `DELETE FROM volunteer_certifications WHERE user_id = $1`,
        [userId],
      );
    }
  }

  // 身份证号基本校验（若有）
  if (input.id_card_number) {
    const idPattern = /^\d{17}[\dXx]$/;
    if (!idPattern.test(input.id_card_number.trim())) {
      throw new AppError('身份证号码格式不正确', 400);
    }
  }

  const result = await query(
    `INSERT INTO volunteer_certifications (user_id, real_name, id_card_number, cert_type, training_completed, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING *`,
    [
      userId,
      input.real_name.trim(),
      input.id_card_number?.trim() || null,
      input.cert_type,
      input.training_completed || false,
    ],
  );

  return formatCert(result.rows[0]);
}

/**
 * 获取所有认证类型（供前端展示）
 */
export async function getCertTypes() {
  return Object.entries(CERT_TYPE_CONFIG).map(([value, config]) => ({
    value,
    ...config,
  }));
}

// ---- helpers ----

function formatCert(row: any): VolunteerCertification {
  return {
    id: row.id,
    user_id: row.user_id,
    real_name: row.real_name,
    id_card_number: row.id_card_number || null,
    id_card_photo: row.id_card_photo || null,
    cert_type: row.cert_type,
    cert_photo: row.cert_photo || null,
    training_completed: row.training_completed,
    status: row.status,
    reviewed_by: row.reviewed_by || null,
    reviewed_at:
      row.reviewed_at instanceof Date ? row.reviewed_at.toISOString() : row.reviewed_at,
    created_at:
      row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updated_at:
      row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}
