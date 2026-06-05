ALTER TABLE sms_relay_device
  MODIFY COLUMN device_secret VARCHAR(64) NOT NULL;

UPDATE sms_relay_device
SET device_secret = LOWER(SHA2(device_secret, 256))
WHERE device_secret IS NOT NULL
  AND device_secret <> ''
  AND device_secret NOT REGEXP '^[0-9a-f]{64}$';

ALTER TABLE scan_verification_session
  ADD COLUMN message_body_hash VARCHAR(64) NOT NULL DEFAULT '' AFTER message_body;

UPDATE scan_verification_session
SET message_body_hash = CASE
        WHEN message_body IS NULL OR message_body = '' THEN ''
        ELSE LOWER(SHA2(TRIM(REGEXP_REPLACE(message_body, '[[:space:]]+', ' ')), 256))
    END,
    message_body = CASE
        WHEN message_body IS NULL OR message_body = '' THEN ''
        WHEN CHAR_LENGTH(message_body) <= 8 THEN CONCAT(message_body, '***')
        ELSE CONCAT(LEFT(message_body, 8), '***')
    END;

UPDATE sms_relay_record
SET message_body = CASE
        WHEN message_body IS NULL OR message_body = '' THEN ''
        WHEN CHAR_LENGTH(message_body) <= 8 THEN CONCAT(message_body, '***')
        ELSE CONCAT(LEFT(message_body, 8), '***')
    END;
