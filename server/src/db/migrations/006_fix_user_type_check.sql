-- 006_fix_user_type_check
-- 修复 user_type CHECK 约束，加入 non_disabled

-- 删除旧的 user_type 约束（如果有）
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_user_type_check;

-- 添加正确的 CHECK 约束
ALTER TABLE users
  ADD CONSTRAINT users_user_type_check
  CHECK (user_type IN ('disabled', 'non_disabled'));

-- 同时修复 disability_type CHECK（移除 elderly）
ALTER TABLE disability_profiles
  DROP CONSTRAINT IF EXISTS disability_profiles_disability_type_check;

ALTER TABLE disability_profiles
  ADD CONSTRAINT disability_profiles_disability_type_check
  CHECK (disability_type IN ('physical', 'visual', 'hearing', 'cognitive', 'none'));
