import {FastifyInstance} from 'fastify';
import {authMiddleware} from '../middleware/auth';
import * as matchService from '../services/matchService';

/**
 * Matches 路由（需认证）
 *
 * GET   /api/trips/:tripId/matches     — 获取行程的匹配列表
 * POST  /api/matches/:matchId/accept   — 接受匹配
 * POST  /api/matches/:matchId/reject   — 拒绝匹配
 */

export async function matchRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // ---- 获取匹配列表 ----
  app.get('/trips/:tripId/matches', {
    schema: {
      description: '获取行程的陪行人匹配列表（含匹配分数、候选人信息）',
      tags: ['Matches'],
      security: [{bearerAuth: []}],
      params: {
        type: 'object',
        required: ['tripId'],
        properties: {
          tripId: {type: 'string', description: '行程 ID'},
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const {tripId} = request.params as {tripId: string};
        const result = await matchService.getMatchesForTrip(tripId, request.user!.sub);
        return reply.send(result);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
          error: err.message,
        });
      }
    },
  });

  // ---- 接受匹配 ----
  app.post('/matches/:matchId/accept', {
    schema: {
      description: '接受陪行人匹配，自动创建陪行会话',
      tags: ['Matches'],
      security: [{bearerAuth: []}],
      params: {
        type: 'object',
        required: ['matchId'],
        properties: {
          matchId: {type: 'string', description: '匹配记录 ID'},
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const {matchId} = request.params as {matchId: string};
        const result = await matchService.acceptMatch(matchId, request.user!.sub);
        return reply.send(result);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
          error: err.message,
        });
      }
    },
  });

  // ---- 拒绝匹配 ----
  app.post('/matches/:matchId/reject', {
    schema: {
      description: '拒绝陪行人匹配',
      tags: ['Matches'],
      security: [{bearerAuth: []}],
      params: {
        type: 'object',
        required: ['matchId'],
        properties: {
          matchId: {type: 'string', description: '匹配记录 ID'},
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const {matchId} = request.params as {matchId: string};
        const result = await matchService.rejectMatch(matchId, request.user!.sub);
        return reply.send(result);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
          error: err.message,
        });
      }
    },
  });
}
