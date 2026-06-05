package com.silverlink.care.infrastructure.persistence;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.silverlink.care.infrastructure.cache.SimpleTtlCache;
import com.silverlink.care.common.BizException;
import com.silverlink.care.infrastructure.crypto.AesGcmCryptoService;
import com.silverlink.care.infrastructure.crypto.HashService;
import jakarta.annotation.PostConstruct;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.*;

@Service
public class SilverLinkDataService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final long SCALE_ANSWERS_CACHE_TTL_MS = 30_000L;

    private final JdbcTemplate jdbc;
    private final AesGcmCryptoService crypto;
    private final HashService hashService;
    private final ObjectMapper objectMapper;
    private final SimpleTtlCache<String, List<Map<String, Object>>> scaleAnswersCache = new SimpleTtlCache<>();

    public SilverLinkDataService(JdbcTemplate jdbc, AesGcmCryptoService crypto, HashService hashService, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.crypto = crypto;
        this.hashService = hashService;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void encryptSeedData() {
        encryptColumn("app_user", "name_enc");
        encryptColumn("app_user", "phone_enc");
        encryptColumn("elder", "name_enc");
        encryptColumn("elder", "residence_enc");
        encryptColumn("elder", "emergency_contact_name_enc");
        encryptColumn("elder", "emergency_phone_enc");
        encryptColumn("elder", "backup_contact_name_enc");
        encryptColumn("elder", "backup_phone_enc");
        encryptColumn("elder", "allergy_enc");
        encryptColumn("medication", "name_enc");
        encryptColumn("medication", "dosage_enc");
        encryptColumn("medication", "usage_text_enc");
        encryptColumn("medication", "timing_enc");
        encryptColumn("scale_record", "payload_enc");
        encryptColumn("family_binding", "family_name_enc");
        encryptColumn("family_binding", "family_phone_enc");
        encryptColumn("audit_log", "visitor_name_enc");
        encryptColumn("audit_log", "visitor_phone_enc");
        encryptColumn("audit_log", "visitor_id_card_enc");
        encryptColumn("scan_verification_session", "visitor_name_enc");
        encryptColumn("scan_verification_session", "visitor_phone_enc");
        encryptColumn("scan_verification_session", "visitor_id_card_enc");
    }

    private void encryptColumn(String table, String column) {
        try {
            List<Map<String, Object>> rows = jdbc.queryForList("select id, " + column + " from " + table);
            for (Map<String, Object> row : rows) {
                String id = str(row.get("id"));
                String value = str(row.get(column));
                if (value.isBlank() || isEncrypted(value)) continue;
                jdbc.update("update " + table + " set " + column + "=? where id=?", enc(value), id);
            }
        } catch (Exception ignored) {
            // Database may not be initialized during build-time tests.
        }
    }

    public Optional<Map<String, Object>> login(String account, String password, String role) {
        List<Map<String, Object>> users = jdbc.queryForList(
                "select * from app_user where account=? and role=? and status='ACTIVE'", account, role);
        if (users.isEmpty()) return Optional.empty();
        Map<String, Object> user = users.get(0);
        if (!str(user.get("password_hash")).equals(password)) return Optional.empty();
        return Optional.of(user);
    }

    public Optional<Map<String, Object>> findUser(String account, String role) {
        List<Map<String, Object>> users = jdbc.queryForList(
                "select * from app_user where account=? and role=?",
                account, role
        );
        return users.isEmpty() ? Optional.empty() : Optional.of(users.get(0));
    }

    public Map<String, Object> dashboard() {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("elderCount", count("elder", "1=1"));
        map.put("activeElderCount", count("elder", "status='ACTIVE'"));
        map.put("volunteerCount", count("app_user", "role='VOLUNTEER' and status='ACTIVE'"));
        map.put("qrCodeCount", count("qr_code", "1=1"));
        map.put("familyCount", count("app_user", "role='FAMILY' and status='ACTIVE'"));
        map.put("auditCount", count("audit_log", "1=1"));
        return map;
    }

    private int count(String table, String where) {
        Integer value = jdbc.queryForObject("select count(*) from " + table + " where " + where, Integer.class);
        return value == null ? 0 : value;
    }

    public List<Map<String, Object>> eldersForAdmin() {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                select e.*, u.account as volunteer_account, u.name_enc as volunteer_name_enc
                from elder e
                left join volunteer_elder_scope s on e.id = s.elder_id
                left join app_user u on u.id = s.volunteer_user_id and u.role = 'VOLUNTEER'
                order by e.updated_at desc
                """);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            result.add(elderRow(row, false));
        }
        return result;
    }

    public Map<String, Object> elderDetail(String elderId, boolean masked) {
        Map<String, Object> row = one("select * from elder where id=?", elderId);
        return elderRow(row, masked);
    }

    private Map<String, Object> elderRow(Map<String, Object> row, boolean masked) {
        String phone = dec(row.get("emergency_phone_enc"));
        String name = dec(row.get("name_enc"));
        String residence = dec(row.get("residence_enc"));
        String volunteerAccount = str(row.get("volunteer_account"));
        String volunteerName = dec(row.get("volunteer_name_enc"));
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", str(row.get("id")));
        map.put("elderId", str(row.get("id")));
        map.put("archiveNo", str(row.get("archive_no")));
        map.put("name", masked ? maskName(name) : name);
        map.put("gender", str(row.get("gender")));
        map.put("age", intValue(row.get("age")));
        map.put("emergencyContactName", dec(row.get("emergency_contact_name_enc")));
        map.put("emergencyContact", dec(row.get("emergency_contact_name_enc")));
        map.put("emergencyPhoneMasked", maskPhone(phone));
        map.put("emergencyPhoneDial", phone);
        map.put("emergencyContactPhone", masked ? maskPhone(phone) : phone);
        map.put("phone", masked ? maskPhone(phone) : phone);
        map.put("backupContactName", dec(row.get("backup_contact_name_enc")));
        map.put("backupContactPhone", masked ? maskPhone(dec(row.get("backup_phone_enc"))) : dec(row.get("backup_phone_enc")));
        map.put("backupContactRelation", "");
        map.put("phoneMasked", maskPhone(phone));
        map.put("relationship", str(row.get("relationship")));
        map.put("residence", masked ? "" : residence);
        map.put("aboType", str(row.get("abo_type")));
        map.put("rhType", str(row.get("rh_type")));
        map.put("bloodType", str(row.get("abo_type")));
        map.put("allergySummary", dec(row.get("allergy_enc")));
        map.put("allergyHistory", dec(row.get("allergy_enc")));
        map.put("volunteerAccount", volunteerAccount);
        map.put("volunteerName", volunteerName);
        map.put("volunteer", formatVolunteerLabel(volunteerName, volunteerAccount));
        map.put("status", str(row.get("status")));
        return map;
    }

    public String createElder(Map<String, Object> body) {
        String id = "elder-" + System.currentTimeMillis();
        String archiveNo = value(body, "archiveNo", "A" + System.currentTimeMillis());
        jdbc.update("""
                insert into elder (id, archive_no, name_enc, gender, age, residence_enc, emergency_contact_name_enc, emergency_phone_enc,
                backup_contact_name_enc, backup_phone_enc, relationship, abo_type, rh_type, allergy_enc, status)
                values (?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'ACTIVE')
                """, id, archiveNo, enc(value(body, "name", "未命名")), value(body, "gender", ""),
                intValue(body.getOrDefault("age", 0)), enc(value(body, "residence", "")),
                enc(value(body, "emergencyContactName", value(body, "emergencyContact", ""))),
                enc(value(body, "emergencyPhone", value(body, "emergencyContactPhone", value(body, "phone", "")))),
                enc(value(body, "backupContactName", "")),
                enc(value(body, "backupPhone", "")),
                value(body, "relationship", value(body, "emergencyContactRelation", "")), value(body, "aboType", ""),
                value(body, "rhType", ""), enc(value(body, "allergySummary", value(body, "allergyHistory", ""))));
        return id;
    }

    public String createElderForVolunteer(String account, Map<String, Object> body) {
        String elderId = createElder(body);
        Map<String, Object> user = one("select * from app_user where account=? and role='VOLUNTEER'", account);
        jdbc.update("insert ignore into volunteer_elder_scope (id, volunteer_user_id, elder_id) values (?,?,?)",
                UUID.randomUUID().toString(), str(user.get("id")), elderId);
        return elderId;
    }

    public void updateElder(String id, Map<String, Object> body) {
        jdbc.update("""
                update elder set name_enc=?, gender=?, age=?, residence_enc=?, emergency_contact_name_enc=?, emergency_phone_enc=?,
                backup_contact_name_enc=?, backup_phone_enc=?, relationship=?, abo_type=?, rh_type=?, allergy_enc=?
                where id=?
                """, enc(value(body, "name", "")), value(body, "gender", ""), intValue(body.getOrDefault("age", 0)),
                enc(value(body, "residence", "")),
                enc(value(body, "emergencyContactName", value(body, "emergencyContact", ""))),
                enc(value(body, "emergencyPhone", value(body, "phone", ""))), enc(value(body, "backupContactName", "")),
                enc(value(body, "backupPhone", "")), value(body, "relationship", ""), value(body, "aboType", ""),
                value(body, "rhType", ""), enc(value(body, "allergySummary", value(body, "allergyHistory", ""))), id);
    }

    public void deleteElder(String id) {
        jdbc.update("update elder set status='DISABLED' where id=?", id);
    }

    public void setElderStatus(String id, String status) {
        String normalized = "ACTIVE".equalsIgnoreCase(status) ? "ACTIVE" : "DISABLED";
        jdbc.update("update elder set status=? where id=?", normalized, id);
    }

    public List<Map<String, Object>> volunteers() {
        List<Map<String, Object>> rows = jdbc.queryForList("select * from app_user where role='VOLUNTEER' order by created_at desc");
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Map<String, Object> map = new LinkedHashMap<>();
            String id = str(row.get("id"));
            List<Map<String, Object>> assignedElders = volunteerScopeSummaries(id);
            map.put("id", id);
            map.put("name", dec(row.get("name_enc")));
            map.put("phone", dec(row.get("phone_enc")));
            map.put("phoneMasked", maskPhone(dec(row.get("phone_enc"))));
            map.put("account", str(row.get("account")));
            map.put("role", "VOLUNTEER");
            map.put("status", str(row.get("status")));
            map.put("scopeCount", assignedElders.size());
            map.put("assignedElders", assignedElders);
            map.put("assignedElderIds", assignedElders.stream().map(item -> str(item.get("id"))).toList());
            result.add(map);
        }
        return result;
    }

    public String createVolunteer(Map<String, Object> body) {
        String id = "vol-" + System.currentTimeMillis();
        jdbc.update("insert into app_user (id, account, password_hash, name_enc, phone_enc, role, status) values (?,?,?,?,?,'VOLUNTEER','ACTIVE')",
                id, value(body, "account", "vol" + System.currentTimeMillis()),
                value(body, "password", "Volunteer@123456"), enc(value(body, "name", "志愿者")), enc(value(body, "phone", "")));
        Object scope = body.get("elderIds");
        if (scope instanceof List<?> list) {
            setVolunteerScope(id, list.stream().map(String::valueOf).toList());
        }
        return id;
    }

    public void updateVolunteer(String id, Map<String, Object> body) {
        Map<String, Object> existing = one("select * from app_user where id=? and role='VOLUNTEER'", id);
        String account = value(body, "account", str(existing.get("account")));
        String name = value(body, "name", dec(existing.get("name_enc")));
        String phone = body.containsKey("phone") ? str(body.get("phone")) : dec(existing.get("phone_enc"));
        String status = value(body, "status", str(existing.get("status")));
        String password = value(body, "password", "");

        if (password.isBlank()) {
            jdbc.update("update app_user set account=?, name_enc=?, phone_enc=?, status=? where id=? and role='VOLUNTEER'",
                    account, enc(name), enc(phone), status, id);
        } else {
            jdbc.update("update app_user set account=?, password_hash=?, name_enc=?, phone_enc=?, status=? where id=? and role='VOLUNTEER'",
                    account, password, enc(name), enc(phone), status, id);
        }
        Object scope = body.get("elderIds");
        if (scope instanceof List<?> list) {
            setVolunteerScope(id, list.stream().map(String::valueOf).toList());
        }
    }

    public void deleteVolunteer(String id) {
        jdbc.update("update app_user set status='DISABLED' where id=? and role='VOLUNTEER'", id);
    }

    public void setVolunteerScope(String volunteerId, List<String> elderIds) {
        jdbc.update("delete from volunteer_elder_scope where volunteer_user_id=?", volunteerId);
        for (String elderId : elderIds) {
            jdbc.update("delete from volunteer_elder_scope where elder_id=? and volunteer_user_id<>?", elderId, volunteerId);
            jdbc.update("insert ignore into volunteer_elder_scope (id, volunteer_user_id, elder_id) values (?,?,?)",
                    UUID.randomUUID().toString(), volunteerId, elderId);
        }
    }

    public List<Map<String, Object>> assignedElders(String account) {
        Map<String, Object> user = one("select * from app_user where account=? and role='VOLUNTEER'", account);
        List<Map<String, Object>> rows = jdbc.queryForList("""
                select e.* from elder e join volunteer_elder_scope s on e.id=s.elder_id
                where s.volunteer_user_id=? and e.status='ACTIVE' order by e.updated_at desc
                """, str(user.get("id")));
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Map<String, Object> map = elderRow(row, false);
            map.put("lastVisitDate", latestHealthDate(str(row.get("id"))));
            map.put("scopeHint", "仅显示本人负责老人");
            result.add(map);
        }
        return result;
    }

    public Map<String, Object> volunteerProfile(String account) {
        Map<String, Object> row = one("select * from app_user where account=? and role='VOLUNTEER' and status='ACTIVE'", account);
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("account", str(row.get("account")));
        map.put("name", dec(row.get("name_enc")));
        map.put("phone", dec(row.get("phone_enc")));
        return map;
    }

    public Map<String, Object> updateVolunteerProfile(String account, Map<String, Object> body) {
        Map<String, Object> existing = one("select * from app_user where account=? and role='VOLUNTEER' and status='ACTIVE'", account);
        String nextAccount = value(body, "account", str(existing.get("account")));
        String nextName = value(body, "name", dec(existing.get("name_enc")));
        String nextPhone = body.containsKey("phone") ? str(body.get("phone")) : dec(existing.get("phone_enc"));
        String currentPassword = value(body, "currentPassword", "");
        String nextPassword = value(body, "password", "");
        String id = str(existing.get("id"));

        if (nextAccount.isBlank()) {
            throw new BizException(400, "请输入登录账号");
        }
        if (nextName.isBlank()) {
            throw new BizException(400, "请输入姓名");
        }
        if (!nextAccount.equals(account) && !findUser(nextAccount, "VOLUNTEER").isEmpty()) {
            throw new BizException(400, "该登录账号已存在，请更换后重试");
        }

        if (nextPassword.isBlank()) {
            jdbc.update("update app_user set account=?, name_enc=?, phone_enc=? where id=? and role='VOLUNTEER'",
                    nextAccount, enc(nextName), enc(nextPhone), id);
        } else {
            if (currentPassword.isBlank()) {
                throw new BizException(400, "修改密码前请输入当前密码");
            }
            if (!str(existing.get("password_hash")).equals(currentPassword)) {
                throw new BizException(400, "当前密码不正确");
            }
            jdbc.update("update app_user set account=?, password_hash=?, name_enc=?, phone_enc=? where id=? and role='VOLUNTEER'",
                    nextAccount, nextPassword, enc(nextName), enc(nextPhone), id);
        }
        return volunteerProfile(nextAccount);
    }

    private String latestHealthDate(String elderId) {
        List<Map<String, Object>> rows = jdbc.queryForList("select record_date from health_record where elder_id=? order by created_at desc limit 1", elderId);
        return rows.isEmpty() ? "" : str(rows.get(0).get("record_date"));
    }

    private List<Map<String, Object>> volunteerScopeSummaries(String volunteerId) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                select e.id, e.archive_no, e.name_enc, e.age, e.status
                from volunteer_elder_scope s
                join elder e on e.id = s.elder_id
                where s.volunteer_user_id=?
                order by e.updated_at desc
                """, volunteerId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", str(row.get("id")));
            map.put("archiveNo", str(row.get("archive_no")));
            map.put("name", dec(row.get("name_enc")));
            map.put("age", intValue(row.get("age")));
            map.put("status", str(row.get("status")));
            result.add(map);
        }
        return result;
    }

    private String formatVolunteerLabel(String volunteerName, String volunteerAccount) {
        if (!volunteerName.isBlank() && !volunteerAccount.isBlank()) {
            return volunteerName + " / " + volunteerAccount;
        }
        if (!volunteerName.isBlank()) return volunteerName;
        return volunteerAccount;
    }

    public void requireVolunteerScope(String elderId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return;
        boolean volunteer = auth.getAuthorities().stream().anyMatch(a -> "ROLE_VOLUNTEER".equals(a.getAuthority()));
        if (!volunteer) return;
        Map<String, Object> user = one("select * from app_user where account=? and role='VOLUNTEER'", auth.getName());
        Integer count = jdbc.queryForObject("select count(*) from volunteer_elder_scope where volunteer_user_id=? and elder_id=?",
                Integer.class, str(user.get("id")), elderId);
        if (count == null || count == 0) {
            throw new BizException(403, "无权访问该老人档案");
        }
    }

    public Map<String, Object> scanBasic(String elderId) {
        return elderRow(one("select * from elder where id=? and status='ACTIVE'", elderId), true);
    }

    public Map<String, Object> health(String elderId) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                select record_date, volunteer, height_cm, weight_kg, waist_cm, bmi,
                       health_self_assessment, self_care_assessment, cognitive_screening, emotion_screening
                from health_record
                where elder_id=?
                order by created_at desc
                limit 1
                """, elderId);
        if (rows.isEmpty()) return Collections.emptyMap();
        Map<String, Object> row = rows.get(0);
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("date", str(row.get("record_date")));
        map.put("volunteer", str(row.get("volunteer")));
        map.put("heightCm", decimal(row.get("height_cm")));
        map.put("weightKg", decimal(row.get("weight_kg")));
        map.put("waistCm", decimal(row.get("waist_cm")));
        map.put("bmi", decimal(row.get("bmi")));
        map.put("healthSelfAssessment", str(row.get("health_self_assessment")));
        map.put("selfCareAssessment", str(row.get("self_care_assessment")));
        map.put("cognitiveScreening", str(row.get("cognitive_screening")));
        map.put("emotionScreening", str(row.get("emotion_screening")));
        return map;
    }

    public List<Map<String, String>> medications(String elderId) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                select id, name_enc, dosage_enc, usage_text_enc, timing_enc, updated_at
                from medication
                where elder_id=?
                order by updated_at desc
                """, elderId);
        List<Map<String, String>> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Map<String, String> map = new LinkedHashMap<>();
            map.put("id", str(row.get("id")));
            map.put("name", dec(row.get("name_enc")));
            map.put("dosage", dec(row.get("dosage_enc")));
            map.put("usage", dec(row.get("usage_text_enc")));
            map.put("time", dec(row.get("timing_enc")));
            map.put("timing", dec(row.get("timing_enc")));
            map.put("updatedAt", str(row.get("updated_at")));
            result.add(map);
        }
        return result;
    }

    public List<Map<String, Object>> allMedicationsForAdmin() {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                select m.*, e.archive_no, e.name_enc as elder_name_enc from medication m
                join elder e on e.id=m.elder_id
                order by m.updated_at desc
                """);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", str(row.get("id")));
            map.put("elderId", str(row.get("elder_id")));
            map.put("archiveNo", str(row.get("archive_no")));
            map.put("elderName", maskName(dec(row.get("elder_name_enc"))));
            map.put("drugName", dec(row.get("name_enc")));
            map.put("dosage", dec(row.get("dosage_enc")));
            map.put("usage", dec(row.get("usage_text_enc")));
            map.put("timing", dec(row.get("timing_enc")));
            map.put("updatedAt", str(row.get("updated_at")));
            map.put("status", "使用中");
            result.add(map);
        }
        return result;
    }

    public List<Map<String, Object>> scales(String elderId) {
        return scaleSummaries(elderId);
    }

    public List<Map<String, Object>> scaleSummaries(String elderId) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                select id, scale_name, score, record_date, volunteer
                from scale_record
                where elder_id=?
                order by created_at desc
                """, elderId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", str(row.get("id")));
            map.put("name", str(row.get("scale_name")));
            map.put("scale", str(row.get("scale_name")));
            map.put("score", intValue(row.get("score")));
            map.put("updatedAt", str(row.get("record_date")));
            map.put("date", str(row.get("record_date")));
            map.put("volunteer", str(row.get("volunteer")));
            result.add(map);
        }
        return result;
    }

    public Map<String, Object> scaleDetail(String elderId, String scaleName) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                select id, scale_name, score, record_date, volunteer, payload_enc
                from scale_record
                where elder_id=? and scale_name=?
                order by created_at desc
                limit 1
                """, elderId, scaleName);
        if (rows.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<String, Object> row = rows.get(0);
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", str(row.get("id")));
        map.put("name", str(row.get("scale_name")));
        map.put("scale", str(row.get("scale_name")));
        map.put("score", intValue(row.get("score")));
        map.put("updatedAt", str(row.get("record_date")));
        map.put("date", str(row.get("record_date")));
        map.put("volunteer", str(row.get("volunteer")));
        String payloadEnc = str(row.get("payload_enc"));
        map.put("answers", parseScaleAnswersCached(str(row.get("id")), dec(payloadEnc)));
        return map;
    }

    public void saveBasic(String elderId, Map<String, Object> data) {
        requireVolunteerScope(elderId);
        updateElder(elderId, data);
    }

    public void saveHealth(String elderId, Map<String, Object> data) {
        requireVolunteerScope(elderId);
        jdbc.update("""
                insert into health_record (id, elder_id, record_date, volunteer, height_cm, weight_kg, waist_cm, bmi,
                health_self_assessment, self_care_assessment, cognitive_screening, emotion_screening)
                values (?,?,?,?,?,?,?,?,?,?,?,?)
                """, "health-" + System.currentTimeMillis(), elderId, value(data, "date", LocalDateTime.now().format(FMT)),
                currentOperator(), decimal(data.get("heightCm")), decimal(data.get("weightKg")), decimal(data.get("waistCm")),
                decimal(data.get("bmi")), value(data, "healthSelfAssessment", ""), value(data, "selfCareAssessment", ""),
                value(data, "cognitiveScreening", ""), value(data, "emotionScreening", ""));
    }

    public void saveMedicationList(String elderId, List<Map<String, String>> items) {
        requireVolunteerScope(elderId);
        jdbc.update("delete from medication where elder_id=?", elderId);
        for (Map<String, String> item : items) {
            addMedication(elderId, item);
        }
    }

    public Map<String, String> addMedication(String elderId, Map<String, String> item) {
        String id = "med-" + System.currentTimeMillis() + "-" + Math.abs(item.hashCode());
        jdbc.update("insert into medication (id, elder_id, name_enc, dosage_enc, usage_text_enc, timing_enc) values (?,?,?,?,?,?)",
                id, elderId, enc(item.get("name")), enc(item.get("dosage")), enc(item.get("usage")), enc(item.getOrDefault("timing", item.getOrDefault("time", ""))));
        return Map.of("id", id);
    }

    public void updateMedication(String medicationId, Map<String, String> item) {
        jdbc.update("update medication set name_enc=?, dosage_enc=?, usage_text_enc=?, timing_enc=? where id=?",
                enc(item.get("name")), enc(item.get("dosage")), enc(item.get("usage")), enc(item.getOrDefault("timing", item.getOrDefault("time", ""))), medicationId);
    }

    public void deleteMedication(String medicationId) {
        jdbc.update("delete from medication where id=?", medicationId);
    }

    public void saveScales(String elderId, List<Map<String, Object>> rows) {
        requireVolunteerScope(elderId);
        List<String> scaleNames = rows.stream()
                .map(row -> value(row, "name", value(row, "scale", "PHQ-9")))
                .distinct()
                .toList();
        for (String scaleName : scaleNames) {
            jdbc.update("delete from scale_record where elder_id=? and scale_name=?", elderId, scaleName);
        }
        for (Map<String, Object> row : rows) {
            String payload;
            try {
                payload = objectMapper.writeValueAsString(row);
            } catch (Exception ex) {
                payload = row.toString();
            }
            jdbc.update("insert into scale_record (id, elder_id, scale_name, score, record_date, volunteer, payload_enc) values (?,?,?,?,?,?,?)",
                    "scale-" + System.currentTimeMillis() + "-" + Math.abs(row.hashCode()), elderId,
                    value(row, "name", value(row, "scale", "PHQ-9")), intValue(row.getOrDefault("score", 0)),
                    value(row, "date", LocalDateTime.now().format(FMT)), currentOperator(), enc(payload));
        }
    }

    public void recordAudit(String operator, String role, String ip, String target, String action, String result, String failReason, String requestId) {
        recordAudit(operator, role, ip, target, action, result, failReason, requestId, "", "", "", "");
    }

    public void recordAudit(
            String operator,
            String role,
            String ip,
            String target,
            String action,
            String result,
            String failReason,
            String requestId,
            String verificationMethod,
            String visitorName,
            String visitorPhone,
            String visitorIdCard
    ) {
        jdbc.update("""
                        insert into audit_log
                        (id, time, operator, role, source_ip, target, action, verification_method, visitor_name_enc, visitor_phone_enc, visitor_id_card_enc, result, fail_reason, request_id)
                        values (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                        """,
                UUID.randomUUID().toString(),
                Instant.now().toString(),
                operator,
                role,
                ip,
                target,
                action,
                verificationMethod,
                enc(visitorName),
                enc(visitorPhone),
                enc(visitorIdCard),
                result,
                failReason,
                requestId
        );
    }

    public void recordAuditBatch(List<AuditLogWrite> entries) {
        if (entries == null || entries.isEmpty()) {
            return;
        }
        jdbc.batchUpdate("""
                        insert into audit_log
                        (id, time, operator, role, source_ip, target, action, verification_method, visitor_name_enc, visitor_phone_enc, visitor_id_card_enc, result, fail_reason, request_id)
                        values (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                        """,
                entries,
                entries.size(),
                (PreparedStatement ps, AuditLogWrite entry) -> {
                    ps.setString(1, UUID.randomUUID().toString());
                    ps.setString(2, entry.time());
                    ps.setString(3, entry.operator());
                    ps.setString(4, entry.role());
                    ps.setString(5, entry.ip());
                    ps.setString(6, entry.target());
                    ps.setString(7, entry.action());
                    ps.setString(8, entry.verificationMethod());
                    ps.setString(9, enc(entry.visitorName()));
                    ps.setString(10, enc(entry.visitorPhone()));
                    ps.setString(11, enc(entry.visitorIdCard()));
                    ps.setString(12, entry.result());
                    ps.setString(13, entry.failReason());
                    ps.setString(14, entry.requestId());
                });
    }

    public List<Map<String, Object>> auditLogs(String operator, String action, String result) {
        StringBuilder sql = new StringBuilder("""
                select id, time, operator, role, source_ip, target, action, verification_method,
                       visitor_name_enc, visitor_phone_enc, visitor_id_card_enc,
                       result, fail_reason, request_id
                from audit_log
                where 1=1
                """);
        List<Object> args = new ArrayList<>();
        if (operator != null && !operator.isBlank()) {
            sql.append(" and operator like ?");
            args.add("%" + operator + "%");
        }
        if (action != null && !action.isBlank()) {
            sql.append(" and action = ?");
            args.add(action);
        }
        if (result != null && !result.isBlank()) {
            sql.append(" and result = ?");
            args.add(result);
        }
        sql.append(" order by time desc limit 500");

        List<Map<String, Object>> rows = jdbc.queryForList(sql.toString(), args.toArray());
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", row.get("id"));
            map.put("time", row.get("time"));
            map.put("operator", row.get("operator"));
            map.put("role", row.get("role"));
            map.put("sourceIp", row.get("source_ip"));
            map.put("target", row.get("target"));
            map.put("action", row.get("action"));
            map.put("verificationMethod", row.get("verification_method"));
            map.put("visitorName", dec(row.get("visitor_name_enc")));
            map.put("visitorPhone", dec(row.get("visitor_phone_enc")));
            map.put("visitorPhoneMasked", maskPhone(dec(row.get("visitor_phone_enc"))));
            map.put("visitorIdCard", dec(row.get("visitor_id_card_enc")));
            map.put("visitorIdCardMasked", maskIdCard(dec(row.get("visitor_id_card_enc"))));
            map.put("result", row.get("result"));
            map.put("failReason", row.get("fail_reason"));
            map.put("requestId", row.get("request_id"));
            out.add(map);
        }
        return out;
    }

    public Map<String, Object> one(String sql, Object... args) {
        List<Map<String, Object>> rows = jdbc.queryForList(sql, args);
        if (rows.isEmpty()) throw new BizException(404, "数据不存在");
        return rows.get(0);
    }

    public boolean isFamilyBound(String familyUserId, String elderId) {
        Integer count = jdbc.queryForObject("select count(*) from family_binding where family_user_id=? and elder_id=? and status='ACTIVE'",
                Integer.class, familyUserId, elderId);
        return count != null && count > 0;
    }

    public String enc(String value) {
        if (value == null || value.isBlank()) return "";
        if (isEncrypted(value)) return value;
        try {
            return crypto.encrypt(value);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public String dec(Object value) {
        String text = str(value);
        if (text.isBlank()) return "";
        try {
            return crypto.decrypt(text);
        } catch (Exception ignored) {
            return text;
        }
    }

    private boolean isEncrypted(String value) {
        try {
            crypto.decrypt(value);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    public String currentOperator() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth == null ? "system" : auth.getName();
    }

    public String hash(String value) {
        return hashService.sha256(value == null ? "" : value);
    }

    public String str(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    public String value(Map<String, ?> map, String key, String fallback) {
        Object v = map.get(key);
        String s = str(v);
        return s.isBlank() ? fallback : s;
    }

    public int intValue(Object value) {
        if (value == null) return 0;
        if (value instanceof Number n) return n.intValue();
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (Exception ignored) {
            return 0;
        }
    }

    public BigDecimal decimal(Object value) {
        if (value == null || str(value).isBlank()) return BigDecimal.ZERO;
        if (value instanceof BigDecimal bd) return bd;
        if (value instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        try {
            return new BigDecimal(str(value));
        } catch (Exception ignored) {
            return BigDecimal.ZERO;
        }
    }

    public String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) return "****";
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

    public String maskName(String name) {
        if (name == null || name.isBlank()) return "*";
        if (name.length() <= 1) return "*";
        return name.charAt(0) + "**";
    }

    public String maskIdCard(String idCard) {
        if (idCard == null || idCard.isBlank()) return "";
        if (idCard.length() <= 8) return idCard;
        return idCard.substring(0, 4) + "********" + idCard.substring(idCard.length() - 4);
    }

    private List<Map<String, Object>> parseScaleAnswers(String payload) {
        if (payload == null || payload.isBlank() || "{}".equals(payload)) {
            return List.of();
        }

        try {
            Map<String, Object> parsed = objectMapper.readValue(payload, new TypeReference<Map<String, Object>>() {});
            Object answers = parsed.get("answers");
            if (answers instanceof List<?> list) {
                List<Map<String, Object>> result = new ArrayList<>();
                for (Object item : list) {
                    if (item instanceof Map<?, ?> map) {
                        Map<String, Object> answer = new LinkedHashMap<>();
                        answer.put("question", str(map.get("question")));
                        Object value = map.get("value");
                        answer.put("value", value == null ? null : intValue(value));
                        result.add(answer);
                    }
                }
                return result;
            }
        } catch (Exception ignored) {
            // Fall back to legacy string payload parsing.
        }

        List<Map<String, Object>> result = new ArrayList<>();
        Matcher matcher = Pattern.compile("\\{question=(.*?), value=(null|-?\\d+)\\}").matcher(payload);
        while (matcher.find()) {
            Map<String, Object> answer = new LinkedHashMap<>();
            answer.put("question", matcher.group(1).trim());
            String rawValue = matcher.group(2);
            answer.put("value", "null".equals(rawValue) ? null : Integer.parseInt(rawValue));
            result.add(answer);
        }
        return result;
    }

    private List<Map<String, Object>> parseScaleAnswersCached(String cacheKey, String payload) {
        if (cacheKey == null || cacheKey.isBlank()) {
            return parseScaleAnswers(payload);
        }
        List<Map<String, Object>> cached = scaleAnswersCache.getOrLoad(
                cacheKey,
                SCALE_ANSWERS_CACHE_TTL_MS,
                () -> deepCopyAnswers(parseScaleAnswers(payload))
        );
        return deepCopyAnswers(cached);
    }

    private List<Map<String, Object>> deepCopyAnswers(List<Map<String, Object>> answers) {
        List<Map<String, Object>> copy = new ArrayList<>(answers.size());
        for (Map<String, Object> answer : answers) {
            copy.add(new LinkedHashMap<>(answer));
        }
        return copy;
    }

    public record AuditLogWrite(
            String time,
            String operator,
            String role,
            String ip,
            String target,
            String action,
            String verificationMethod,
            String visitorName,
            String visitorPhone,
            String visitorIdCard,
            String result,
            String failReason,
            String requestId
    ) {}
}
