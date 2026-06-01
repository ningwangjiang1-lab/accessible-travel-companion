import {query} from '../db';
import {AppError} from './authService';

/**
 * Emergency Contact Service — 紧急联系人管理
 *
 * 用户可添加/编辑/删除紧急联系人，标记主联系人。
 * 联系人信息用于 SOS 紧急通知流程。
 */

export interface CreateContactInput {
  name: string;
  phone: string;
  relation?: string;
  notify_method?: 'sms' | 'push' | 'both';
  is_primary?: boolean;
}

export interface UpdateContactInput {
  name?: string;
  phone?: string;
  relation?: string;
  notify_method?: 'sms' | 'push' | 'both';
  is_primary?: boolean;
}

export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  relation: string | null;
  notify_method: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

/** 联系人上限 */
const MAX_CONTACTS = 10;

/**
 * 获取用户的所有紧急联系人
 */
export async function getContacts(userId: string): Promise<EmergencyContact[]> {
  const result = await query(
    `SELECT id, user_id, name, phone, relation, notify_method, is_primary, created_at, updated_at
     FROM emergency_contacts
     WHERE user_id = $1
     ORDER BY is_primary DESC, created_at ASC`,
    [userId],
  );

  return result.rows.map(formatContact);
}

/**
 * 根据 ID 获取单个联系人（带所有权验证）
 */
export async function getContactById(
  contactId: string,
  userId: string,
): Promise<EmergencyContact> {
  const result = await query(
    `SELECT id, user_id, name, phone, relation, notify_method, is_primary, created_at, updated_at
     FROM emergency_contacts
     WHERE id = $1 AND user_id = $2`,
    [contactId, userId],
  );

  if (result.rows.length === 0) {
    throw new AppError('联系人不存在', 404);
  }

  return formatContact(result.rows[0]);
}

/**
 * 创建紧急联系人
 *
 * 1. 验证必填字段
 * 2. 检查数量上限
 * 3. 若标记为 primary，取消其他 primary
 * 4. 写入
 */
export async function createContact(
  userId: string,
  input: CreateContactInput,
): Promise<EmergencyContact> {
  if (!input.name?.trim()) {
    throw new AppError('联系人姓名不能为空', 400);
  }

  if (!input.phone?.trim()) {
    throw new AppError('联系人电话不能为空', 400);
  }

  // 基本手机号格式校验
  const phonePattern = /^1[3-9]\d{9}$/;
  if (!phonePattern.test(input.phone.trim())) {
    throw new AppError('请输入正确的手机号码', 400);
  }

  // 检查数量上限
  const countResult = await query(
    `SELECT COUNT(*) as cnt FROM emergency_contacts WHERE user_id = $1`,
    [userId],
  );
  if (parseInt(countResult.rows[0].cnt, 10) >= MAX_CONTACTS) {
    throw new AppError(`最多添加 ${MAX_CONTACTS} 个紧急联系人`, 400);
  }

  // 若设为 primary，取消其他
  if (input.is_primary) {
    await query(
      `UPDATE emergency_contacts SET is_primary = false, updated_at = NOW()
       WHERE user_id = $1 AND is_primary = true`,
      [userId],
    );
  }

  const result = await query(
    `INSERT INTO emergency_contacts (user_id, name, phone, relation, notify_method, is_primary)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      userId,
      input.name.trim(),
      input.phone.trim(),
      input.relation?.trim() || null,
      input.notify_method || 'sms',
      input.is_primary || false,
    ],
  );

  return formatContact(result.rows[0]);
}

/**
 * 更新紧急联系人
 *
 * 1. 验证所有权
 * 2. 若设为 primary，取消其他 primary
 * 3. 更新
 */
export async function updateContact(
  contactId: string,
  userId: string,
  input: UpdateContactInput,
): Promise<EmergencyContact> {
  // 验证存在
  await getContactById(contactId, userId);

  // 手机号校验
  if (input.phone !== undefined) {
    const phonePattern = /^1[3-9]\d{9}$/;
    if (!phonePattern.test(input.phone.trim())) {
      throw new AppError('请输入正确的手机号码', 400);
    }
  }

  // 若设为 primary，取消其他
  if (input.is_primary) {
    await query(
      `UPDATE emergency_contacts SET is_primary = false, updated_at = NOW()
       WHERE user_id = $1 AND is_primary = true AND id != $2`,
      [userId, contactId],
    );
  }

  // 动态构建 UPDATE
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (input.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(input.name.trim());
  }
  if (input.phone !== undefined) {
    fields.push(`phone = $${idx++}`);
    values.push(input.phone.trim());
  }
  if (input.relation !== undefined) {
    fields.push(`relation = $${idx++}`);
    values.push(input.relation?.trim() || null);
  }
  if (input.notify_method !== undefined) {
    fields.push(`notify_method = $${idx++}`);
    values.push(input.notify_method);
  }
  if (input.is_primary !== undefined) {
    fields.push(`is_primary = $${idx++}`);
    values.push(input.is_primary);
  }

  if (fields.length === 0) {
    throw new AppError('没有需要更新的字段', 400);
  }

  fields.push(`updated_at = NOW()`);
  values.push(contactId);
  values.push(userId);

  const result = await query(
    `UPDATE emergency_contacts
     SET ${fields.join(', ')}
     WHERE id = $${idx++} AND user_id = $${idx}
     RETURNING *`,
    values,
  );

  return formatContact(result.rows[0]);
}

/**
 * 删除紧急联系人
 */
export async function deleteContact(
  contactId: string,
  userId: string,
): Promise<void> {
  await getContactById(contactId, userId);

  await query(
    `DELETE FROM emergency_contacts WHERE id = $1 AND user_id = $2`,
    [contactId, userId],
  );
}

/**
 * 设置主联系人
 */
export async function setPrimaryContact(
  contactId: string,
  userId: string,
): Promise<EmergencyContact> {
  await getContactById(contactId, userId);

  // 取消所有 primary
  await query(
    `UPDATE emergency_contacts SET is_primary = false, updated_at = NOW()
     WHERE user_id = $1`,
    [userId],
  );

  // 设置目标为 primary
  const result = await query(
    `UPDATE emergency_contacts
     SET is_primary = true, updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [contactId, userId],
  );

  return formatContact(result.rows[0]);
}

// ---- helpers ----

function formatContact(row: any): EmergencyContact {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    phone: row.phone,
    relation: row.relation || null,
    notify_method: row.notify_method,
    is_primary: row.is_primary,
    created_at:
      row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updated_at:
      row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}
