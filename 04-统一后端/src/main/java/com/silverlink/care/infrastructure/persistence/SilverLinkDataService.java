package com.silverlink.care.infrastructure.persistence;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.silverlink.care.infrastructure.cache.SimpleTtlCache;
import com.silverlink.care.common.BizException;
import com.silverlink.care.infrastructure.crypto.AesGcmCryptoService;
import com.silverlink.care.infrastructure.crypto.HashService;
import com.silverlink.care.module.audit.AuditLogQuery;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
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
    private static final int SEED_ENCRYPTION_BATCH_SIZE = 200;
    private static final Logger log = LoggerFactory.getLogger(SilverLinkDataService.class);

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
        encryptColumns("app_user", "id", "name_enc", "phone_enc");
        encryptColumns("elder", "id", "name_enc", "residence_enc", "emergency_contact_name_enc",
                "emergency_phone_enc", "backup_contact_name_enc", "backup_phone_enc", "allergy_enc");
        encryptColumns("medication", "id", "name_enc", "dosage_enc", "usage_text_enc", "timing_enc");
        encryptColumns("scale_record", "id", "payload_enc");
        encryptColumns("family_binding", "id", "family_name_enc", "family_phone_enc");
        encryptColumns("audit_log", "id", "visitor_name_enc", "visitor_phone_enc", "visitor_id_card_enc");
        encryptColumns("scan_verification_session", "session_id",
                "visitor_name_enc", "visitor_phone_enc", "visitor_id_card_enc");
    }

    private void encryptColumns(String table, String idColumn, String... columns) {
        try {
            String prefix = crypto.encryptedPrefix();
            if (prefix == null || prefix.isBlank()) {
                throw new IllegalStateException("Missing encryption token prefix");
            }
            StringBuilder candidate = new StringBuilder();
            List<Object> fixedArgs = new ArrayList<>();
            for (String column : columns) {
                if (!candidate.isEmpty()) candidate.append(" or ");
                candidate.append("(").append(column)
                        .append(" is not null and ").append(column)
                        .append(" <> '' and left(").append(column).append(", ?) <> ?)");
                fixedArgs.add(prefix.length());
                fixedArgs.add(prefix);
            }

            String selectedColumns = String.join(", ", columns);
            String sql = "select " + idColumn + ", " + selectedColumns + " from " + table
                    + " where " + idColumn + " > ? and (" + candidate + ")"
                    + " order by " + idColumn + " limit ?";
            String lastId = "";
            long encryptedCount = 0L;
            while (true) {
                List<Object> args = new ArrayList<>();
                args.add(lastId);
                args.addAll(fixedArgs);
                args.add(SEED_ENCRYPTION_BATCH_SIZE);
                List<Map<String, Object>> rows = jdbc.queryForList(sql, args.toArray());
                if (rows.isEmpty()) break;
                for (Map<String, Object> row : rows) {
                    String id = str(row.get(idColumn));
                    for (String column : columns) {
                        String value = str(row.get(column));
                        if (value.isBlank() || isEncrypted(value)) continue;
                        jdbc.update("update " + table + " set " + column + "=? where " + idColumn + "=?",
                                enc(value), id);
                        encryptedCount++;
                    }
                    lastId = id;
                }
                if (rows.size() < SEED_ENCRYPTION_BATCH_SIZE) break;
            }
            if (encryptedCount > 0) {
                log.info("Encrypted {} legacy seed values in {}", encryptedCount, table);
            }
        } catch (Exception exception) {
            // Some narrow integration-test schemas intentionally omit unrelated business tables.
            log.debug("Skipping seed encryption for {}: {}", table, exception.getMessage());
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
        map.put("auditCount", auditCount());
        return map;
    }

    private int auditCount() {
        try {
            Map<String, Object> state = jdbc.queryForMap("""
                    select coalesce(sum(case
                             when stat_day < utc_date() and status='READY' then source_row_count
                             else 0 end), 0) past_count,
                           sum(case when status='FAILED' then 1 else 0 end) failed_count,
                           sum(case when stat_day=utc_date() and status='READY' then 1 else 0 end) today_ready
                    from audit_log_rollup_day_state
                    """);
            if (longValue(state.get("failed_count")) == 0L && longValue(state.get("today_ready")) > 0L) {
                Long todayCount = jdbc.queryForObject("""
                        select count(*) from audit_log force index (idx_audit_time_id)
                        where time >= concat(utc_date(), 'T00:00:00Z')
                          and time < concat(date_add(utc_date(), interval 1 day), 'T00:00:00Z')
                        """, Long.class);
                long total = longValue(state.get("past_count")) + (todayCount == null ? 0L : todayCount);
                return (int) Math.min(Integer.MAX_VALUE, Math.max(0L, total));
            }
        } catch (RuntimeException ignored) {
            // V19 may not exist yet in narrow tests or during a migration rollback.
        }
        return count("audit_log", "1=1");
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
        String account = value(body, "account", "vol" + System.currentTimeMillis()).trim();
        if (account.isBlank()) {
            throw new BizException(400, "请输入登录账号");
        }
        if (findUser(account, "VOLUNTEER").isPresent()) {
            throw new BizException(400, "该登录账号已存在，请更换后重试");
        }

        String id = "vol-" + System.currentTimeMillis();
        try {
            jdbc.update("insert into app_user (id, account, password_hash, name_enc, phone_enc, role, status) values (?,?,?,?,?,'VOLUNTEER','ACTIVE')",
                    id, account, value(body, "password", "Volunteer@123456"),
                    enc(value(body, "name", "志愿者")), enc(value(body, "phone", "")));
        } catch (DuplicateKeyException exception) {
            throw new BizException(400, "该登录账号已存在，请更换后重试");
        }
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

    public List<Map<String, Object>> allScaleSummariesForAdmin() {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                select s.id, s.elder_id, s.scale_name, s.score, s.record_date, s.volunteer,
                       e.archive_no, e.name_enc as elder_name_enc
                from scale_record s
                join elder e on e.id = s.elder_id
                order by s.created_at desc, s.id desc
                """);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", str(row.get("id")));
            map.put("elderId", str(row.get("elder_id")));
            map.put("archiveNo", str(row.get("archive_no")));
            map.put("elderName", dec(row.get("elder_name_enc")));
            map.put("scaleName", str(row.get("scale_name")));
            map.put("score", intValue(row.get("score")));
            map.put("date", str(row.get("record_date")));
            map.put("volunteer", str(row.get("volunteer")));
            result.add(map);
        }
        return result;
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
        recordAudit(new AuditLogWrite(
                UUID.randomUUID().toString(),
                Instant.now().toString(),
                operator,
                role,
                ip,
                target,
                action,
                verificationMethod,
                visitorName,
                visitorPhone,
                visitorIdCard,
                result,
                failReason,
                requestId
        ));
    }

    public void recordAudit(AuditLogWrite entry) {
        jdbc.update("""
                        insert into audit_log
                        (id, time, operator, role, source_ip, target, action, verification_method, visitor_name_enc, visitor_phone_enc, visitor_id_card_enc, result, fail_reason, request_id)
                        values (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                        """,
                entry.id(),
                entry.time(),
                entry.operator(),
                entry.role(),
                entry.ip(),
                entry.target(),
                entry.action(),
                entry.verificationMethod(),
                enc(entry.visitorName()),
                enc(entry.visitorPhone()),
                enc(entry.visitorIdCard()),
                entry.result(),
                entry.failReason(),
                entry.requestId()
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
                    ps.setString(1, entry.id());
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
        return auditLogPage(new AuditLogQuery(null, null, operator, action, result, null, null, null, null), null, null, 50);
    }

    /**
     * Reads one keyset page only. The database filters first; encrypted visitor fields are
     * decrypted only after the bounded result set is returned.
     */
    public List<Map<String, Object>> auditLogPage(AuditLogQuery query, String cursorTime, String cursorId, int limit) {
        QueryParts parts = auditWhere(query);
        StringBuilder sql = new StringBuilder("""
                select id, time, operator, role, source_ip, target, action, verification_method,
                       visitor_name_enc, visitor_phone_enc, visitor_id_card_enc,
                       result, fail_reason, request_id
                from audit_log force index (""").append(auditPageIndex(query)).append(")\n")
                .append(parts.sql());
        List<Object> args = new ArrayList<>(parts.args());
        if (cursorTime != null && !cursorTime.isBlank() && cursorId != null && !cursorId.isBlank()) {
            sql.append(" and (time < ? or (time = ? and id < ?))");
            args.add(cursorTime);
            args.add(cursorTime);
            args.add(cursorId);
        }
        sql.append(" order by time desc, id desc limit ?");
        args.add(Math.max(1, Math.min(101, limit)));

        List<Map<String, Object>> rows = jdbc.queryForList(sql.toString(), args.toArray());
        return mapAuditRows(rows);
    }

    public Map<String, Object> auditLogStatistics(AuditLogQuery query) {
        QueryParts parts = auditWhere(query);
        Map<String, Object> summary = new LinkedHashMap<>();
        List<Object> args = parts.args();
        Map<String, Object> totals = jdbc.queryForMap("select count(*) total, "
                        + "sum(case when result in ('SUCCESS','成功') then 1 else 0 end) successCount, "
                        + "sum(case when result in ('FAIL','失败') then 1 else 0 end) failureCount, "
                        + "sum(case when result = 'PENDING' then 1 else 0 end) pendingCount, "
                        + "count(distinct nullif(source_ip, '')) sourceIpCount from audit_log " + parts.sql(), args.toArray());
        summary.put("total", longValue(totals.get("total")));
        summary.put("successCount", longValue(totals.get("successCount")));
        summary.put("failureCount", longValue(totals.get("failureCount")));
        summary.put("pendingCount", longValue(totals.get("pendingCount")));
        summary.put("sourceIpCount", longValue(totals.get("sourceIpCount")));
        summary.put("actions", auditDistribution("action", parts));
        summary.put("verificationMethods", auditDistribution("verification_method", parts));
        summary.put("trend", auditDailyTrend(parts));
        return summary;
    }

    public List<Map<String, Object>> auditLogRecent(AuditLogQuery query, int limit) {
        QueryParts parts = auditWhere(query);
        List<Object> args = new ArrayList<>(parts.args());
        args.add(Math.max(1, Math.min(10, limit)));
        List<Map<String, Object>> recent = jdbc.queryForList("""
                select id, time, operator, role, source_ip, target, action, verification_method, result
                from audit_log
                """ + parts.sql() + " order by time desc, id desc limit ?", args.toArray());
        return recent.stream().map(row -> Map.<String, Object>of(
                "id", str(row.get("id")),
                "time", str(row.get("time")),
                "operator", str(row.get("operator")),
                "role", str(row.get("role")),
                "sourceIp", str(row.get("source_ip")),
                "target", str(row.get("target")),
                "action", str(row.get("action")),
                "verificationMethod", str(row.get("verification_method")),
                "result", str(row.get("result"))
        )).toList();
    }

    public Map<String, Object> auditLogSummary(AuditLogQuery query) {
        Map<String, Object> summary = new LinkedHashMap<>(auditLogStatistics(query));
        summary.put("recent", auditLogRecent(query, 6));
        return summary;
    }

    /** Lightweight dashboard feed; intentionally excludes all visitor identity columns. */
    public List<Map<String, Object>> recentAuditSummaries(int limit) {
        int bounded = Math.max(1, Math.min(10, limit));
        return jdbc.queryForList("""
                select id, time, operator, role, source_ip, target, action, verification_method, result
                from audit_log force index (idx_audit_time_id)
                order by time desc, id desc limit ?
                """, bounded).stream().map(row -> Map.<String, Object>of(
                "id", str(row.get("id")),
                "time", str(row.get("time")),
                "operator", str(row.get("operator")),
                "role", str(row.get("role")),
                "sourceIp", str(row.get("source_ip")),
                "target", str(row.get("target")),
                "action", str(row.get("action")),
                "verificationMethod", str(row.get("verification_method")),
                "result", str(row.get("result"))
        )).toList();
    }

    private List<Map<String, Object>> mapAuditRows(List<Map<String, Object>> rows) {
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

    private List<Map<String, Object>> auditDistribution(String column, QueryParts parts) {
        // Column names are compile-time constants, never supplied by callers.
        return jdbc.queryForList("select " + column + " label, count(*) value from audit_log " + parts.sql()
                        + " group by " + column + " order by value desc limit 20", parts.args().toArray())
                .stream().map(row -> Map.<String, Object>of(
                        "label", str(row.get("label")), "value", longValue(row.get("value"))
                )).toList();
    }

    private List<Map<String, Object>> auditDailyTrend(QueryParts parts) {
        return jdbc.queryForList("select left(time, 10) day, count(*) value from audit_log " + parts.sql()
                        + " and time >= ? group by left(time, 10) order by day asc", appendArgs(parts.args(), Instant.now().minusSeconds(7 * 24 * 3600L).toString()).toArray())
                .stream().map(row -> Map.<String, Object>of(
                        "day", str(row.get("day")), "value", longValue(row.get("value"))
                )).toList();
    }

    private QueryParts auditWhere(AuditLogQuery query) {
        AuditLogQuery safe = query == null ? new AuditLogQuery(null, null, null, null, null, null, null, null, null) : query;
        StringBuilder where = new StringBuilder(" where 1=1");
        List<Object> args = new ArrayList<>();
        addAuditRange(where, args, safe.from(), safe.to());
        addExact(where, args, "action", safe.action());
        addResult(where, args, safe.result());
        addRole(where, args, safe.role());
        addExact(where, args, "verification_method", safe.verificationMethod());
        addPrefix(where, args, "operator", safe.operator());
        addPrefix(where, args, "source_ip", safe.sourceIp());
        addPrefix(where, args, "target", safe.target());
        return new QueryParts(where.toString(), args);
    }

    private String auditPageIndex(AuditLogQuery query) {
        AuditLogQuery safe = query == null ? new AuditLogQuery(null, null, null, null, null, null, null, null, null) : query;
        if (safe.action() != null && !safe.action().isBlank()) return "idx_audit_action_time_id";
        if (safe.operator() != null && !safe.operator().isBlank()) return "idx_audit_operator_time_id";
        if (safe.role() != null && !safe.role().isBlank()) return "idx_audit_role_time_id";
        if (safe.verificationMethod() != null && !safe.verificationMethod().isBlank()) return "idx_audit_verification_time_id";
        if (safe.result() != null && !safe.result().isBlank()) return "idx_audit_result_time_id";
        return "idx_audit_time_id";
    }

    private void addAuditRange(StringBuilder where, List<Object> args, String from, String to) {
        if (from != null && !from.isBlank()) {
            where.append(" and time >= ?");
            args.add(normalizeStartTime(from));
        }
        if (to != null && !to.isBlank()) {
            where.append(" and time <= ?");
            args.add(normalizeEndTime(to));
        }
    }

    private void addExact(StringBuilder where, List<Object> args, String column, String value) {
        if (value != null && !value.isBlank()) {
            where.append(" and ").append(column).append(" = ?");
            args.add(value);
        }
    }

    private void addResult(StringBuilder where, List<Object> args, String value) {
        if (value == null || value.isBlank()) return;
        if ("成功".equals(value) || "SUCCESS".equalsIgnoreCase(value)) {
            where.append(" and result in ('SUCCESS', '成功')");
        } else if ("失败".equals(value) || "FAIL".equalsIgnoreCase(value)) {
            where.append(" and result in ('FAIL', '失败')");
        } else {
            addExact(where, args, "result", value);
        }
    }

    private void addRole(StringBuilder where, List<Object> args, String value) {
        if (value == null || value.isBlank()) return;
        if ("VISITOR_GROUP".equalsIgnoreCase(value)) {
            where.append(" and role in ('VISITOR', 'SCAN', 'SCAN_USER', 'ANONYMOUS')");
            return;
        }
        addExact(where, args, "role", value);
    }

    private void addPrefix(StringBuilder where, List<Object> args, String column, String value) {
        if (value == null || value.isBlank()) return;
        where.append(" and ").append(column).append(" like ? escape '!'");
        args.add(value.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%");
    }

    private String normalizeStartTime(String value) {
        return value.length() == 10 ? value + "T00:00:00.000Z" : value;
    }

    private String normalizeEndTime(String value) {
        return value.length() == 10 ? value + "T23:59:59.999Z" : value;
    }

    private List<Object> appendArgs(List<Object> args, Object extra) {
        List<Object> result = new ArrayList<>(args);
        result.add(extra);
        return result;
    }

    private record QueryParts(String sql, List<Object> args) {
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

    private long longValue(Object value) {
        if (value instanceof Number number) return number.longValue();
        try {
            return Long.parseLong(str(value));
        } catch (RuntimeException ignored) {
            return 0L;
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
            String id,
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
