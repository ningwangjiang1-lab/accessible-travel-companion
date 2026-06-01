import {FastifyInstance} from 'fastify';
import {authMiddleware} from '../middleware/auth';
import * as facilityService from '../services/facilityService';

/**
 * Facilities 路由（需认证）
 *
 * GET /api/facilities         — 搜索无障碍设施
 * GET /api/facilities/types   — 设施类型列表
 * GET /api/facilities/:id     — 设施详情
 */

export async function facilityRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // ---- 搜索 ----
  app.get('/facilities', {
    schema: {
      description: '搜索无障碍设施，支持按类型/位置/距离筛选',
      tags: ['Facilities'],
      security: [{bearerAuth: []}],
      querystring: {
        type: 'object',
        properties: {
          facility_type: {
            type: 'string',
            enum: ['accessible_toilet', 'parking', 'elevator', 'ramp', 'low_counter', 'braille_sign'],
            description: '设施类型',
          },
          lat: {type: 'number', description: '当前纬度'},
          lng: {type: 'number', description: '当前经度'},
          radius_meters: {type: 'integer', description: '搜索半径（米）'},
          limit: {type: 'integer', minimum: 1, maximum: 50},
          offset: {type: 'integer', minimum: 0},
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const q = request.query as Record<string, any>;
        const result = await facilityService.searchFacilities({
          facility_type: q.facility_type,
          lat: q.lat ? parseFloat(q.lat) : undefined,
          lng: q.lng ? parseFloat(q.lng) : undefined,
          radius_meters: q.radius_meters ? parseInt(q.radius_meters) : undefined,
          limit: q.limit ? parseInt(q.limit) : undefined,
          offset: q.offset ? parseInt(q.offset) : undefined,
        });
        return reply.send(result);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });

  // ---- 类型列表 ----
  app.get('/facilities/types', {
    schema: {
      description: '获取设施类型列表（含图标）',
      tags: ['Facilities'],
      security: [{bearerAuth: []}],
    },
    handler: async (_request, reply) => {
      try {
        const types = await facilityService.getFacilityTypes();
        return reply.send({types});
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });

  // ---- 详情 ----
  app.get('/facilities/:id', {
    schema: {
      description: '获取设施详细信息（含状态历史）',
      tags: ['Facilities'],
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
        const detail = await facilityService.getFacilityById(id);
        return reply.send(detail);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });
}
