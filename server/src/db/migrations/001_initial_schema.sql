-- ============================================================
-- 无障碍出行陪伴平台 — 初始数据库 Schema
--
-- Version: 001
-- Tables: 16 张（对照 PRD 第四章数据模型）
-- Requires: PostgreSQL 16 + PostGIS 3
-- ============================================================

-- 确保扩展已启用
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. users — 用户基础信息
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone         VARCHAR(20) UNIQUE NOT NULL,
  name          VARCHAR(100),
  avatar        TEXT,
  role          VARCHAR(20) NOT NULL DEFAULT 'user'
                CHECK (role IN ('user', 'volunteer', 'professional', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================
-- 2. disability_profiles — 残障画像
-- ============================================================
CREATE TABLE IF NOT EXISTS disability_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  disability_type VARCHAR(20) NOT NULL DEFAULT 'physical'
                  CHECK (disability_type IN ('physical', 'visual', 'hearing', 'cognitive')),
  assistive_device VARCHAR(50),
  nav_preference  VARCHAR(50) DEFAULT 'barrier_free'
                  CHECK (nav_preference IN ('avoid_overpass', 'prefer_ramp', 'flat_only', 'barrier_free')),
  font_preference VARCHAR(10) DEFAULT 'standard'
                  CHECK (font_preference IN ('standard', 'large', 'extra_large')),
  cognition_level VARCHAR(10) DEFAULT 'normal'
                  CHECK (cognition_level IN ('normal', 'mild', 'moderate')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_disability_profiles_user ON disability_profiles(user_id);
CREATE INDEX idx_disability_profiles_type ON disability_profiles(disability_type);

-- ============================================================
-- 3. emergency_contacts — 紧急联系人
-- ============================================================
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  phone           VARCHAR(20) NOT NULL,
  relation        VARCHAR(50),
  notify_method   VARCHAR(20) DEFAULT 'sms'
                  CHECK (notify_method IN ('sms', 'push', 'both')),
  is_primary      BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_emergency_contacts_user ON emergency_contacts(user_id);

-- ============================================================
-- 4. geo_fences — 电子围栏
-- ============================================================
CREATE TABLE IF NOT EXISTS geo_fences (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  center          GEOMETRY(Point, 4326) NOT NULL,
  radius_meters   INTEGER NOT NULL DEFAULT 500,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_geo_fences_user ON geo_fences(user_id);
CREATE INDEX idx_geo_fences_center ON geo_fences USING GIST(center);

-- ============================================================
-- 5. trips — 行程
-- ============================================================
CREATE TABLE IF NOT EXISTS trips (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_location  GEOMETRY(Point, 4326) NOT NULL,
  end_location    GEOMETRY(Point, 4326) NOT NULL,
  start_address   VARCHAR(255),
  end_address     VARCHAR(255),
  start_time      TIMESTAMPTZ,
  special_needs   TEXT[] DEFAULT '{}',
  companion_type  VARCHAR(20) NOT NULL DEFAULT 'volunteer'
                  CHECK (companion_type IN ('volunteer', 'professional')),
  budget_cents    INTEGER,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'matching', 'matched', 'in_progress', 'completed', 'cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trips_user ON trips(user_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_start ON trips USING GIST(start_location);
CREATE INDEX idx_trips_end ON trips USING GIST(end_location);

-- ============================================================
-- 6. routes — 路线规划记录
-- ============================================================
CREATE TABLE IF NOT EXISTS routes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id             UUID REFERENCES trips(id) ON DELETE SET NULL,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  route_geom          GEOMETRY(LineString, 4326),
  distance_meters     INTEGER,
  duration_seconds    INTEGER,
  accessibility_score INTEGER CHECK (accessibility_score >= 0 AND accessibility_score <= 100),
  features            TEXT[] DEFAULT '{}',
  obstacles           JSONB DEFAULT '[]',
  is_recommended      BOOLEAN DEFAULT false,
  amap_route_id       VARCHAR(100),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_routes_trip ON routes(trip_id);
CREATE INDEX idx_routes_user ON routes(user_id);
CREATE INDEX idx_routes_geom ON routes USING GIST(route_geom);

-- ============================================================
-- 7. matches — 行程匹配记录
-- ============================================================
CREATE TABLE IF NOT EXISTS matches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id         UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  companion_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_score     DECIMAL(5,2) NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  route_overlap   DECIMAL(5,2) CHECK (route_overlap >= 0 AND route_overlap <= 100),
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(trip_id, companion_id)
);

CREATE INDEX idx_matches_trip ON matches(trip_id);
CREATE INDEX idx_matches_companion ON matches(companion_id);
CREATE INDEX idx_matches_score ON matches(match_score DESC);

-- ============================================================
-- 8. companion_sessions — 陪行会话
-- ============================================================
CREATE TABLE IF NOT EXISTS companion_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id         UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  match_id        UUID REFERENCES matches(id) ON DELETE SET NULL,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  companion_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status          VARCHAR(20) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'paused', 'completed', 'emergency_ended')),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_companion_sessions_trip ON companion_sessions(trip_id);
CREATE INDEX idx_companion_sessions_user ON companion_sessions(user_id);
CREATE INDEX idx_companion_sessions_companion ON companion_sessions(companion_id);

-- ============================================================
-- 9. orders — 订单（专业陪护模式）
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_id         UUID REFERENCES trips(id) ON DELETE SET NULL,
  session_id      UUID REFERENCES companion_sessions(id) ON DELETE SET NULL,
  duration_hours  DECIMAL(4,1) NOT NULL,
  hourly_rate_cents INTEGER NOT NULL,
  total_cents     INTEGER NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'paid', 'in_progress', 'completed', 'refunded', 'cancelled')),
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_professional ON orders(professional_id);

