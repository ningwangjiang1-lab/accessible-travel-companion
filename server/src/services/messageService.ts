import {query} from '../db';
import {AppError} from './authService';

/**
 * Message Service — 消息业务逻辑
 *
 * 管理消息会话列表与会话内消息收发：
 * - 获取用户所有会话列表（含最后一条消息预览 + 未读数）
 * - 获取会话内消息（分页）
 * - 发送消息
 * - 标记已读
 */

export interface Conversation {
  /** 会话 ID */
  session_id: string;
  /** 对方用户信息 */
  peer: {
    id: string;
    name: string;
    avatar: string | null;
    role: string;
  };
  /** 最后一条消息预览 */
  last_message: string | null;
  /** 最后一条消息时间 */
  last_message_at: string | null;
  /** 未读消息数 */
  unread_count: number;
  /** 消息类型 */
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
  /** 发送者姓名 */
  sender_name: string;
}

export interface SendMessageInput {
  content: string;
  message_type?: 'chat' | 'emergency';
}

/**
 * 获取用户的所有会话列表
 *
 * 基于 companion_sessions 表（用户参与过的所有会话），
 * 聚合每个会话的最后一条消息与未读数。
 */
export async function getConversations(userId: string): Promise<Conversation[]> {
  const result = await query(
    `WITH user_sessions AS (
      SELECT
        cs.id,
        cs.user_id,
        cs.companion_id,
        CASE
          WHEN cs.user_id = $1 THEN cs.companion_id
          ELSE cs.user_id
        END AS peer_id
      FROM companion_sessions cs
      WHERE cs.user_id = $1 OR cs.companion_id = $1
    ),
    last_msg AS (
      SELECT DISTINCT ON (session_id)
        session_id,
        content,
        message_type,
        created_at
      FROM messages
      WHERE session_id IN (SELECT id FROM user_sessions)
      ORDER BY session_id, created_at DESC
    ),
    unread AS (
      SELECT
        session_id,
        COUNT(*)::int AS cnt
      FROM messages
      WHERE session_id IN (SELECT id FROM user_sessions)
        AND sender_id != $1
        AND is_read = false
      GROUP BY session_id
    )
    SELECT
      us.id AS session_id,
      us.peer_id,
      u.name AS peer_name,
      u.avatar AS peer_avatar,
      u.role AS peer_role,
      lm.content AS last_message,
      lm.message_type AS last_message_type,
      lm.created_at AS last_message_at,
      COALESCE(ur.cnt, 0) AS unread_count
    FROM user_sessions us
    JOIN users u ON u.id = us.peer_id
    LEFT JOIN last_msg lm ON lm.session_id = us.id
    LEFT JOIN unread ur ON ur.session_id = us.id
    ORDER BY lm.created_at DESC NULLS LAST`,
    [userId],
  );

  return result.rows.map(row => ({
    session_id: row.session_id,
    peer: {
      id: row.peer_id,
      name: row.peer_name || '用户',
      avatar: row.peer_avatar || null,
      role: row.peer_role || 'volunteer',
    },
    last_message: row.last_message || null,
    last_message_type: row.last_message_type || null,
    last_message_at: row.last_message_at instanceof Date
      ? row.last_message_at.toISOString()
      : (row.last_message_at || null),
    unread_count: row.unread_count,
  }));
}

/**
 * 获取会话内的消息列表（分页）
 */
export async function getMessages(
  userId: string,
  sessionId: string,
  limit: number = 50,
  offset: number = 0,
): Promise<ChatMessage[]> {
  // 验证用户属于该会话
  const sessionResult = await query(
    `SELECT id FROM companion_sessions
     WHERE id = $1 AND (user_id = $2 OR companion_id = $2)`,
    [sessionId, userId],
  );

  if (sessionResult.rows.length === 0) {
    throw new AppError('会话不存在', 404);
  }

  const result = await query(
    `SELECT
      m.id,
      m.sender_id,
      m.receiver_id,
      m.session_id,
      m.message_type,
      m.content,
      m.is_read,
      m.read_at,
      m.created_at,
      u.name AS sender_name
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.session_id = $1
    ORDER BY m.created_at DESC
    LIMIT $2 OFFSET $3`,
    [sessionId, limit, offset],
  );

  // 反转顺序（前端展示从旧到新）
  return result.rows.reverse().map(formatMessage);
}

/**
 * 发送消息
 *
 * 接收方为会话中的另一方（非发送者）。
 * 自动生成部分系统模拟回复（模拟陪行人回复）。
 */
export async function sendMessage(
  userId: string,
  sessionId: string,
  input: SendMessageInput,
): Promise<ChatMessage> {
  if (!input.content || !input.content.trim()) {
    throw new AppError('消息内容不能为空', 400);
  }

  // 验证用户属于该会话
  const sessionResult = await query(
    `SELECT cs.id, cs.user_id, cs.companion_id, cs.status
     FROM companion_sessions cs
     WHERE cs.id = $1 AND (cs.user_id = $2 OR cs.companion_id = $2)`,
    [sessionId, userId],
  );

  if (sessionResult.rows.length === 0) {
    throw new AppError('会话不存在', 404);
  }

  const session = sessionResult.rows[0];

  // 确定接收方
  const receiverId =
    session.user_id === userId ? session.companion_id : session.user_id;

  // 插入消息
  const result = await query(
    `INSERT INTO messages (sender_id, receiver_id, session_id, message_type, content)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      userId,
      receiverId,
      sessionId,
      input.message_type || 'chat',
      input.content.trim(),
    ],
  );

  const msg = result.rows[0];

  // 补充发送者姓名
  const userResult = await query(
    `SELECT name FROM users WHERE id = $1`,
    [userId],
  );

  return formatMessage({
    ...msg,
    sender_name: userResult.rows[0]?.name || '用户',
  });
}

/**
 * 标记会话消息为已读
 */
export async function markAsRead(
  userId: string,
  sessionId: string,
): Promise<{updated: number}> {
  const result = await query(
    `UPDATE messages
     SET is_read = true, read_at = NOW()
     WHERE session_id = $1 AND receiver_id = $2 AND is_read = false`,
    [sessionId, userId],
  );

  return {updated: result.rowCount ?? 0};
}

// ---- 辅助函数 ----

function formatMessage(row: any): ChatMessage {
  return {
    id: row.id,
    sender_id: row.sender_id,
    receiver_id: row.receiver_id || null,
    session_id: row.session_id,
    message_type: row.message_type || 'chat',
    content: row.content,
    is_read: row.is_read ?? false,
    read_at: row.read_at instanceof Date ? row.read_at.toISOString() : (row.read_at || null),
    created_at: row.created_at instanceof Date
      ? row.created_at.toISOString()
      : row.created_at,
    sender_name: row.sender_name || '用户',
  };
}
