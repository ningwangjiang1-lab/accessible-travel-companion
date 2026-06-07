import {FastifyInstance} from 'fastify';
import {authMiddleware} from '../middleware/auth';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Upload 路由（需认证）
 *
 * POST /api/upload — 上传图片文件
 */

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, {recursive: true});
}

export async function uploadRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.post('/upload', {
    schema: {
      description: '上传图片文件，返回访问 URL',
      tags: ['Upload'],
      security: [{bearerAuth: []}],
      consumes: ['multipart/form-data'],
    },
    handler: async (request, reply) => {
      try {
        const data = await request.file();
        if (!data) {
          return reply.status(400).send({error: '请选择要上传的文件'});
        }

        // 验证文件类型
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(data.mimetype)) {
          return reply.status(400).send({error: '仅支持 JPG/PNG/GIF/WebP 格式'});
        }

        // 限制文件大小（5MB）
        const maxSize = 5 * 1024 * 1024;
        const chunks: Buffer[] = [];
        let totalSize = 0;
        for await (const chunk of data.file) {
          totalSize += chunk.length;
          if (totalSize > maxSize) {
            return reply.status(400).send({error: '文件大小不能超过 5MB'});
          }
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        // 生成唯一文件名
        const ext = data.filename.split('.').pop() || 'jpg';
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const filepath = path.join(UPLOAD_DIR, filename);

        fs.writeFileSync(filepath, buffer);

        // 返回访问 URL
        const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        const url = `/uploads/${filename}`;

        return reply.status(201).send({url, filename});
      } catch (err: any) {
        return reply.status(500).send({error: err.message || '上传失败'});
      }
    },
  });
}
