-- ============================================================
-- 迁移 004：修复 font_preference 字段长度
--
-- 'extra_large' 是 11 个字符，但原来 VARCHAR(10) 装不下
-- ============================================================

ALTER TABLE disability_profiles
  ALTER COLUMN font_preference TYPE VARCHAR(20);
