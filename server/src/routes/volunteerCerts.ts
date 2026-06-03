import {FastifyInstance} from 'fastify';
import {authMiddleware} from '../middleware/auth';
import * as certService from '../services/volunteerCertService';

/**
 * Volunteer Certifications 路由（需认证）
 *
 * GET  /api/volunteer-certs         — 获取我的认证状态
 * POST /api/volunteer-certs         — 提交认证申请
 * GET  /api/volunteer-certs/types   — 获取认证类型列表
 */

interface SubmitBody {
  real_name: string;
  id_card_number?: string;
  cert_type: certService.CertType;
  training_completed?: boolean;
}

export async function volunteerCertRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // ---- 获取我的认证状态 ----
  app.get('/volunteer-certs', {
    schema: {
      description: '获取当前用户的志愿者认证状态（null 表示尚未申请）',
      tags: ['Volunteer Certifications'],
      security: [{bearerAuth: []}],
    },
    handler: async (request, reply) => {
      try {
        const cert = await certService.getMyCertification(request.user!.sub);
        return reply.send(cert ? {has_cert: true, certification: cert} : {has_cert: false, certification: null});
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });

  // ---- 提交认证申请 ----
  app.post('/volunteer-certs', {
    schema: {
      description: '提交志愿者认证申请（每人限一条，rejected 可重新提交）',
      tags: ['Volunteer Certifications'],
      security: [{bearerAuth: []}],
      body: {
        type: 'object',
        required: ['real_name', 'id_card_number', 'cert_type'],
        properties: {
          real_name: {type: 'string', description: '真实姓名'},
          id_card_number: {type: 'string', description: '身份证号（18 位，必填）'},
          cert_type: {
            type: 'string',
            enum: ['basic'],
            description: '认证类型（初始仅基础志愿者，高级技能在通过后追加）',
          },
          training_completed: {type: 'boolean', description: '是否已完成培训'},
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const body = request.body as SubmitBody;
        const cert = await certService.submitCertification(request.user!.sub, body);
        return reply.status(201).send(cert);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });

  // ---- 获取认证类型列表 ----
  app.get('/volunteer-certs/types', {
    schema: {
      description: '获取所有可选的志愿者认证类型（含图标/描述/要求）',
      tags: ['Volunteer Certifications'],
      security: [{bearerAuth: []}],
    },
    handler: async (_request, reply) => {
      try {
        const types = await certService.getCertTypes();
        return reply.send({types});
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });
}
