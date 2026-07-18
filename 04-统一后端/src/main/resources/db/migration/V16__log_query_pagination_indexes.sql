-- Query-only indexes for cursor pagination. Existing data is intentionally unchanged.
ALTER TABLE audit_log
  ADD INDEX idx_audit_time_id (time DESC, id DESC),
  ADD INDEX idx_audit_action_time_id (action, time DESC, id DESC),
  ADD INDEX idx_audit_operator_time_id (operator, time DESC, id DESC),
  ADD INDEX idx_audit_role_time_id (role, time DESC, id DESC),
  ADD INDEX idx_audit_verification_time_id (verification_method, time DESC, id DESC),
  ADD INDEX idx_audit_result_time_id (result, time DESC, id DESC);

ALTER TABLE sms_relay_record
  ADD INDEX idx_sms_record_uploaded_id (uploaded_at DESC, id DESC),
  ADD INDEX idx_sms_record_device_uploaded_id (device_id, uploaded_at DESC, id DESC),
  ADD INDEX idx_sms_record_status_uploaded_id (status, uploaded_at DESC, id DESC),
  ADD INDEX idx_sms_record_sender_uploaded_id (sender_phone, uploaded_at DESC, id DESC),
  ADD INDEX idx_sms_record_receiver_uploaded_id (receiver_phone, uploaded_at DESC, id DESC);

ALTER TABLE scan_verification_session
  ADD INDEX idx_scan_session_created_id (created_at DESC, session_id DESC),
  ADD INDEX idx_scan_session_status_created_id (status, created_at DESC, session_id DESC),
  ADD INDEX idx_scan_session_device_created_id (relay_device_id, created_at DESC, session_id DESC),
  ADD INDEX idx_scan_session_elder_created_id (elder_id, created_at DESC, session_id DESC),
  ADD INDEX idx_scan_session_receiver_created_id (receiver_phone, created_at DESC, session_id DESC);
