-- ============================================================
-- 迁移 003：用户身份识别
--
-- 1. 添加 user_type 字段到 users 表
-- 2. 扩展 disability_type 以支持非残障用户
-- ============================================================

-- 1. users 表添加 user_type
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) NOT NULL DEFAULT 'disabled';

-- 2. 删除旧 disability_type CHECK 约束
ALTER TABLE disability_profiles
  DROP CONSTRAINT IF EXISTS disability_profiles_disability_type_check;

-- 3. 添加新 CHECK（包含 none）
ALTER TABLE disability_profiles
  ADD CONSTRAINT disability_profiles_disability_type_check
  CHECK (disability_type IN ('physical', 'visual', 'hearing', 'cognitive', 'none'));

-- 4. 添加 user_type CHECK 约束
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_user_type_check;
ALTER TABLE users
  ADD CONSTRAINT users_user_type_check
  CHECK (user_type IN ('disabled', 'non_disabled'));

-- 4. 更新默认值
ALTER TABLE disability_profiles
  ALTER COLUMN disability_type SET DEFAULT 'none';
