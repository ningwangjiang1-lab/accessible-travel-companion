import {FastifyInstance} from 'fastify';
import {authMiddleware} from '../middleware/auth';
import * as messageService from '../services/messageService';

/**
 * Messages 路由（需认证）
 *
 * GET   /api/messages/conversations        — 获取会话列表
 * GET   /api/messages/:sessionId            — 获取会话内消息（分页）
 * POST  /api/messages/:sessionId            — 发送消息
 * POST  /api/messages/:sessionId/read       — 标记已读
 */

interface SendBody {
  content: string;
  message_type?: 'chat' | 'emergency';
}

export async function messageRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // ---- 获取会话列表 ----
  app.get('/messages/conversations', {
    schema: {
      description: '获取用户的所有消息会话列表（含最后一条消息预览和未读数）',
      tags: ['Messages'],
      security: [{bearerAuth: []}],
    },
    handler: async (request, reply) => {
      try {
        const conversations = await messageService.getConversations(request.user!.sub);
        return reply.send(conversations);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });

  // ---- 获取会话内消息 ----
  app.get('/messages/:sessionId', {
    schema: {
      description: '获取指定陪行会话内的聊天消息（按时间排序，分页）',
      tags: ['Messages'],
      security: [{bearerAuth: []}],
      params: {
        type: 'object',
        required: ['sessionId'],
        properties: {
          sessionId: {type: 'string', description: '会话 ID'},
        },
      },
      querystring: {
        type: 'object',
        properties: {
          limit: {type: 'integer', default: 50, description: '每页条数'},
          offset: {type: 'integer', default: 0, description: '偏移量'},
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const {sessionId} = request.params as {sessionId: string};
        const {limit = 50, offset = 0} = request.query as {limit?: number; offset?: number};

        const messages = await messageService.getMessages(
          request.user!.sub,
          sessionId,
          limit,
          offset,
        );
        return reply.send(messages);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });

  // ---- 发送消息 ----
  app.post('/messages/:sessionId', {
    schema: {
      description: '向陪行会话发送消息',
      tags: ['Messages'],
      security: [{bearerAuth: []}],
      params: {
        type: 'object',
        required: ['sessionId'],
        properties: {
          sessionId: {type: 'string', description: '会话 ID'},
        },
      },
      body: {
        type: 'object',
        required: ['content'],
        properties: {
          content: {type: 'string', description: '消息内容'},
          message_type: {type: 'string', enum: ['chat', 'emergency'], description: '消息类型'},
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const {sessionId} = request.params as {sessionId: string};
        const {content, message_type} = request.body as SendBody;

        const message = await messageService.sendMessage(request.user!.sub, sessionId, {
          content,
          message_type,
        });
        return reply.status(201).send(message);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });

  // ---- 标记已读 ----
  app.post('/messages/:sessionId/read', {
    schema: {
      description: '将指定会话内的未读消息标记为已读',
      tags: ['Messages'],
      security: [{bearerAuth: []}],
      params: {
        type: 'object',
        required: ['sessionId'],
        properties: {
          sessionId: {type: 'string', description: '会话 ID'},
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const {sessionId} = request.params as {sessionId: string};
        const result = await messageService.markAsRead(request.user!.sub, sessionId);
        return reply.send(result);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });
}
