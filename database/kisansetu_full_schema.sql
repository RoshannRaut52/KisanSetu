-- KisanSetu PostgreSQL schema for Render PostgreSQL / pgAdmin4
-- Safe to run on a new database. Uses PostgreSQL 14+ features.
-- The prototype labels configured prices and DBT as reference/prototype states.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN CREATE TYPE app_role AS ENUM ('FARMER', 'OPERATOR', 'ADMIN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE centre_status AS ENUM ('ACTIVE', 'DELAYED', 'PAUSED', 'OFFLINE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE booking_status AS ENUM ('BOOKED', 'ARRIVED', 'PROCESSING', 'QC_PENDING', 'QC_PASSED', 'QC_REJECTED', 'WEIGHMENT_PENDING', 'WEIGHED', 'COMPLETED', 'CANCELLED', 'DELAYED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE procurement_stage AS ENUM ('GATE_ENTRY', 'QUALITY_CHECK', 'WEIGHMENT', 'PAYMENT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE qc_result AS ENUM ('PENDING', 'PASSED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE notification_channel AS ENUM ('PORTAL', 'SMS', 'WHATSAPP'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE notification_status AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'READ'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_status AS ENUM ('NOT_STARTED', 'DBT_PROCESSING_INITIATED', 'REFERENCE_CREATED', 'FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  role app_role NOT NULL DEFAULT 'FARMER',
  preferred_language VARCHAR(20) NOT NULL DEFAULT 'en',
  auth_provider VARCHAR(40) NOT NULL DEFAULT 'mock_otp',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_signed_in_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile VARCHAR(20) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_otp_mobile_created ON otp_challenges (mobile, created_at DESC);

CREATE TABLE IF NOT EXISTS farmer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  farmer_reference VARCHAR(80) NOT NULL UNIQUE,
  identification_reference VARCHAR(160),
  village VARCHAR(120),
  district VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS operator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  employee_reference VARCHAR(80) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS centres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL,
  address TEXT NOT NULL,
  region VARCHAR(120) NOT NULL,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
  status centre_status NOT NULL DEFAULT 'ACTIVE',
  operating_hours_label VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS operator_centres (
  operator_id UUID NOT NULL REFERENCES operator_profiles(id) ON DELETE CASCADE,
  centre_id UUID NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
  assigned_from DATE NOT NULL DEFAULT CURRENT_DATE,
  assigned_until DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (operator_id, centre_id),
  CHECK (assigned_until IS NULL OR assigned_until >= assigned_from)
);

CREATE TABLE IF NOT EXISTS centre_operating_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  opens_at TIME NOT NULL,
  closes_at TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (centre_id, weekday),
  CHECK (closes_at > opens_at)
);

CREATE TABLE IF NOT EXISTS centre_capacity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
  effective_from DATE NOT NULL,
  effective_until DATE,
  daily_farmer_capacity INTEGER NOT NULL CHECK (daily_farmer_capacity > 0),
  max_concurrent_processing INTEGER NOT NULL DEFAULT 1 CHECK (max_concurrent_processing > 0),
  buffer_minutes INTEGER NOT NULL DEFAULT 5 CHECK (buffer_minutes >= 0),
  UNIQUE (centre_id, effective_from),
  CHECK (effective_until IS NULL OR effective_until >= effective_from)
);

CREATE TABLE IF NOT EXISTS crops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL UNIQUE,
  unit VARCHAR(30) NOT NULL DEFAULT 'quintal',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS configured_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id UUID NOT NULL REFERENCES crops(id) ON DELETE RESTRICT,
  centre_id UUID REFERENCES centres(id) ON DELETE RESTRICT,
  region VARCHAR(120),
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  unit VARCHAR(30) NOT NULL DEFAULT 'per quintal',
  effective_from DATE NOT NULL,
  effective_until DATE,
  source_reference VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (effective_until IS NULL OR effective_until >= effective_from)
);
CREATE INDEX IF NOT EXISTS idx_prices_lookup ON configured_prices (crop_id, centre_id, effective_from DESC);

