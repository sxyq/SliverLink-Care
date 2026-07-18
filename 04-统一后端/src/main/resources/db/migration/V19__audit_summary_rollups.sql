CREATE TABLE audit_log_daily_rollup (
  stat_day DATE NOT NULL,
  role_key VARCHAR(64) NOT NULL,
  action_key VARCHAR(64) NOT NULL,
  result_key VARCHAR(16) NOT NULL,
  verification_key VARCHAR(32) NOT NULL,
  event_count BIGINT UNSIGNED NOT NULL,
  rebuilt_at DATETIME(6) NOT NULL,
  PRIMARY KEY (stat_day, role_key, action_key, result_key, verification_key),
  INDEX idx_audit_rollup_role_day (role_key, stat_day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_log_daily_ip_rollup (
  stat_day DATE NOT NULL,
  role_key VARCHAR(64) NOT NULL,
  action_key VARCHAR(64) NOT NULL,
  result_key VARCHAR(16) NOT NULL,
  verification_key VARCHAR(32) NOT NULL,
  hash_key_version INT UNSIGNED NOT NULL,
  ip_hmac BINARY(32) NOT NULL,
  rebuilt_at DATETIME(6) NOT NULL,
  PRIMARY KEY (
    stat_day, role_key, action_key, result_key, verification_key,
    hash_key_version, ip_hmac
  ),
  INDEX idx_audit_ip_rollup_role_day (role_key, stat_day, hash_key_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_log_rollup_day_state (
  stat_day DATE PRIMARY KEY,
  source_row_count BIGINT UNSIGNED NOT NULL,
  rollup_event_count BIGINT UNSIGNED NOT NULL,
  rollup_row_count INT UNSIGNED NOT NULL,
  ip_rollup_row_count INT UNSIGNED NOT NULL,
  ip_hash_key_version INT UNSIGNED NOT NULL,
  source_max_time VARCHAR(64),
  status VARCHAR(16) NOT NULL,
  error_message VARCHAR(512),
  rebuilt_at DATETIME(6) NOT NULL,
  INDEX idx_audit_rollup_state_status_day (status, stat_day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
