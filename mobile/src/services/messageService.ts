import api from './api';

/**
 * Message Service — 封装消息 API 调用
 */

export interface PeerInfo {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
}

export interface Conversation {
  session_id: string;
  peer: PeerInfo;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  last_message_type: string | null;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  session_id: string;
  message_type: 'chat' | 'trip' | 'system' | 'emergency';
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  sender_name: string;
}

/**
 * 获取会话列表
 */
export async function getConversations(): Promise<Conversation[]> {
  const response = await api.get('/messages/conversations');
  return response.data as Conversation[];
}

/**
 * 获取会话内消息
 */
export async function getMessages(
  sessionId: string,
  limit: number = 50,
  offset: number = 0,
): Promise<ChatMessage[]> {
  const response = await api.get(`/messages/${sessionId}`, {
    params: {limit, offset},
  });
  return response.data as ChatMessage[];
}

/**
 * 发送消息
 */
export async function sendMessage(
  sessionId: string,
  content: string,
  messageType: 'chat' | 'emergency' = 'chat',
): Promise<ChatMessage> {
  const response = await api.post(`/messages/${sessionId}`, {
    content,
    message_type: messageType,
  });
  return response.data as ChatMessage;
}

/**
 * 标记已读
 */
export async function markAsRead(sessionId: string): Promise<{updated: number}> {
  const response = await api.post(`/messages/${sessionId}/read`);
  return response.data as {updated: number};
}
