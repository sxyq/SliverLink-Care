-- Supports scheduled expiration and future keyset pagination without changing data.
CREATE INDEX idx_scan_session_status_expires
    ON scan_verification_session (status, expires_at);

CREATE INDEX idx_scale_created_id
    ON scale_record (created_at DESC, id DESC);
