CREATE TABLE sms_relay_device (
  device_id VARCHAR(64) PRIMARY KEY,
  receiver_phone VARCHAR(32) NOT NULL,
  server_url VARCHAR(255) NOT NULL,
  message_prefix VARCHAR(32) NOT NULL,
  device_secret VARCHAR(128) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT '离线',
  last_heartbeat VARCHAR(64),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE sms_relay_record (
  id VARCHAR(64) PRIMARY KEY,
  device_id VARCHAR(64) NOT NULL,
  receiver_phone VARCHAR(32) NOT NULL,
  sender_phone VARCHAR(32) NOT NULL,
  message_body TEXT NOT NULL,
  received_at BIGINT NOT NULL,
  message_prefix VARCHAR(32),
  uploaded_at BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'UPLOADED',
  INDEX idx_sms_relay_record_device (device_id),
  INDEX idx_sms_relay_record_received_at (received_at)
);

CREATE TABLE scan_verification_session (
  session_id VARCHAR(64) PRIMARY KEY,
  elder_id VARCHAR(64),
  target VARCHAR(64),
  receiver_phone VARCHAR(32) NOT NULL,
  message_body VARCHAR(128) NOT NULL,
  message_prefix VARCHAR(32) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  expires_at VARCHAR(64) NOT NULL,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  verified_at VARCHAR(64),
  sender_phone_masked VARCHAR(32),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_scan_verification_status (status),
  INDEX idx_scan_verification_expires (expires_at)
);