CREATE TABLE IF NOT EXISTS qc_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id UUID NOT NULL REFERENCES crops(id) ON DELETE RESTRICT,
  centre_id UUID REFERENCES centres(id) ON DELETE RESTRICT,
  moisture_limit NUMERIC(6,2) NOT NULL CHECK (moisture_limit >= 0),
  effective_from DATE NOT NULL,
  effective_until DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK (effective_until IS NULL OR effective_until >= effective_from)
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference VARCHAR(60) NOT NULL UNIQUE,
  farmer_id UUID NOT NULL REFERENCES farmer_profiles(id) ON DELETE RESTRICT,
  centre_id UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  crop_id UUID NOT NULL REFERENCES crops(id) ON DELETE RESTRICT,
  quantity_qtl NUMERIC(12,2) NOT NULL CHECK (quantity_qtl > 0 AND quantity_qtl <= 500),
  booking_date DATE NOT NULL,
  slot_start TIMESTAMPTZ NOT NULL,
  slot_end TIMESTAMPTZ NOT NULL,
  token_number VARCHAR(30) NOT NULL,
  predicted_processing_minutes INTEGER NOT NULL CHECK (predicted_processing_minutes > 0),
  model_version VARCHAR(80),
  fallback_used BOOLEAN NOT NULL DEFAULT FALSE,
  initial_eta TIMESTAMPTZ,
  current_eta TIMESTAMPTZ,
  status booking_status NOT NULL DEFAULT 'BOOKED',
  configured_price_snapshot NUMERIC(12,2) NOT NULL CHECK (configured_price_snapshot >= 0),
  price_source_snapshot VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (centre_id, booking_date, token_number),
  CHECK (slot_end > slot_start)
);
CREATE INDEX IF NOT EXISTS idx_bookings_farmer ON bookings (farmer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_queue ON bookings (centre_id, booking_date, status, slot_start);

CREATE TABLE IF NOT EXISTS slot_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  centre_id UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  reservation_date DATE NOT NULL,
  slot_start TIMESTAMPTZ NOT NULL,
  slot_end TIMESTAMPTZ NOT NULL,
  reserved_capacity NUMERIC(12,2) NOT NULL CHECK (reserved_capacity > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('HELD', 'CONFIRMED', 'RELEASED', 'EXPIRED')),
  expires_at TIMESTAMPTZ,
  CHECK (slot_end > slot_start)
);
CREATE INDEX IF NOT EXISTS idx_reservations_centre_time ON slot_reservations (centre_id, reservation_date, slot_start, slot_end);

