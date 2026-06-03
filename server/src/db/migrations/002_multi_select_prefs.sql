-- ============================================================
-- 迁移 002：辅助设备 & 导航偏好改为多选
--
-- 将 assistive_device 和 nav_preference 从单选改为支持
-- 逗号分隔的多选值（如 "轮椅,盲杖"）
-- ============================================================

-- 1. 删除 nav_preference 的 CHECK 约束
ALTER TABLE disability_profiles
  DROP CONSTRAINT IF EXISTS disability_profiles_nav_preference_check;

-- 2. 扩充字段长度以容纳多选值
ALTER TABLE disability_profiles
  ALTER COLUMN assistive_device TYPE VARCHAR(200),
  ALTER COLUMN nav_preference TYPE VARCHAR(200);

-- 3. 更新默认值
ALTER TABLE disability_profiles
  ALTER COLUMN nav_preference SET DEFAULT 'barrier_free';