-- ============================================================
-- 10. ratings — 评价
-- ============================================================
CREATE TABLE IF NOT EXISTS ratings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES companion_sessions(id) ON DELETE CASCADE,
  reviewer_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score           INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  tags            TEXT[] DEFAULT '{}',
  comment         TEXT,
  tip_cents       INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ratings_session ON ratings(session_id);
CREATE INDEX idx_ratings_reviewee ON ratings(reviewee_id);
CREATE INDEX idx_ratings_reviewer ON ratings(reviewer_id);

-- ============================================================
-- 11. facilities — 无障碍设施
-- ============================================================
CREATE TABLE IF NOT EXISTS facilities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(200) NOT NULL,
  facility_type   VARCHAR(30) NOT NULL
                  CHECK (facility_type IN ('accessible_toilet', 'parking', 'elevator', 'ramp', 'low_counter', 'braille_sign')),
  location        GEOMETRY(Point, 4326) NOT NULL,
  address         VARCHAR(255),
  floor           VARCHAR(20),
  door_width_cm   INTEGER,
  has_handrail    BOOLEAN DEFAULT false,
  description     TEXT,
  building_id     VARCHAR(100),
  source          VARCHAR(20) DEFAULT 'amap'
                  CHECK (source IN ('amap', 'user_report', 'official')),
  verified        BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_facilities_type ON facilities(facility_type);
CREATE INDEX idx_facilities_location ON facilities USING GIST(location);
CREATE INDEX idx_facilities_verified ON facilities(verified);

-- ============================================================
-- 12. facility_statuses — 设施实时状态
-- ============================================================
CREATE TABLE IF NOT EXISTS facility_statuses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id     UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  status          VARCHAR(20) NOT NULL DEFAULT 'normal'
                  CHECK (status IN ('normal', 'maintenance', 'out_of_service', 'crowded')),
  reported_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  note            TEXT,
  reported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until     TIMESTAMPTZ
);

CREATE INDEX idx_facility_statuses_facility ON facility_statuses(facility_id);
CREATE INDEX idx_facility_statuses_status ON facility_statuses(status);

-- ============================================================
-- 13. obstacle_reports — 障碍上报
-- ============================================================
CREATE TABLE IF NOT EXISTS obstacle_reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location        GEOMETRY(Point, 4326) NOT NULL,
  obstacle_type   VARCHAR(30) NOT NULL
                  CHECK (obstacle_type IN ('construction', 'parked_vehicle', 'broken_elevator', 'flooding', 'debris', 'other')),
  description     TEXT,
  photo_url       TEXT,
  severity        VARCHAR(10) DEFAULT 'medium'
                  CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status          VARCHAR(20) DEFAULT 'reported'
                  CHECK (status IN ('reported', 'verified', 'resolved', 'dismissed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_obstacle_reports_user ON obstacle_reports(user_id);
CREATE INDEX idx_obstacle_reports_location ON obstacle_reports USING GIST(location);
CREATE INDEX idx_obstacle_reports_status ON obstacle_reports(status);

-- ============================================================
-- 14. volunteer_certifications — 志愿者认证
-- ============================================================
CREATE TABLE IF NOT EXISTS volunteer_certifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  real_name       VARCHAR(100) NOT NULL,
  id_card_number  VARCHAR(18),
  id_card_photo   TEXT,
  cert_type       VARCHAR(30) NOT NULL DEFAULT 'basic'
                  CHECK (cert_type IN ('basic', 'professional', 'first_aid', 'sign_language', 'guide_dog_handler')),
  cert_photo      TEXT,
  training_completed BOOLEAN DEFAULT false,
  status          VARCHAR(20) DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_volunteer_certs_user ON volunteer_certifications(user_id);
CREATE INDEX idx_volunteer_certs_status ON volunteer_certifications(status);

-- ============================================================
-- 15. professional_certifications — 专业资质
-- ============================================================
CREATE TABLE IF NOT EXISTS professional_certifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cert_name       VARCHAR(100) NOT NULL,
  cert_number     VARCHAR(50),
  issuing_body    VARCHAR(100),
  issued_at       DATE,
  expires_at      DATE,
  cert_photo      TEXT,
  specialties     TEXT[] DEFAULT '{}',
  hourly_rate_cents INTEGER,
  status          VARCHAR(20) DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_professional_certs_user ON professional_certifications(user_id);
CREATE INDEX idx_professional_certs_status ON professional_certifications(status);

-- ============================================================
-- 16. messages — 消息
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id      UUID REFERENCES companion_sessions(id) ON DELETE SET NULL,
  message_type    VARCHAR(20) NOT NULL DEFAULT 'chat'
                  CHECK (message_type IN ('chat', 'trip', 'system', 'emergency')),
  content         TEXT NOT NULL,
  metadata        JSONB DEFAULT '{}',
  is_read         BOOLEAN DEFAULT false,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_messages_type ON messages(message_type);
CREATE INDEX idx_messages_unread ON messages(receiver_id, is_read) WHERE is_read = false;
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- ============================================================
-- 自动更新 updated_at 触发器
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 为有 updated_at 字段的表创建触发器
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at'
      AND table_schema = 'public'
      AND table_name NOT LIKE 'pg_%'
      AND table_name NOT LIKE 'sql_%'
  LOOP
    EXECUTE format(
      'CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      t, t
    );
  END LOOP;
END;
$$;
