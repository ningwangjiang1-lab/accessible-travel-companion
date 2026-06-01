-- ============================================================
-- 无障碍出行陪伴平台 — 数据库初始化脚本
--
-- 在 PostgreSQL 容器首次启动时自动执行。
-- 创建必要的扩展。
-- ============================================================

-- 启用 PostGIS 地理空间扩展
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- 启用 UUID 生成
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 输出确认信息
DO $$
BEGIN
  RAISE NOTICE 'Database initialized: PostGIS + uuid-ossp extensions enabled.';
END $$;
