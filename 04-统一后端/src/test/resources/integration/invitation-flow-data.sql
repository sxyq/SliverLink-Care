insert into elder (
  id, archive_no, name_enc, gender, age,
  emergency_contact_name_enc, emergency_phone_enc,
  backup_contact_name_enc, backup_phone_enc, relationship,
  abo_type, allergy_enc, status
) values
('elder-001', 'A202604300001', '张某某', '男', 76, '张女士', '13812345678', '张先生', '13912345678', '女儿', 'A', '青霉素过敏', 'ACTIVE'),
('elder-002', 'A202604300002', '李某某', '女', 81, '李女士', '13800000002', '李先生', '13900000002', '儿子', 'B', '无', 'ACTIVE');

insert into invitation (id, code, elder_id, expires_at, max_uses, used_count, status, created_at) values
('invite-001', 'FAMILY001', 'elder-001', '2026-12-31 23:59:59', 2, 0, 'ACTIVE', '2026-05-24 08:30:00');
