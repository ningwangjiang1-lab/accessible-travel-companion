import {FastifyInstance} from 'fastify';
import {authMiddleware} from '../middleware/auth';
import * as contactService from '../services/emergencyContactService';

/**
 * Emergency Contacts 路由（需认证）
 *
 * GET    /api/emergency-contacts         — 列表
 * POST   /api/emergency-contacts         — 创建
 * PUT    /api/emergency-contacts/:id     — 更新
 * DELETE /api/emergency-contacts/:id     — 删除
 * PATCH  /api/emergency-contacts/:id/primary — 设为主联系人
 */

interface CreateBody {
  name: string;
  phone: string;
  relation?: string;
  notify_method?: 'sms' | 'push' | 'both';
  is_primary?: boolean;
}

interface UpdateBody {
  name?: string;
  phone?: string;
  relation?: string;
  notify_method?: 'sms' | 'push' | 'both';
  is_primary?: boolean;
}

export async function emergencyContactRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // ---- 列表 ----
  app.get('/emergency-contacts', {
    schema: {
      description: '获取当前用户的紧急联系人列表',
      tags: ['Emergency Contacts'],
      security: [{bearerAuth: []}],
    },
    handler: async (request, reply) => {
      try {
        const contacts = await contactService.getContacts(request.user!.sub);
        return reply.send(contacts);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });

  // ---- 创建 ----
  app.post('/emergency-contacts', {
    schema: {
      description: '添加紧急联系人（上限 10 人）',
      tags: ['Emergency Contacts'],
      security: [{bearerAuth: []}],
      body: {
        type: 'object',
        required: ['name', 'phone'],
        properties: {
          name: {type: 'string', description: '联系人姓名'},
          phone: {type: 'string', description: '11 位手机号'},
          relation: {type: 'string', description: '关系（家人/朋友/同事/邻居等）'},
          notify_method: {type: 'string', enum: ['sms', 'push', 'both'], description: '通知方式'},
          is_primary: {type: 'boolean', description: '是否设为主联系人'},
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const body = request.body as CreateBody;
        const contact = await contactService.createContact(request.user!.sub, body);
        return reply.status(201).send(contact);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });

  // ---- 更新 ----
  app.put('/emergency-contacts/:id', {
    schema: {
      description: '编辑紧急联系人',
      tags: ['Emergency Contacts'],
      security: [{bearerAuth: []}],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {type: 'string', description: '联系人 ID'},
        },
      },
      body: {
        type: 'object',
        properties: {
          name: {type: 'string'},
          phone: {type: 'string'},
          relation: {type: 'string'},
          notify_method: {type: 'string', enum: ['sms', 'push', 'both']},
          is_primary: {type: 'boolean'},
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const {id} = request.params as {id: string};
        const body = request.body as UpdateBody;
        const contact = await contactService.updateContact(id, request.user!.sub, body);
        return reply.send(contact);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });

  // ---- 删除 ----
  app.delete('/emergency-contacts/:id', {
    schema: {
      description: '删除紧急联系人',
      tags: ['Emergency Contacts'],
      security: [{bearerAuth: []}],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {type: 'string', description: '联系人 ID'},
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const {id} = request.params as {id: string};
        await contactService.deleteContact(id, request.user!.sub);
        return reply.status(204).send();
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });

  // ---- 设为主联系人 ----
  app.patch('/emergency-contacts/:id/primary', {
    schema: {
      description: '将联系人设为主联系人（同时取消其他主联系人）',
      tags: ['Emergency Contacts'],
      security: [{bearerAuth: []}],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {type: 'string', description: '联系人 ID'},
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const {id} = request.params as {id: string};
        const contact = await contactService.setPrimaryContact(id, request.user!.sub);
        return reply.send(contact);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({error: err.message});
      }
    },
  });
}
