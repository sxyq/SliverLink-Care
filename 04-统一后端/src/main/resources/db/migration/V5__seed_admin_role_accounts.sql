ALTER TABLE app_user DROP INDEX account;
ALTER TABLE app_user ADD UNIQUE KEY uk_app_user_account_role (account, role);

INSERT INTO app_user (id, account, password_hash, name_enc, phone_enc, role, status) VALUES
('vol-admin-001', 'admin', 'admin', '医护测试账号', '13800009998', 'VOLUNTEER', 'ACTIVE'),
('family-admin-001', 'admin', 'admin', '家属测试账号', '13800009999', 'FAMILY', 'ACTIVE')
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  name_enc = VALUES(name_enc),
  phone_enc = VALUES(phone_enc),
  status = VALUES(status);

INSERT IGNORE INTO volunteer_elder_scope (id, volunteer_user_id, elder_id) VALUES
('vol-scope-admin-001', 'vol-admin-001', 'elder-001'),
('vol-scope-admin-002', 'vol-admin-001', 'elder-002');

INSERT IGNORE INTO family_binding (
  id, family_user_id, family_name_enc, family_phone_enc, relationship, elder_id, invitation_code, bound_at, status
) VALUES
('family-bind-admin-001', 'family-admin-001', '家属测试账号', '13800009999', '女儿', 'elder-001', 'INVITE001', '2026-05-23 00:00:00', 'ACTIVE');
