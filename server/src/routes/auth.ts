import {FastifyInstance} from 'fastify';
import * as authService from '../services/authService';

/**
 * Auth 路由
 *
 * POST /api/auth/send-code    — 发送短信验证码
 * POST /api/auth/register     — 手机号+验证码注册
 * POST /api/auth/login        — 手机号+验证码登录
 */

export async function authRoutes(app: FastifyInstance) {
  // ---- 发送验证码 ----
  app.post('/auth/send-code', {
    schema: {
      description: '发送短信验证码（开发环境固定 123456）',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['phone'],
        properties: {
          phone: {type: 'string', description: '手机号'},
        },
      },
    },
    handler: async (request, reply) => {
      const {phone} = request.body as {phone: string};

      try {
        const result = await authService.sendVerificationCode(phone);
        return reply.send({
          success: result.success,
          message: '验证码已发送',
        });
      } catch (err: any) {
        return reply.status(500).send({error: err.message});
      }
    },
  });

  // ---- 注册 ----
  app.post('/auth/register', {
    schema: {
      description: '用户注册（手机号+验证码，同时创建残障画像）',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['phone', 'code'],
        properties: {
          phone: {type: 'string', description: '手机号'},
          code: {type: 'string', description: '短信验证码'},
          name: {type: 'string', description: '姓名（选填）'},
          disability_type: {
            type: 'string',
            enum: ['physical', 'visual', 'hearing', 'cognitive'],
            description: '残障类型',
          },
          assistive_device: {type: 'string', description: '辅具使用'},
          nav_preference: {
            type: 'string',
            enum: ['avoid_overpass', 'prefer_ramp', 'flat_only', 'barrier_free'],
            description: '导航偏好',
          },
          font_preference: {
            type: 'string',
            enum: ['standard', 'large', 'extra_large'],
            description: '字体偏好',
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const result = await authService.register(request.body as authService.RegisterInput);
        return reply.status(201).send(result);
      } catch (err: any) {
        const statusCode = err.statusCode || 500;
        return reply.status(statusCode).send({
          error: err.name === 'AppError' ? err.message : '注册失败',
          message: err.message,
        });
      }
    },
  });

  // ---- 登录 ----
  app.post('/auth/login', {
    schema: {
      description: '用户登录（手机号+验证码）',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['phone', 'code'],
        properties: {
          phone: {type: 'string', description: '手机号'},
          code: {type: 'string', description: '短信验证码'},
        },
      },
    },
    handler: async (request, reply) => {
      const {phone, code} = request.body as {phone: string; code: string};

      try {
        const result = await authService.login(phone, code);
        return reply.send(result);
      } catch (err: any) {
        const statusCode = err.statusCode || 500;
        return reply.status(statusCode).send({
          error: err.name === 'AppError' ? err.message : '登录失败',
          message: err.message,
        });
      }
    },
  });
}
