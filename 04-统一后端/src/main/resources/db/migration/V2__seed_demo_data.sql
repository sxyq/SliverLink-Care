INSERT INTO app_user (id, account, password_hash, name_enc, phone_enc, role, status) VALUES
('admin-001', 'admin', 'admin', '系统管理员', '13800000000', 'SYSTEM_ADMIN', 'ACTIVE'),
('vol-001', 'volunteer01', 'Volunteer@123456', '社区护理志愿者', '13800000001', 'VOLUNTEER', 'ACTIVE');

INSERT INTO elder (
  id, archive_no, name_enc, gender, age, emergency_contact_name_enc, emergency_phone_enc,
  backup_contact_name_enc, backup_phone_enc, relationship, abo_type, rh_type, allergy_enc, status
) VALUES
('elder-001', 'A202604300001', '张某某', '男', 76, '张女士', '13812345678', '张先生', '13912345678', '女儿', 'A', '阳性', '青霉素过敏', 'ACTIVE'),
('elder-002', 'A202604300002', '李某某', '女', 81, '李女士', '13822223333', '李先生', '13922223333', '女儿', 'O', '阳性', '无', 'ACTIVE');

INSERT INTO health_record (
  id, elder_id, record_date, volunteer, height_cm, weight_kg, waist_cm, bmi,
  health_self_assessment, self_care_assessment, cognitive_screening, emotion_screening
) VALUES
('health-001', 'elder-001', '2026-04-30', '社区护理志愿者', 168, 66, 82, 23.4, '基本满意', '完全自理', '粗筛阴性', '粗筛阴性'),
('health-002', 'elder-002', '2026-04-30', '社区护理志愿者', 158, 58, 78, 23.2, '满意', '部分自理', '粗筛阴性', '粗筛阴性');

INSERT INTO medication (id, elder_id, name_enc, dosage_enc, usage_text_enc, timing_enc) VALUES
('med-001', 'elder-001', '阿司匹林肠溶片', '100mg', '口服', '每日1次，早餐后'),
('med-002', 'elder-001', '硝苯地平缓释片', '30mg', '口服', '每日1次，早晨'),
('med-003', 'elder-001', '二甲双胍片', '500mg', '口服', '每日2次，早晚餐后');

INSERT INTO scale_record (id, elder_id, scale_name, score, record_date, volunteer, payload_enc) VALUES
('scale-001', 'elder-001', 'PHQ-9', 5, '2026-04-30', '社区护理志愿者', '{}'),
('scale-002', 'elder-001', 'GAD-7', 3, '2026-04-30', '社区护理志愿者', '{}'),
('scale-003', 'elder-001', 'UCLA', 28, '2026-04-30', '社区护理志愿者', '{}');

INSERT INTO volunteer_elder_scope (id, volunteer_user_id, elder_id) VALUES
('scope-001', 'vol-001', 'elder-001'),
('scope-002', 'vol-001', 'elder-002');

INSERT INTO invitation (id, code, elder_id, expires_at, max_uses, used_count, status, created_at) VALUES
('invite-001', 'INVITE001', 'elder-001', '2026-06-30 23:59:59', 1, 0, 'ACTIVE', '2026-05-22 00:00:00'),
('invite-002', 'INVITE_CODE', 'elder-001', '2026-06-30 23:59:59', 3, 0, 'ACTIVE', '2026-05-22 00:00:00');

INSERT INTO audit_log (id, time, operator, role, source_ip, target, action, result, fail_reason, request_id) VALUES
('audit-001', '2026-05-22T00:00:00Z', 'system', 'SYSTEM', '127.0.0.1', 'silverlink_care', 'SEED_DATA', 'SUCCESS', NULL, 'seed-001');
