/**
 * 无障碍出行陪伴平台 — 数据模型
 *
 * 每个接口对应数据库一张表。
 * 使用 snake_case 命名以匹配 PostgreSQL 列名。
 */

// ============================================================
// 枚举类型
// ============================================================

export type UserRole = 'user' | 'volunteer' | 'professional' | 'admin';

export type DisabilityType = 'physical' | 'visual' | 'hearing' | 'cognitive' | 'none';

export type NavPreference = 'avoid_overpass' | 'prefer_ramp' | 'flat_only' | 'barrier_free';

export type CognitionLevel = 'normal' | 'mild' | 'moderate';

export type NotifyMethod = 'sms' | 'push' | 'both';

export type TripStatus = 'pending' | 'matching' | 'matched' | 'in_progress' | 'completed' | 'cancelled';

export type CompanionType = 'volunteer' | 'professional';

export type MatchStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

export type SessionStatus = 'active' | 'paused' | 'completed' | 'emergency_ended';

export type OrderStatus = 'pending' | 'paid' | 'in_progress' | 'completed' | 'refunded' | 'cancelled';

export type FacilityType = 'accessible_toilet' | 'parking' | 'elevator' | 'ramp' | 'low_counter' | 'braille_sign';

export type FacilitySource = 'amap' | 'user_report' | 'official';

export type FacilityStatus = 'normal' | 'maintenance' | 'out_of_service' | 'crowded';

export type ObstacleType = 'construction' | 'parked_vehicle' | 'broken_elevator' | 'flooding' | 'debris' | 'other';

export type ObstacleSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ObstacleStatus = 'reported' | 'verified' | 'resolved' | 'dismissed';

export type CertStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export type MessageType = 'chat' | 'trip' | 'system' | 'emergency';

// ============================================================
// 数据表模型
// ============================================================

export type UserType = 'disabled' | 'non_disabled';

export interface User {
  id: string;
  phone: string;
  name: string | null;
  avatar: string | null;
  role: UserRole;
  user_type: UserType;
  gender: string | null;
  birth_year: number | null;
  city: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DisabilityProfile {
  id: string;
  user_id: string;
  disability_type: DisabilityType;
  assistive_device: string | null;
  nav_preference: NavPreference;
  cognition_level: CognitionLevel;
  created_at: Date;
  updated_at: Date;
}

export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  relation: string | null;
  notify_method: NotifyMethod;
  is_primary: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface GeoFence {
  id: string;
  user_id: string;
  name: string;
  center: unknown; // PostGIS Point geometry
  radius_meters: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Trip {
  id: string;
  user_id: string;
  start_location: unknown; // PostGIS Point geometry
  end_location: unknown; // PostGIS Point geometry
  start_address: string | null;
  end_address: string | null;
  start_time: Date | null;
  special_needs: string[];
  companion_type: CompanionType;
  budget_cents: number | null;
  status: TripStatus;
  created_at: Date;
  updated_at: Date;
}

export interface Route {
  id: string;
  trip_id: string | null;
  user_id: string;
  route_geom: unknown; // PostGIS LineString geometry
  distance_meters: number | null;
  duration_seconds: number | null;
  accessibility_score: number | null;
  features: string[];
  obstacles: unknown[]; // JSONB
  is_recommended: boolean;
  amap_route_id: string | null;
  created_at: Date;
}

export interface Match {
  id: string;
  trip_id: string;
  companion_id: string;
  match_score: number;
  route_overlap: number | null;
  status: MatchStatus;
  created_at: Date;
  updated_at: Date;
}

export interface CompanionSession {
  id: string;
  trip_id: string;
  match_id: string | null;
  user_id: string;
  companion_id: string;
  status: SessionStatus;
  started_at: Date;
  ended_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Order {
  id: string;
  user_id: string;
  professional_id: string;
  trip_id: string | null;
  session_id: string | null;
  duration_hours: number;
  hourly_rate_cents: number;
  total_cents: number;
  status: OrderStatus;
  paid_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Rating {
  id: string;
  session_id: string;
  reviewer_id: string;
  reviewee_id: string;
  score: number;
  tags: string[];
  comment: string | null;
  tip_cents: number;
  created_at: Date;
}

export interface Facility {
  id: string;
  name: string;
  facility_type: FacilityType;
  location: unknown; // PostGIS Point geometry
  address: string | null;
  floor: string | null;
  door_width_cm: number | null;
  has_handrail: boolean;
  description: string | null;
  building_id: string | null;
  source: FacilitySource;
  verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface FacilityStatusRecord {
  id: string;
  facility_id: string;
  status: FacilityStatus;
  reported_by: string | null;
  note: string | null;
  reported_at: Date;
  valid_until: Date | null;
}

export interface ObstacleReport {
  id: string;
  user_id: string;
  location: unknown; // PostGIS Point geometry
  obstacle_type: ObstacleType;
  description: string | null;
  photo_url: string | null;
  severity: ObstacleSeverity;
  status: ObstacleStatus;
  created_at: Date;
  updated_at: Date;
}

export interface VolunteerCertification {
  id: string;
  user_id: string;
  real_name: string;
  id_card_number: string | null;
  id_card_photo: string | null;
  cert_type: string;
  cert_photo: string | null;
  training_completed: boolean;
  status: CertStatus;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ProfessionalCertification {
  id: string;
  user_id: string;
  cert_name: string;
  cert_number: string | null;
  issuing_body: string | null;
  issued_at: Date | null;
  expires_at: Date | null;
  cert_photo: string | null;
  specialties: string[];
  hourly_rate_cents: number | null;
  status: CertStatus;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  session_id: string | null;
  message_type: MessageType;
  content: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  read_at: Date | null;
  created_at: Date;
}
