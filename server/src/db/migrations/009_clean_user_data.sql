-- 009_clean_user_data
-- 清除所有用户数据，保留表结构和设施种子数据

-- 按外键依赖顺序删除
DELETE FROM ratings;
DELETE FROM messages;
DELETE FROM companion_sessions;
DELETE FROM peer_matches;
DELETE FROM matches;
DELETE FROM orders;
DELETE FROM volunteer_certifications;
DELETE FROM professional_certifications;
DELETE FROM facility_statuses;
DELETE FROM obstacle_reports;
DELETE FROM routes;
DELETE FROM trips;
DELETE FROM geo_fences;
DELETE FROM emergency_contacts;
DELETE FROM disability_profiles;
DELETE FROM users WHERE role != 'admin';
