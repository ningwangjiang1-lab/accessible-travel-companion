import {FastifyInstance} from 'fastify';
import {authMiddleware} from '../middleware/auth';
import * as tripService from '../services/tripService';

/**
 * Trips 路由（需认证）
 *
 * GET  /api/trips/active  — 获取当前用户的活跃行程
 * POST /api/trips          — 创建新行程
 * GET  /api/trips          — 获取用户行程列表
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