CREATE TABLE IF NOT EXISTS queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  queue_position INTEGER NOT NULL CHECK (queue_position > 0),
  current_eta TIMESTAMPTZ,
  queue_status booking_status NOT NULL DEFAULT 'BOOKED',
  arrived_at TIMESTAMPTZ,
  processing_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  projection_version BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS procurement_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  current_stage procurement_stage NOT NULL DEFAULT 'GATE_ENTRY',
  operator_id UUID REFERENCES operator_profiles(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status booking_status NOT NULL DEFAULT 'BOOKED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qc_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procurement_id UUID NOT NULL REFERENCES procurement_records(id) ON DELETE CASCADE,
  moisture_reading NUMERIC(7,3) NOT NULL CHECK (moisture_reading >= 0),
  allowed_moisture_limit NUMERIC(7,3) NOT NULL CHECK (allowed_moisture_limit >= 0),
  result qc_result NOT NULL DEFAULT 'PENDING',
  rejection_reason TEXT,
  operator_id UUID REFERENCES operator_profiles(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS weighments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procurement_id UUID NOT NULL UNIQUE REFERENCES procurement_records(id) ON DELETE CASCADE,
  gross_weight_qtl NUMERIC(12,3) NOT NULL CHECK (gross_weight_qtl > 0),
  tare_weight_qtl NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (tare_weight_qtl >= 0),
  net_weight_qtl NUMERIC(12,3) GENERATED ALWAYS AS (gross_weight_qtl - tare_weight_qtl) STORED,
  operator_id UUID REFERENCES operator_profiles(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (gross_weight_qtl >= tare_weight_qtl)
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procurement_id UUID NOT NULL UNIQUE REFERENCES procurement_records(id) ON DELETE CASCADE,
  configured_price_snapshot NUMERIC(12,2) NOT NULL CHECK (configured_price_snapshot >= 0),
  net_weight_qtl NUMERIC(12,3) NOT NULL CHECK (net_weight_qtl >= 0),
  calculated_value NUMERIC(16,2) GENERATED ALWAYS AS (configured_price_snapshot * net_weight_qtl) STORED,
  reference_number VARCHAR(100),
  status payment_status NOT NULL DEFAULT 'NOT_STARTED',
  initiated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS queue_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  centre_id UUID REFERENCES centres(id) ON DELETE SET NULL,
  operator_id UUID REFERENCES operator_profiles(id) ON DELETE SET NULL,
  event_type VARCHAR(60) NOT NULL,
  reason TEXT,
  delay_minutes INTEGER CHECK (delay_minutes IS NULL OR delay_minutes BETWEEN 0 AND 180),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_queue_events_centre_time ON queue_events (centre_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID REFERENCES farmer_profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  event_type VARCHAR(60) NOT NULL,
  channel notification_channel NOT NULL,
  message TEXT NOT NULL,
  status notification_status NOT NULL DEFAULT 'QUEUED',
  provider_reference VARCHAR(160),
  error_details TEXT,
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_farmer_created ON notifications (farmer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  centre_id UUID REFERENCES centres(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id UUID,
  before_state JSONB,
  after_state JSONB,
  request_id VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS ml_model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(80) NOT NULL UNIQUE,
  algorithm VARCHAR(100) NOT NULL,
  dataset_label VARCHAR(160) NOT NULL,
  artifact_uri TEXT,
  trained_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS ml_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  model_version_id UUID REFERENCES ml_model_versions(id) ON DELETE SET NULL,
  feature_snapshot JSONB NOT NULL,
  predicted_minutes INTEGER NOT NULL CHECK (predicted_minutes > 0),
  fallback_used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_farmers_updated_at ON farmer_profiles;
CREATE TRIGGER trg_farmers_updated_at BEFORE UPDATE ON farmer_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_centres_updated_at ON centres;
CREATE TRIGGER trg_centres_updated_at BEFORE UPDATE ON centres FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_procurement_updated_at ON procurement_records;
CREATE TRIGGER trg_procurement_updated_at BEFORE UPDATE ON procurement_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -------------------- Demo / seed data --------------------
INSERT INTO centres (code, name, address, region, latitude, longitude, operating_hours_label, status)
VALUES
  ('NANDGAON-A', 'Nandgaon Procurement Centre', 'Main Road, Nandgaon', 'Nandgaon district', 20.5364, 74.5321, '08:00 – 18:00', 'ACTIVE'),
  ('GOKUL-B', 'Gokul Mandi Yard', 'Market Road, Gokul', 'Nandgaon district', 20.5631, 74.5841, '08:30 – 17:30', 'ACTIVE')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, updated_at = now();

INSERT INTO centre_operating_hours (centre_id, weekday, opens_at, closes_at)
SELECT id, weekday, opens_at::time, closes_at::time
FROM centres c
CROSS JOIN (VALUES
  (0, '08:00', '18:00'), (1, '08:00', '18:00'), (2, '08:00', '18:00'),
  (3, '08:00', '18:00'), (4, '08:00', '18:00'), (5, '08:00', '18:00'), (6, '08:00', '18:00')
) AS hours(weekday, opens_at, closes_at)
ON CONFLICT (centre_id, weekday) DO NOTHING;

INSERT INTO centre_capacity (centre_id, effective_from, daily_farmer_capacity, max_concurrent_processing, buffer_minutes)
SELECT id, CURRENT_DATE, CASE WHEN code = 'NANDGAON-A' THEN 28 ELSE 36 END, 1, 5
FROM centres
ON CONFLICT (centre_id, effective_from) DO UPDATE SET daily_farmer_capacity = EXCLUDED.daily_farmer_capacity;

INSERT INTO crops (code, name, unit)
VALUES ('PADDY', 'Paddy', 'quintal'), ('WHEAT', 'Wheat', 'quintal'), ('MAIZE', 'Maize', 'quintal')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO configured_prices (crop_id, centre_id, region, price, unit, effective_from, source_reference, status)
SELECT c.id, NULL, 'Nandgaon district', prices.price, 'per quintal', CURRENT_DATE, 'SIH prototype configured reference', 'ACTIVE'
FROM crops c
JOIN (VALUES ('PADDY', 2320.00::numeric), ('WHEAT', 2275.00::numeric), ('MAIZE', 2090.00::numeric)) AS prices(code, price) ON prices.code = c.code
WHERE NOT EXISTS (
  SELECT 1 FROM configured_prices p WHERE p.crop_id = c.id AND p.region = 'Nandgaon district' AND p.effective_from = CURRENT_DATE
);

INSERT INTO qc_rules (crop_id, centre_id, moisture_limit, effective_from)
SELECT c.id, NULL, rules.limit_value, CURRENT_DATE
FROM crops c
JOIN (VALUES ('PADDY', 17.00::numeric), ('WHEAT', 14.00::numeric), ('MAIZE', 15.00::numeric)) AS rules(code, limit_value) ON rules.code = c.code
WHERE NOT EXISTS (
  SELECT 1 FROM qc_rules q WHERE q.crop_id = c.id AND q.centre_id IS NULL AND q.effective_from = CURRENT_DATE
);

INSERT INTO users (mobile, name, role, preferred_language, auth_provider)
VALUES
  ('9898989842', 'Ramesh Kumar', 'FARMER', 'en', 'mock_otp'),
  ('9000000001', 'Nandgaon Operator', 'OPERATOR', 'en', 'mock_otp'),
  ('9000000000', 'KisanSetu Admin', 'ADMIN', 'en', 'mock_otp')
ON CONFLICT (mobile) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, updated_at = now();

INSERT INTO farmer_profiles (user_id, farmer_reference, village, district)
SELECT id, 'FARMER-RK-001', 'Nandgaon', 'Nandgaon district' FROM users WHERE mobile = '9898989842'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO operator_profiles (user_id, employee_reference)
SELECT id, 'OP-NANDGAON-001' FROM users WHERE mobile = '9000000001'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO operator_centres (operator_id, centre_id)
SELECT op.id, c.id FROM operator_profiles op CROSS JOIN centres c
WHERE op.employee_reference = 'OP-NANDGAON-001' AND c.code = 'NANDGAON-A'
ON CONFLICT DO NOTHING;

INSERT INTO ml_model_versions (version, algorithm, dataset_label, trained_at, is_active)
VALUES ('prototype-rf-v0.3', 'Random Forest Regressor', 'Synthetic / Prototype Dataset', now(), TRUE)
ON CONFLICT (version) DO UPDATE SET is_active = TRUE;

-- Recommended verification queries in pgAdmin:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
-- SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE contype IN ('p','f') ORDER BY 1,2;
-- SELECT c.name, c.status, cap.daily_farmer_capacity FROM centres c JOIN centre_capacity cap ON cap.centre_id = c.id;
