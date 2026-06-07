-- 008_peer_matching
-- 同行者模式：残障用户之间基于路线重叠 + 残障类型互补的匹配

-- 1. trips 表新增同行者匹配开关
ALTER TABLE trips ADD COLUMN IF NOT EXISTS peer_matching BOOLEAN DEFAULT false;

-- 2. 新建 peer_matches 表
CREATE TABLE IF NOT EXISTS peer_matches (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_a_id           UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  trip_b_id           UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_a_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  route_overlap_pct   DECIMAL(5,2),
  complementarity_score INTEGER,
  status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(trip_a_id, trip_b_id)
);

CREATE INDEX IF NOT EXISTS idx_peer_matches_user_a ON peer_matches(user_a_id);
CREATE INDEX IF NOT EXISTS idx_peer_matches_user_b ON peer_matches(user_b_id);
CREATE INDEX IF NOT EXISTS idx_peer_matches_status ON peer_matches(status);

-- 触发器
CREATE OR REPLACE TRIGGER update_peer_matches_updated_at
  BEFORE UPDATE ON peer_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
