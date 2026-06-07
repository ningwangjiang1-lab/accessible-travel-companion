import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import * as path from 'path';
import * as fs from 'fs';
import {env} from './config/env';
import {healthRoutes} from './routes/health';
import {authRoutes} from './routes/auth';
import {userRoutes} from './routes/users';
import {tripRoutes} from './routes/trips';
import {routePlanRoutes} from './routes/routes';
import {matchRoutes} from './routes/matches';
import {sessionRoutes} from './routes/sessions';
import {ratingRoutes} from './routes/ratings';
import {messageRoutes} from './routes/messages';
import {emergencyContactRoutes} from './routes/emergencyContacts';
import {professionalRoutes} from './routes/professionals';
import {geoFenceRoutes} from './routes/geoFences';
import {volunteerCertRoutes} from './routes/volunteerCerts';
import {facilityRoutes} from './routes/facilities';
import {peerMatchRoutes} from './routes/peerMatch';
import {uploadRoutes} from './routes/upload';

/**
 * 创建并配置 Fastify 应用实例
 *
 * 插件注册顺序：
 * 1. CORS — 跨域支持
 * 2. Swagger — API 文档自动生成
 * 3. 业务路由
 */
export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.isProduction ? 'info' : 'debug',
      transport:
        env.isDevelopment
          ? {target: 'pino-pretty', options: {colorize: true}}
          : undefined,
    },
  });

  // ---- 插件注册 ----

  // CORS：允许移动端跨域访问
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  // 文件上传支持
  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  });

  // 静态文件服务（上传的图片）
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, {recursive: true});
  }
  await app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: '/uploads/',
    decorateReply: false,
  });

  // Swagger API 文档
  await app.register(swagger, {
    openapi: {
      info: {
        title: '无障碍出行陪伴平台 API',
        description: 'Accessible Travel Companion Platform API Documentation',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${env.PORT}`,
          description: '开发环境',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: '输入 JWT Token（不含 Bearer 前缀）',
          },
        },
      },
    },
  });

  // Swagger UI（仅在非生产环境启用）
  if (!env.isProduction) {
    await app.register(swaggerUi, {
      routePrefix: '/docs',
    });
  }

  // ---- 业务路由 ----
  await app.register(healthRoutes, {prefix: '/api'});
  await app.register(authRoutes, {prefix: '/api'});
  await app.register(userRoutes, {prefix: '/api'});
  await app.register(tripRoutes, {prefix: '/api'});
  await app.register(routePlanRoutes, {prefix: '/api'});
  await app.register(matchRoutes, {prefix: '/api'});
  await app.register(sessionRoutes, {prefix: '/api'});
  await app.register(ratingRoutes, {prefix: '/api'});
  await app.register(messageRoutes, {prefix: '/api'});
  await app.register(emergencyContactRoutes, {prefix: '/api'});
  await app.register(professionalRoutes, {prefix: '/api'});
  await app.register(geoFenceRoutes, {prefix: '/api'});
  await app.register(volunteerCertRoutes, {prefix: '/api'});
  await app.register(facilityRoutes, {prefix: '/api'});
  await app.register(peerMatchRoutes, {prefix: '/api'});
  await app.register(uploadRoutes, {prefix: '/api'});

  return app;
}
