import {FastifyInstance} from 'fastify';
import {authMiddleware} from '../middleware/auth';
import * as userService from '../services/userService';

/**
 * Users 路由（需认证）
 *
 * GET  /api/users/me          — 获取当前用户信息（含残障画像）
 * PUT  /api/users/me/profile  — 更新用户画像
 */

export async function userRoutes(app: FastifyInstance) {
  // 该路由组下所有端点均需 JWT 认证
  app.addHook('preHandler', authMiddleware);

  // ---- 获取当前用户 ----
  app.get('/users/me', {
    schema: {
      description: '获取当前登录用户信息（含残障画像）',
      tags: ['Users'],
      security: [{bearerAuth: []}],
    },
    handler: async (request, reply) => {
      try {
        const user = await userService.getUserById(request.user!.sub);
        return reply.send(user);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
          error: err.message,
        });
      }
    },
  });

  // ---- 获取用户评分 ----
  app.get('/users/me/rating', {
    schema: {
      description: '获取当前用户的平均评分（作为被评价方）',
      tags: ['Users'],
      security: [{bearerAuth: []}],
    },
    handler: async (request, reply) => {
      try {
        const rating = await userService.getUserRating(request.user!.sub);
        return reply.send(rating);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
          error: err.message,
        });
      }
    },
  });

  // ---- 更新用户画像 ----
  app.put('/users/me/profile', {
    schema: {
      description: '更新当前用户画像（姓名/残障类型/偏好等）',
      tags: ['Users'],
      security: [{bearerAuth: []}],
      body: {
        type: 'object',
        properties: {
          name: {type: 'string', description: '用户姓名'},
          user_type: {
            type: 'string',
            enum: ['disabled', 'non_disabled'],
          },
          disability_type: {
            type: 'string',
            enum: ['physical', 'visual', 'hearing', 'cognitive', 'none'],
          },
          assistive_device: {type: 'string', description: '辅助设备（逗号分隔多选）'},
          nav_preference: {
            type: 'string',
            description: '导航偏好（逗号分隔多选），如 barrier_free,prefer_ramp',
          },
          font_preference: {
            type: 'string',
            enum: ['standard', 'large', 'extra_large'],
          },
          avatar: {type: 'string', description: '头像 URL'},
          gender: {
            type: 'string',
            enum: ['male', 'female', 'other'],
            description: '性别',
          },
          birth_year: {
            type: 'integer',
            minimum: 1920,
            maximum: 2020,
            description: '出生年份',
          },
          city: {
            type: 'string',
            maxLength: 50,
            description: '所在城市/城区',
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const updated = await userService.updateProfile(
          request.user!.sub,
          request.body as userService.UpdateProfileInput,
        );
        return reply.send(updated);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
          error: err.message,
        });
      }
    },
  });
}
