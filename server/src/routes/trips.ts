import {FastifyInstance} from 'fastify';
import {authMiddleware} from '../middleware/auth';
import * as tripService from '../services/tripService';

/**
 * Trips 路由（需认证）
 *
 * GET  /api/trips/active     — 获取当前用户的活跃行程
 * GET  /api/trips/available  — 获取可接单的行程列表（服务模式）
 * POST /api/trips            — 创建新行程
 * POST /api/trips/:id/accept — 志愿者接单
 * GET  /api/trips            — 获取用户行程列表
 */

export async function tripRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // ---- 获取活跃行程 ----
  app.get('/trips/active', {
    schema: {
      description: '获取当前用户的进行中行程（含陪行人信息）',
      tags: ['Trips'],
      security: [{bearerAuth: []}],
    },
    handler: async (request, reply) => {
      try {
        const trip = await tripService.getActiveTrip(request.user!.sub);
        return reply.send(trip);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
          error: err.message,
        });
      }
    },
  });

  // ---- 获取可接单的行程列表（服务模式） ----
  app.get('/trips/available', {
    schema: {
      description: '获取附近待接单的行程列表（供志愿者/专业陪护查看）',
      tags: ['Trips'],
      security: [{bearerAuth: []}],
    },
    handler: async (request, reply) => {
      try {
        const trips = await tripService.getAvailableTrips(request.user!.sub);
        return reply.send(trips);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });

  // ---- 取消行程 ----
  app.post('/trips/:id/cancel', {
    schema: {
      description: '取消行程（仅 pending/matching/matched 状态可取消）',
      tags: ['Trips'],
      security: [{bearerAuth: []}],
      params: {
        type: 'object',
        required: ['id'],
        properties: {id: {type: 'string', description: '行程 ID'}},
      },
    },
    handler: async (request, reply) => {
      try {
        const {id} = request.params as {id: string};
        await tripService.cancelTrip(request.user!.sub, id);
        return reply.send({success: true, message: '行程已取消'});
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });

  // ---- 志愿者接单 ----
  app.post('/trips/:id/accept', {
    schema: {
      description: '志愿者/专业陪护接单',
      tags: ['Trips'],
      security: [{bearerAuth: []}],
      params: {
        type: 'object',
        required: ['id'],
        properties: {id: {type: 'string', description: '行程 ID'}},
      },
    },
    handler: async (request, reply) => {
      try {
        const {id} = request.params as {id: string};
        const result = await tripService.acceptTrip(request.user!.sub, id);
        return reply.send(result);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });

  // ---- 获取我接的单（服务模式） ----
  app.get('/trips/accepted', {
    schema: {
      description: '获取当前用户作为陪护接单的行程列表',
      tags: ['Trips'],
      security: [{bearerAuth: []}],
    },
    handler: async (request, reply) => {
      try {
        const trips = await tripService.getMyAcceptedTrips(request.user!.sub);
        return reply.send(trips);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });

  // ---- 创建行程 ----
  app.post('/trips', {
    schema: {
      description: '发布新行程（发起陪行请求）',
      tags: ['Trips'],
      security: [{bearerAuth: []}],
      body: {
        type: 'object',
        required: ['start_address', 'end_address', 'companion_type'],
        properties: {
          start_address: {type: 'string', description: '出发地地址'},
          end_address: {type: 'string', description: '目的地地址'},
          companion_type: {
            type: 'string',
            enum: ['volunteer', 'professional'],
            description: '陪行类型：volunteer(志愿者免费) / professional(专业付费)',
          },
          special_needs: {
            type: 'array',
            items: {type: 'string'},
            description: '特殊需求标签',
          },
          budget_cents: {
            type: 'integer',
            description: '预算（分），专业陪护时使用',
          },
          start_time: {
            type: 'string',
            description: '预约出发时间（ISO 8601），留空表示立即出发',
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const trip = await tripService.createTrip(
          request.user!.sub,
          request.body as tripService.CreateTripInput,
        );
        return reply.status(201).send(trip);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
          error: err.message,
        });
      }
    },
  });

  // ---- 行程列表 ----
  app.get('/trips', {
    schema: {
      description: '获取当前用户的行程列表',
      tags: ['Trips'],
      security: [{bearerAuth: []}],
      querystring: {
        type: 'object',
        properties: {
          limit: {type: 'integer', description: '每页条数（默认 10）'},
          offset: {type: 'integer', description: '偏移量（默认 0）'},
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const {limit, offset} = request.query as {limit?: number; offset?: number};
        const trips = await tripService.getUserTrips(
          request.user!.sub,
          limit || 10,
          offset || 0,
        );
        return reply.send(trips);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
          error: err.message,
        });
      }
    },
  });
}
