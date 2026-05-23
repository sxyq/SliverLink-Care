CREATE TABLE app_user (
  id VARCHAR(64) PRIMARY KEY,
  account VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(128) NOT NULL,
  name_enc TEXT,
  phone_enc TEXT,
  role VARCHAR(32) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE elder (
  id VARCHAR(64) PRIMARY KEY,
  archive_no VARCHAR(64) NOT NULL UNIQUE,
  name_enc TEXT NOT NULL,
  gender VARCHAR(10),
  age INT,
  emergency_contact_name_enc TEXT,
  emergency_phone_enc TEXT,
  backup_contact_name_enc TEXT,
  backup_phone_enc TEXT,
  relationship VARCHAR(32),
  abo_type VARCHAR(10),
  rh_type VARCHAR(16),
  allergy_enc TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE health_record (
  id VARCHAR(64) PRIMARY KEY,
  elder_id VARCHAR(64) NOT NULL,
  record_date VARCHAR(32),
  volunteer VARCHAR(64),
  height_cm DECIMAL(8,2),
  weight_kg DECIMAL(8,2),
  waist_cm DECIMAL(8,2),
  bmi DECIMAL(8,2),
  health_self_assessment TEXT,
  self_care_assessment TEXT,
  cognitive_screening TEXT,
  emotion_screening TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_health_elder (elder_id)
);

CREATE TABLE medication (
  id VARCHAR(64) PRIMARY KEY,
  elder_id VARCHAR(64) NOT NULL,
  name_enc TEXT NOT NULL,
  dosage_enc TEXT,
  usage_text_enc TEXT,
  timing_enc TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_med_elder (elder_id)
);

CREATE TABLE scale_record (
  id VARCHAR(64) PRIMARY KEY,
  elder_id VARCHAR(64) NOT NULL,
  scale_name VARCHAR(32) NOT NULL,
  score INT NOT NULL DEFAULT 0,
  record_date VARCHAR(32),
  volunteer VARCHAR(64),
  payload_enc LONGTEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_scale_elder (elder_id)
);

CREATE TABLE volunteer_elder_scope (
  id VARCHAR(64) PRIMARY KEY,
  volunteer_user_id VARCHAR(64) NOT NULL,
  elder_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_vol_scope (volunteer_user_id, elder_id)
);

CREATE TABLE qr_code (
  id VARCHAR(64) PRIMARY KEY,
  qr_id VARCHAR(64) NOT NULL UNIQUE,
  elder_id VARCHAR(64) NOT NULL,
  archive_no VARCHAR(64),
  qr_token_hash VARCHAR(128) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ENABLED',
  key_id VARCHAR(64),
  created_at VARCHAR(64),
  disabled_at VARCHAR(64),
  INDEX idx_qr_elder (elder_id)
);

CREATE TABLE invitation (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  elder_id VARCHAR(64) NOT NULL,
  expires_at VARCHAR(32),
  max_uses INT NOT NULL DEFAULT 1,
  used_count INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at VARCHAR(32)
);

CREATE TABLE family_binding (
  id VARCHAR(64) PRIMARY KEY,
  family_user_id VARCHAR(64) NOT NULL,
  family_name_enc TEXT,
  family_phone_enc TEXT,
  relationship VARCHAR(32),
  elder_id VARCHAR(64) NOT NULL,
  invitation_code VARCHAR(32),
  bound_at VARCHAR(32),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  INDEX idx_family_binding_user (family_user_id),
  INDEX idx_family_binding_elder (elder_id)
);

CREATE TABLE sms_code (
  id VARCHAR(64) PRIMARY KEY,
  phone_hash VARCHAR(128) NOT NULL,
  code_hash VARCHAR(128) NOT NULL,
  scene VARCHAR(32) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  INDEX idx_sms_phone_scene (phone_hash, scene)
);

CREATE TABLE audit_log (
  id VARCHAR(64) PRIMARY KEY,
  time VARCHAR(64) NOT NULL,
  operator VARCHAR(128),
  role VARCHAR(64),
  source_ip VARCHAR(64),
  target VARCHAR(128),
  action VARCHAR(64),
  result VARCHAR(32),
  fail_reason TEXT,
  request_id VARCHAR(128),
  INDEX idx_audit_action (action),
  INDEX idx_audit_result (result)
);

CREATE TABLE nameplate_record (
  id VARCHAR(64) PRIMARY KEY,
  elder_id VARCHAR(64) NOT NULL,
  qr_code_id VARCHAR(64),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_nameplate_elder (elder_id)
);
