import {FastifyInstance} from 'fastify';
import {authMiddleware} from '../middleware/auth';
import * as sessionService from '../services/sessionService';

/**
 * Sessions 路由（需认证）
 *
 * GET   /api/sessions/active           — 获取当前活跃的陪行会话
 * GET   /api/sessions/:sessionId        — 获取单个会话详情
 * PATCH /api/sessions/:sessionId/status — 更新会话状态（暂停/恢复/结束/紧急结束）
 */

interface StatusBody {
  status: 'active' | 'paused' | 'completed' | 'emergency_ended';
}

export async function sessionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // ---- 获取当前活跃会话 ----
  app.get('/sessions/active', {
    schema: {
      description: '获取当前用户活跃的陪行会话（含陪行人信息、行程详情、实时进度）',
      tags: ['Sessions'],
      security: [{bearerAuth: []}],
    },
    handler: async (request, reply) => {
      try {
        const session = await sessionService.getActiveSession(request.user!.sub);
        if (!session) {
          return reply.status(404).send({error: '没有进行中的陪行会话'});
        }
        return reply.send(session);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });

  // ---- 获取会话详情 ----
  app.get('/sessions/:sessionId', {
    schema: {
      description: '获取单个陪行会话的详细信息',
      tags: ['Sessions'],
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
        const session = await sessionService.getSessionDetail(sessionId, request.user!.sub);
        return reply.send(session);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });

  // ---- 更新会话状态 ----
  app.patch('/sessions/:sessionId/status', {
    schema: {
      description: '更新陪行会话状态：pause（暂停）、resume（恢复）、complete（完成）、emergency_end（紧急结束）',
      tags: ['Sessions'],
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
        required: ['status'],
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'paused', 'completed', 'emergency_ended'],
            description: '目标状态：active=恢复, paused=暂停, completed=完成, emergency_ended=紧急结束',
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const {sessionId} = request.params as {sessionId: string};
        const {status} = request.body as StatusBody;

        if (!['active', 'paused', 'completed', 'emergency_ended'].includes(status)) {
          return reply.status(400).send({error: '无效的状态值'});
        }

        const session = await sessionService.updateSessionStatus(
          sessionId,
          request.user!.sub,
          status,
        );
        return reply.send(session);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });
}
