delete from sms_relay_device;
delete from audit_log;
delete from invitation;
delete from elder;
delete from app_user;

insert into app_user (id, account, password_hash, name_enc, phone_enc, role, status) values
('admin-001', 'admin', 'admin', '系统管理员', '13800000000', 'SYSTEM_ADMIN', 'ACTIVE'),
('family-001', '13800000001', 'family-pass', '家属用户', '13800000001', 'FAMILY', 'ACTIVE');

insert into elder (
  id, archive_no, name_enc, gender, age,
  emergency_contact_name_enc, emergency_phone_enc,
  backup_contact_name_enc, backup_phone_enc, relationship,
  abo_type, allergy_enc, status
) values
('elder-001', 'A202604300001', '张某某', '男', 76, '张女士', '13812345678', '张先生', '13912345678', '女儿', 'A', '青霉素过敏', 'ACTIVE');

insert into invitation (id, code, elder_id, expires_at, max_uses, used_count, status, created_at) values
('invite-001', 'FAMILY001', 'elder-001', '2026-12-31 23:59:59', 2, 0, 'ACTIVE', '2026-05-24 08:30:00');

insert into sms_relay_device (device_id, receiver_phone, server_url, message_prefix, device_secret, status) values
('relay-android-01', '13800001111', 'https://api.silverlink.example.com', 'SL', 'secret-001', '离线');
