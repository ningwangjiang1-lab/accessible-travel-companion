import {FastifyInstance} from 'fastify';
import {authMiddleware} from '../middleware/auth';
import * as professionalService from '../services/professionalService';

/**
 * Professionals 路由（需认证）
 *
 * GET  /api/professionals           — 专业陪护人员列表（支持筛选/排序/分页）
 * GET  /api/professionals/filters   — 获取可用的专长筛选标签
 * GET  /api/professionals/:id       — 专业人员详情
 * POST /api/professional-certs      — 提交专业陪护认证申请
 */

export async function professionalRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // ---- 列表 ----
  app.get('/professionals', {
    schema: {
      description: '获取已认证专业陪护人员列表，支持按专长/价格/评分筛选',
      tags: ['Professionals'],
      security: [{bearerAuth: []}],
      querystring: {
        type: 'object',
        properties: {
          specialty: {type: 'string', description: '专长筛选（模糊匹配）'},
          max_rate_cents: {type: 'integer', description: '最高时薪（分）'},
          min_rating: {type: 'number', description: '最低评分（1-5）'},
          sort_by: {
            type: 'string',
            enum: ['rating', 'completed_trips', 'hourly_rate'],
            description: '排序字段',
          },
          limit: {type: 'integer', minimum: 1, maximum: 50, description: '每页数量'},
          offset: {type: 'integer', minimum: 0, description: '偏移量'},
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const query = request.query as Record<string, any>;
        const result = await professionalService.getProfessionals({
          specialty: query.specialty,
          max_rate_cents: query.max_rate_cents ? parseInt(query.max_rate_cents) : undefined,
          min_rating: query.min_rating ? parseFloat(query.min_rating) : undefined,
          sort_by: query.sort_by,
          limit: query.limit ? parseInt(query.limit) : undefined,
          offset: query.offset ? parseInt(query.offset) : undefined,
        });
        return reply.send(result);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });

  // ---- 筛选标签 ----
  app.get('/professionals/filters', {
    schema: {
      description: '获取可用于筛选的专长标签列表',
      tags: ['Professionals'],
      security: [{bearerAuth: []}],
    },
    handler: async (_request, reply) => {
      try {
        const specialties = await professionalService.getSpecialtyFilters();
        return reply.send({specialties});
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });

  // ---- 详情 ----
  app.get('/professionals/:id', {
    schema: {
      description: '获取专业陪护人员详细信息（含证书、评价、可用时段）',
      tags: ['Professionals'],
      security: [{bearerAuth: []}],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {type: 'string', description: '专业人员 ID'},
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const {id} = request.params as {id: string};
        const detail = await professionalService.getProfessionalById(id);
        return reply.send(detail);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });

  // ---- 提交专业陪护认证申请 ----
  app.post('/professional-certs', {
    schema: {
      description: '提交专业陪护资质认证申请',
      tags: ['Professionals'],
      security: [{bearerAuth: []}],
      body: {
        type: 'object',
        required: ['cert_name', 'issuing_body', 'specialties'],
        properties: {
          cert_name: {type: 'string', description: '资质证书名称'},
          cert_number: {type: 'string', description: '证书编号（选填）'},
          issuing_body: {type: 'string', description: '发证机构'},
          specialties: {
            type: 'array',
            items: {type: 'string'},
            description: '专业特长（数组）',
          },
          hourly_rate_cents: {type: 'integer', description: '时薪（分）'},
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const body = request.body as any;
        const {query} = await import('../db');
        // 开发环境自动审核通过
        const status = process.env.NODE_ENV === 'production' ? 'pending' : 'approved';
        const result = await query(
          `INSERT INTO professional_certifications (user_id, cert_name, cert_number, issuing_body, specialties, hourly_rate_cents, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            request.user!.sub,
            body.cert_name,
            body.cert_number || null,
            body.issuing_body,
            body.specialties,
            body.hourly_rate_cents || null,
            status,
          ],
        );
        // 开发环境自动升级用户角色为 professional
        if (status === 'approved') {
          await query(
            `UPDATE users SET role = 'professional' WHERE id = $1 AND role IN ('user', 'volunteer')`,
            [request.user!.sub],
          );
        }
        return reply.status(201).send(result.rows[0]);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });
}
