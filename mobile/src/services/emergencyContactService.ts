import api from './api';

/**
 * Emergency Contact Service — 封装紧急联系人 API
 */

export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  relation: string | null;
  notify_method: 'sms' | 'push' | 'both';
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

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

/** 关系选项 */
export const RELATION_OPTIONS = [
  {value: '家人', label: '家人', icon: '👨‍👩‍👧‍👦'},
  {value: '朋友', label: '朋友', icon: '🤝'},
  {value: '同事', label: '同事', icon: '💼'},
  {value: '邻居', label: '邻居', icon: '🏠'},
  {value: '看护人', label: '看护人', icon: '🩺'},
  {value: '其他', label: '其他', icon: '📞'},
];

/** 通知方式选项 */
export const NOTIFY_OPTIONS: {value: EmergencyContact['notify_method']; label: string; icon: string}[] = [
  {value: 'sms', label: '短信通知', icon: '💬'},
  {value: 'push', label: 'App推送', icon: '📲'},
  {value: 'both', label: '短信+推送', icon: '🔔'},
];

/** 获取紧急联系人列表 */
export async function getContacts(): Promise<EmergencyContact[]> {
  const response = await api.get('/emergency-contacts');
  return response.data as EmergencyContact[];
}

/** 添加紧急联系人 */
export async function createContact(input: CreateContactInput): Promise<EmergencyContact> {
  const response = await api.post('/emergency-contacts', input);
  return response.data as EmergencyContact;
}

/** 更新紧急联系人 */
export async function updateContact(
  id: string,
  input: UpdateContactInput,
): Promise<EmergencyContact> {
  const response = await api.put(`/emergency-contacts/${id}`, input);
  return response.data as EmergencyContact;
}

/** 删除紧急联系人 */
export async function deleteContact(id: string): Promise<void> {
  await api.delete(`/emergency-contacts/${id}`);
}

/** 设为主联系人 */
export async function setPrimaryContact(id: string): Promise<EmergencyContact> {
  const response = await api.patch(`/emergency-contacts/${id}/primary`);
  return response.data as EmergencyContact;
}
