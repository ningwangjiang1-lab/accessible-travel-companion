import {FastifyInstance} from 'fastify';
import {authMiddleware} from '../middleware/auth';
import * as ratingService from '../services/ratingService';

/**
 * Ratings 路由（需认证）
 *
 * POST /api/sessions/:sessionId/rate   — 提交评价
 * GET  /api/sessions/:sessionId/rating — 查询是否已评价
 */

interface RateBody {
  score: number;
  tags?: string[];
  comment?: string;
  tip_cents?: number;
}

export async function ratingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // ---- 提交评价 ----
  app.post('/sessions/:sessionId/rate', {
    schema: {
      description: '对已完成的陪行会话进行评价（1-5 星 + 标签 + 评论 + 打赏）',
      tags: ['Ratings'],
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
        required: ['score'],
        properties: {
          score: {type: 'integer', minimum: 1, maximum: 5, description: '评分 1-5 星'},
          tags: {type: 'array', items: {type: 'string'}, description: '评价标签'},
          comment: {type: 'string', description: '文字评论（可选）'},
          tip_cents: {type: 'integer', minimum: 0, maximum: 50000, description: '打赏金额（分），最高 ¥500'},
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const {sessionId} = request.params as {sessionId: string};
        const {score, tags, comment, tip_cents} = request.body as RateBody;

        const result = await ratingService.createRating(sessionId, request.user!.sub, {
          score,
          tags,
          comment,
          tip_cents,
        });

        return reply.status(201).send(result);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });

  // ---- 查询评价状态 ----
  app.get('/sessions/:sessionId/rating', {
    schema: {
      description: '查询是否已对某会话进行评价',
      tags: ['Ratings'],
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
        const rating = await ratingService.getRatingBySession(sessionId, request.user!.sub);

        if (!rating) {
          return reply.send({rated: false});
        }

        return reply.send({rated: true, rating});
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });
}
