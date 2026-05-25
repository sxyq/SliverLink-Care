CREATE TABLE admin_review_request (
  id VARCHAR(64) PRIMARY KEY,
  type VARCHAR(64) NOT NULL,
  target_id VARCHAR(128),
  target_label VARCHAR(255),
  elder_id VARCHAR(64),
  qr_code_id VARCHAR(64),
  requester_account VARCHAR(128),
  requester_role VARCHAR(64),
  requester_note TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  created_at VARCHAR(64) NOT NULL,
  handled_at VARCHAR(64),
  handled_by VARCHAR(128),
  result_note TEXT,
  INDEX idx_review_status (status),
  INDEX idx_review_type_status (type, status),
  INDEX idx_review_qr_status (qr_code_id, status)
);
