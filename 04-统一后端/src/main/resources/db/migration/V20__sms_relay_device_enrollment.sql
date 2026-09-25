ALTER TABLE sms_relay_device
  ADD COLUMN device_name VARCHAR(100) NOT NULL DEFAULT '' AFTER device_id;

CREATE TABLE sms_relay_enrollment_request (
  request_id VARCHAR(64) PRIMARY KEY,
  device_name VARCHAR(100) NOT NULL,
  receiver_phone VARCHAR(32) NOT NULL,
  server_url VARCHAR(255) NOT NULL,
  message_prefix VARCHAR(32) NOT NULL,
  device_secret_digest VARCHAR(64),
  request_token_digest VARCHAR(64) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  device_id VARCHAR(64),
  review_reason VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  reviewed_at TIMESTAMP NULL,
  UNIQUE KEY uk_sms_relay_enrollment_device (device_id),
  INDEX idx_sms_relay_enrollment_status_created (status, created_at)
);
