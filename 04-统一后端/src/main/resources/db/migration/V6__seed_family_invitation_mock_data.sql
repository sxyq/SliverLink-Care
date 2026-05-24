INSERT INTO app_user (id, account, password_hash, name_enc, phone_enc, role, status) VALUES
('family-seed-001', '13816660001', 'admin', '赵美琴', '13816660001', 'FAMILY', 'ACTIVE'),
('family-seed-002', '13816660002', 'admin', '郭建华', '13816660002', 'FAMILY', 'ACTIVE'),
('family-seed-003', '13816660003', 'admin', '周桂芬', '13816660003', 'FAMILY', 'ACTIVE'),
('family-seed-004', '13816660004', 'admin', '孙建平', '13816660004', 'FAMILY', 'ACTIVE'),
('family-seed-005', '13816660005', 'admin', '马会兰', '13816660005', 'FAMILY', 'ACTIVE')
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  name_enc = VALUES(name_enc),
  phone_enc = VALUES(phone_enc),
  status = VALUES(status);

INSERT INTO invitation (id, code, elder_id, expires_at, max_uses, used_count, status, created_at) VALUES
('invite-seed-001', 'FAMILY001', 'elder-001', '2026-07-31 23:59:59', 2, 0, 'ACTIVE', '2026-05-24 08:30:00'),
('invite-seed-002', 'FAMILY002', 'elder-001', '2026-07-15 23:59:59', 1, 0, 'ACTIVE', '2026-05-24 09:10:00'),
('invite-seed-003', 'FAMILY003', 'elder-002', '2026-08-01 23:59:59', 2, 0, 'ACTIVE', '2026-05-24 10:00:00'),
('invite-seed-004', 'FAMILY004', 'elder-002', '2026-05-10 23:59:59', 1, 0, 'ACTIVE', '2026-05-18 14:00:00'),
('invite-seed-005', 'FAMILY005', 'elder-002', '2026-07-20 23:59:59', 1, 0, 'DISABLED', '2026-05-24 10:30:00')
ON DUPLICATE KEY UPDATE
  elder_id = VALUES(elder_id),
  expires_at = VALUES(expires_at),
  max_uses = VALUES(max_uses),
  status = VALUES(status),
  created_at = VALUES(created_at);

INSERT IGNORE INTO family_binding (
  id, family_user_id, family_name_enc, family_phone_enc, relationship, elder_id, invitation_code, bound_at, status
) VALUES
('family-bind-seed-001', 'family-seed-001', '赵美琴', '13816660001', '女儿', 'elder-001', 'FAMILY001', '2026-05-24 11:00:00', 'ACTIVE'),
('family-bind-seed-002', 'family-seed-002', '郭建华', '13816660002', '儿子', 'elder-001', 'FAMILY001', '2026-05-24 11:10:00', 'ACTIVE'),
('family-bind-seed-003', 'family-seed-003', '周桂芬', '13816660003', '外孙女', 'elder-002', 'FAMILY003', '2026-05-24 11:20:00', 'ACTIVE'),
('family-bind-seed-004', 'family-seed-004', '孙建平', '13816660004', '侄子', 'elder-002', 'FAMILY005', '2026-05-24 11:25:00', 'DISABLED'),
('family-bind-seed-005', 'family-seed-005', '马会兰', '13816660005', '邻居', 'elder-001', 'INVITE001', '2026-05-24 11:30:00', 'ACTIVE');

UPDATE invitation i
SET used_count = (
  SELECT COUNT(*)
  FROM family_binding b
  WHERE b.invitation_code = i.code
    AND b.status = 'ACTIVE'
);
