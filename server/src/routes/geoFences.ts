import {FastifyInstance} from 'fastify';
import {authMiddleware} from '../middleware/auth';
import * as fenceService from '../services/geoFenceService';

/**
 * Geo Fences 路由（需认证）
 *
 * GET    /api/geo-fences            — 列表
 * POST   /api/geo-fences            — 创建
 * PUT    /api/geo-fences/:id        — 更新
 * DELETE /api/geo-fences/:id        — 删除
 * PATCH  /api/geo-fences/:id/toggle — 启用/禁用切换
 */

interface CreateBody {
  name: string;
  center: {type: 'Point'; coordinates: [number, number]};
  radius_meters?: number;
}

interface UpdateBody {
  name?: string;
  center?: {type: 'Point'; coordinates: [number, number]};
  radius_meters?: number;
  is_active?: boolean;
}

export async function geoFenceRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // ---- 列表 ----
  app.get('/geo-fences', {
    schema: {
      description: '获取当前用户的所有电子围栏',
      tags: ['Geo Fences'],
      security: [{bearerAuth: []}],
    },
    handler: async (request, reply) => {
      try {
        const fences = await fenceService.getFences(request.user!.sub);
        return reply.send(fences);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });

  // ---- 创建 ----
  app.post('/geo-fences', {
    schema: {
      description: '创建电子围栏（上限 5 个）',
      tags: ['Geo Fences'],
      security: [{bearerAuth: []}],
      body: {
        type: 'object',
        required: ['name', 'center'],
        properties: {
          name: {type: 'string', description: '围栏名称'},
          center: {
            type: 'object',
            description: 'GeoJSON Point 中心点',
            properties: {
              type: {type: 'string', enum: ['Point']},
              coordinates: {
                type: 'array',
                items: {type: 'number'},
                minItems: 2,
                maxItems: 2,
              },
            },
          },
          radius_meters: {type: 'integer', minimum: 100, maximum: 10000, description: '半径（米），默认 500'},
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const body = request.body as CreateBody;
        const fence = await fenceService.createFence(request.user!.sub, body);
        return reply.status(201).send(fence);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });

  // ---- 更新 ----
  app.put('/geo-fences/:id', {
    schema: {
      description: '编辑电子围栏',
      tags: ['Geo Fences'],
      security: [{bearerAuth: []}],
      params: {
        type: 'object',
        required: ['id'],
        properties: {id: {type: 'string', description: '围栏 ID'}},
      },
      body: {
        type: 'object',
        properties: {
          name: {type: 'string'},
          center: {
            type: 'object',
            properties: {
              type: {type: 'string', enum: ['Point']},
              coordinates: {type: 'array', items: {type: 'number'}},
            },
          },
          radius_meters: {type: 'integer', minimum: 100, maximum: 10000},
          is_active: {type: 'boolean'},
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const {id} = request.params as {id: string};
        const body = request.body as UpdateBody;
        const fence = await fenceService.updateFence(id, request.user!.sub, body);
        return reply.send(fence);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });

  // ---- 删除 ----
  app.delete('/geo-fences/:id', {
    schema: {
      description: '删除电子围栏',
      tags: ['Geo Fences'],
      security: [{bearerAuth: []}],
      params: {
        type: 'object',
        required: ['id'],
        properties: {id: {type: 'string', description: '围栏 ID'}},
      },
    },
    handler: async (request, reply) => {
      try {
        const {id} = request.params as {id: string};
        await fenceService.deleteFence(id, request.user!.sub);
        return reply.status(204).send();
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });

  // ---- 切换启用/禁用 ----
  app.patch('/geo-fences/:id/toggle', {
    schema: {
      description: '切换电子围栏启用/禁用状态',
      tags: ['Geo Fences'],
      security: [{bearerAuth: []}],
      params: {
        type: 'object',
        required: ['id'],
        properties: {id: {type: 'string', description: '围栏 ID'}},
      },
    },
    handler: async (request, reply) => {
      try {
        const {id} = request.params as {id: string};
        const fence = await fenceService.toggleFence(id, request.user!.sub);
        return reply.send(fence);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });
}
