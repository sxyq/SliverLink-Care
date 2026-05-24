ALTER TABLE qr_code
  ADD COLUMN relay_device_id VARCHAR(64) NULL AFTER archive_no,
  ADD INDEX idx_qr_code_relay_device (relay_device_id);

ALTER TABLE scan_verification_session
  ADD COLUMN relay_device_id VARCHAR(64) NULL AFTER target,
  ADD INDEX idx_scan_verification_relay_device (relay_device_id);
