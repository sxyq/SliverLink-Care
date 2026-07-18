CREATE TABLE audit_log_export_task (
  id VARCHAR(64) PRIMARY KEY,
  created_by VARCHAR(128) NOT NULL,
  query_json TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,
  row_count BIGINT NOT NULL DEFAULT 0,
  file_name VARCHAR(255),
  error_message VARCHAR(512),
  created_at VARCHAR(64) NOT NULL,
  completed_at VARCHAR(64),
  expires_at VARCHAR(64) NOT NULL,
  INDEX idx_audit_export_creator_created (created_by, created_at),
  INDEX idx_audit_export_expiry (expires_at)
);
