import {FastifyInstance} from 'fastify';

/**
 * 健康检查路由
 *
 * GET /api/health → { status: "ok", timestamp, uptime }
 */
export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', {
    schema: {
      description: '健康检查端点',
      tags: ['System'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: {type: 'string'},
            timestamp: {type: 'string'},
            uptime: {type: 'number'},
          },
        },
      },
    },
    handler: async () => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
    },
  });
}
