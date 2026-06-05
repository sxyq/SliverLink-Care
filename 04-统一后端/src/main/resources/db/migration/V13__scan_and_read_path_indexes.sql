ALTER TABLE health_record
  ADD INDEX idx_health_elder_created_at (elder_id, created_at);

ALTER TABLE medication
  ADD INDEX idx_med_elder_updated_at (elder_id, updated_at);

ALTER TABLE scale_record
  ADD INDEX idx_scale_elder_created_at (elder_id, created_at);

ALTER TABLE audit_log
  ADD INDEX idx_audit_operator_action_result_time (operator, action, result, time);

ALTER TABLE scan_verification_session
  ADD INDEX idx_scan_verification_pending_lookup (status, receiver_phone, message_body, created_at),
  ADD INDEX idx_scan_verification_verified_lookup (session_id, status, verified, expires_at);
