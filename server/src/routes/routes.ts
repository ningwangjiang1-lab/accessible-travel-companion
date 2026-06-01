import {FastifyInstance} from 'fastify';
import {authMiddleware} from '../middleware/auth';
import * as routeService from '../services/routeService';
import * as navigationService from '../services/navigationService';

/**
 * Routes 路由（需认证）
 *
 * POST /api/routes/plan           — AI 路线规划
 * GET  /api/routes/:id            — 获取路线详情
 * GET  /api/routes/:id/navigate   — 获取路线导航数据（逐向指令+障碍提醒）
 */

export async function routePlanRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // ---- 路线规划 ----
  app.post('/routes/plan', {
    schema: {
      description: '根据用户残障画像进行 AI 无障碍路线规划',
      tags: ['Routes'],
      security: [{bearerAuth: []}],
      body: {
        type: 'object',
        required: ['destination'],
        properties: {
          destination: {type: 'string', description: '目的地地址'},
          origin: {type: 'string', description: '出发地（选填，默认"我的位置"）'},
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const routes = await routeService.planRoutes(
          request.user!.sub,
          request.body as routeService.PlanRoutesInput,
        );
        return reply.send(routes);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
          error: err.message,
        });
      }
    },
  });

  // ---- 路线详情 ----
  app.get('/routes/:id', {
    schema: {
      description: '获取单条路线详情',
      tags: ['Routes'],
      security: [{bearerAuth: []}],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {type: 'string', description: '路线 ID'},
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const {id} = request.params as {id: string};
        const route = await routeService.getRouteById(request.user!.sub, id);
        if (!route) {
          return reply.status(404).send({error: '路线不存在'});
        }
        return reply.send(route);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
          error: err.message,
        });
      }
    },
  });

  // ---- 路线导航数据 ----
  app.get('/routes/:id/navigate', {
    schema: {
      description: '获取路线导航数据（逐向导航指令 + 前方障碍警告）',
      tags: ['Routes'],
      security: [{bearerAuth: []}],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {type: 'string', description: '路线 ID'},
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const {id} = request.params as {id: string};
        const navData = await navigationService.getNavigationData(request.user!.sub, id);
        return reply.send(navData);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
          error: err.message,
        });
      }
    },
  });
}
