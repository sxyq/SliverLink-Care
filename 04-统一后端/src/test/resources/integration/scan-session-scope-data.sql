delete from sms_relay_device;
delete from scan_verification_session;
delete from audit_log;
delete from scale_record;
delete from medication;
delete from health_record;
delete from elder;

insert into elder (
  id, archive_no, name_enc, gender, age,
  emergency_contact_name_enc, emergency_phone_enc,
  backup_contact_name_enc, backup_phone_enc, relationship,
  abo_type, rh_type, allergy_enc, residence_enc, status
) values
('elder-001', 'A202604300001', '张某某', '男', 76, '张女士', '13812345678', '张先生', '13912345678', '女儿', 'A', '+', '青霉素过敏', '北京市东城区', 'ACTIVE'),
('elder-002', 'A202604300002', '李某某', '女', 81, '李女士', '13800000002', '李先生', '13900000002', '儿子', 'B', '+', '无', '北京市西城区', 'ACTIVE');

insert into health_record (
  id, elder_id, record_date, volunteer, height_cm, weight_kg, waist_cm, bmi,
  health_self_assessment, self_care_assessment, cognitive_screening, emotion_screening
) values
('health-001', 'elder-002', '2026-05-30', 'vol-a', 160.0, 60.0, 80.0, 23.4, '良好', '独立', '正常', '稳定');

insert into medication (id, elder_id, name_enc, dosage_enc, usage_text_enc, timing_enc, updated_at) values
('med-001', 'elder-002', '阿司匹林', '100mg', '口服', '早晨', '2026-05-30 10:00:00');

insert into scale_record (id, elder_id, scale_name, score, record_date, volunteer, payload_enc) values
('scale-001', 'elder-002', 'PHQ-9', 6, '2026-05-30', 'vol-a', '{"answers":[{"question":"睡眠情况","value":1},{"question":"情绪状态","value":2}]}');

insert into scan_verification_session (
  session_id, elder_id, target, verification_method, receiver_phone, message_body, message_prefix, status,
  expires_at, verified, verified_at, sender_phone_masked, visitor_name_enc, visitor_phone_enc, visitor_id_card_enc
) values
('scan-session-it-verified', 'elder-002', 'health', 'IDENTITY', '15800006543', '', 'IDENTITY', 'VERIFIED',
 '2099-12-31T23:59:59Z', true, '2099-12-31T23:00:00Z', '158****6543', '跨档案访客', '15800006543', '110101199001011237');

insert into sms_relay_device (device_id, receiver_phone, server_url, message_prefix, device_secret, status) values
('relay-android-01', '13800001111', 'https://api.silverlink.example.com', 'SL', 'secret-001', '离线');
