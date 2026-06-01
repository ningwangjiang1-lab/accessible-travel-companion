import {FastifyRequest, FastifyReply} from 'fastify';
import {extractBearerToken, verifyToken, JwtPayload} from '../utils/jwt';

/**
 * 扩展 Fastify Request 类型，添加 user 属性
 */
declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

/**
 * JWT 认证中间件
 *
 * 从 Authorization header 提取 Bearer token，
 * 验证后将 user 信息挂载到 request.user。
 * 验证失败返回 401。
 *
 * 用法：
 * ```typescript
 * app.addHook('preHandler', authMiddleware);
 * // 或单路由
 * app.get('/protected', { preHandler: authMiddleware }, handler);
 * ```
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const token = extractBearerToken(request.headers.authorization);

  if (!token) {
    reply.code(401).send({
      error: 'Unauthorized',
      message: '缺少认证 Token',
    });
    return;
  }

  const payload = verifyToken(token);

  if (!payload) {
    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Token 无效或已过期',
    });
    return;
  }

  request.user = payload;
}

/**
 * 可选认证中间件
 *
 * 与 authMiddleware 类似，但不强制要求 Token。
 * 有 Token 时验证，无 Token 时继续执行（request.user 为 undefined）。
 */
export async function optionalAuth(
  request: FastifyRequest,
): Promise<void> {
  const token = extractBearerToken(request.headers.authorization);
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      request.user = payload;
    }
  }
}
