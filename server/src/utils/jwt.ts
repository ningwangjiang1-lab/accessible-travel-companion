import jwt from 'jsonwebtoken';
import {env} from '../config/env';

/**
 * JWT 工具模块
 *
 * 封装 token 生成与验证逻辑。
 * 使用 RS256 或 HS256 取决于环境配置。
 */

export interface JwtPayload {
  sub: string; // user_id (UUID)
  phone: string;
  role: string;
}

/**
 * 生成 Access Token
 */
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

/**
 * 验证并解码 Token
 * 验证失败时返回 null
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    return {
      sub: decoded.sub!,
      phone: decoded.phone!,
      role: decoded.role!,
    };
  } catch {
    return null;
  }
}

/**
 * 从 Authorization header 提取 Bearer token
 */
export function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}
