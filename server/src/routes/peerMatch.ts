import {FastifyInstance} from 'fastify';
import {authMiddleware} from '../middleware/auth';
import * as peerMatchService from '../services/peerMatchService';

/**
 * Peer Match 路由（需认证）
 *
 * POST   /api/trips/:id/peer-match     — 开启同行者匹配
 * GET    /api/trips/peer-candidates    — 获取同行者候选列表
 * POST   /api/peer-matches             — 创建同行邀请
 * POST   /api/peer-matches/:id/accept  — 接受同行
 * POST   /api/peer-matches/:id/reject  — 拒绝/跳过同行
 * GET    /api/peer-matches/active      — 获取活跃同行关系
 */

export async function peerMatchRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // ---- 开启同行者匹配 ----
  app.post('/trips/:id/peer-match', {
    schema: {
      description: '为某行程开启同行者匹配',
      tags: ['Peer Match'],
      security: [{bearerAuth: []}],
      params: {
        type: 'object',
        required: ['id'],
        properties: {id: {type: 'string'}},
      },
    },
    handler: async (request, reply) => {
      try {
        const {id} = request.params as {id: string};
        await peerMatchService.enablePeerMatching(request.user!.sub, id);
        return reply.send({success: true});
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });

  // ---- 获取同行候选 ----
  app.get('/trips/peer-candidates', {
    schema: {
      description: '获取当前用户的同行者候选列表（top 5）',
      tags: ['Peer Match'],
      security: [{bearerAuth: []}],
    },
    handler: async (request, reply) => {
      try {
        const candidates = await peerMatchService.getPeerCandidates(request.user!.sub);
        return reply.send({candidates});
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });

  // ---- 创建同行邀请 ----
  app.post('/peer-matches', {
    schema: {
      description: '向另一个行程发起同行邀请',
      tags: ['Peer Match'],
      security: [{bearerAuth: []}],
      body: {
        type: 'object',
        required: ['candidate_trip_id'],
        properties: {
          candidate_trip_id: {type: 'string', description: '目标行程 ID'},
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const {candidate_trip_id} = request.body as {candidate_trip_id: string};
        const match = await peerMatchService.createPeerMatch(request.user!.sub, candidate_trip_id);
        return reply.status(201).send(match);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });

  // ---- 接受同行 ----
  app.post('/peer-matches/:id/accept', {
    schema: {
      description: '接受同行匹配邀请',
      tags: ['Peer Match'],
      security: [{bearerAuth: []}],
      params: {
        type: 'object',
        required: ['id'],
        properties: {id: {type: 'string'}},
      },
    },
    handler: async (request, reply) => {
      try {
        const {id} = request.params as {id: string};
        const match = await peerMatchService.acceptPeerMatch(request.user!.sub, id);
        return reply.send(match);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });

  // ---- 拒绝同行 ----
  app.post('/peer-matches/:id/reject', {
    schema: {
      description: '拒绝或跳过同行匹配',
      tags: ['Peer Match'],
      security: [{bearerAuth: []}],
      params: {
        type: 'object',
        required: ['id'],
        properties: {id: {type: 'string'}},
      },
    },
    handler: async (request, reply) => {
      try {
        const {id} = request.params as {id: string};
        await peerMatchService.rejectPeerMatch(request.user!.sub, id);
        return reply.send({success: true});
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });

  // ---- 活跃同行 ----
  app.get('/peer-matches/active', {
    schema: {
      description: '获取当前用户的活跃同行关系',
      tags: ['Peer Match'],
      security: [{bearerAuth: []}],
    },
    handler: async (request, reply) => {
      try {
        const active = await peerMatchService.getActivePeerMatch(request.user!.sub);
        return reply.send({active: active || null});
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });
}
