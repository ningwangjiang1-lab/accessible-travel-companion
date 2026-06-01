import dotenv from 'dotenv';

// 加载 .env 文件（开发环境）
dotenv.config();

/**
 * 环境变量配置
 *
 * 所有环境相关配置集中管理，提供默认值用于本地开发。
 * 生产环境通过 Docker 环境变量注入。
 */
export const env = {
  /** 服务器端口 */
  PORT: parseInt(process.env.PORT || '3000', 10),

  /** 服务器 Host */
  HOST: process.env.HOST || '0.0.0.0',

  /** Node 环境 */
  NODE_ENV: process.env.NODE_ENV || 'development',

  /** PostgreSQL 连接 */
  DATABASE_URL:
    process.env.DATABASE_URL ||
    'postgresql://accessible:accessible_dev@localhost:5432/accessible_travel',

  /** Redis 连接 */
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  /** JWT 密钥 */
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',

  /** JWT 过期时间（秒） */
  JWT_EXPIRES_IN: parseInt(process.env.JWT_EXPIRES_IN || '604800', 10), // 默认 7 天

  /** 高德地图 API Key */
  AMAP_API_KEY: process.env.AMAP_API_KEY || '',

  /** 是否为生产环境 */
  get isProduction(): boolean {
    return this.NODE_ENV === 'production';
  },

  /** 是否为开发环境 */
  get isDevelopment(): boolean {
    return this.NODE_ENV === 'development';
  },
} as const;
