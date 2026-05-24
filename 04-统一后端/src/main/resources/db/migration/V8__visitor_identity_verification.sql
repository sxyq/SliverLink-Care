ALTER TABLE scan_verification_session
  ADD COLUMN verification_method VARCHAR(32) NOT NULL DEFAULT 'SMS_RELAY' AFTER relay_device_id,
  ADD COLUMN visitor_name_enc TEXT NULL AFTER verification_method,
  ADD COLUMN visitor_phone_enc TEXT NULL AFTER visitor_name_enc,
  ADD COLUMN visitor_id_card_enc TEXT NULL AFTER visitor_phone_enc;

ALTER TABLE audit_log
  ADD COLUMN verification_method VARCHAR(32) NULL AFTER action,
  ADD COLUMN visitor_name_enc TEXT NULL AFTER verification_method,
  ADD COLUMN visitor_phone_enc TEXT NULL AFTER visitor_name_enc,
  ADD COLUMN visitor_id_card_enc TEXT NULL AFTER visitor_phone_enc;
