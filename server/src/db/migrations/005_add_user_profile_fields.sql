-- 005_add_user_profile_fields
-- 为所有用户增加通用个人资料字段

-- 1. users 表增加性别、出生年份、所在城市
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  ADD COLUMN IF NOT EXISTS birth_year INTEGER,
  ADD COLUMN IF NOT EXISTS city VARCHAR(50);

COMMENT ON COLUMN users.gender IS '性别：male/female/other';
COMMENT ON COLUMN users.birth_year IS '出生年份';
COMMENT ON COLUMN users.city IS '所在城市/城区';
