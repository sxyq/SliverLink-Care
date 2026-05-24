package com.silverlink.care.module.sms;

import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
public class SmsService {

    @Value("${silverlink.sms.code-ttl-seconds:300}")
    private long codeTtlSeconds;

    @Value("${silverlink.sms.max-attempts:5}")
    private int maxAttempts;

    @Value("${silverlink.sms.universal-bypass-code:}")
    private String universalBypassCode;

    private final SecureRandom random = new SecureRandom();
    private final JdbcTemplate jdbc;
    private final SilverLinkDataService data;
    private final SmsProvider smsProvider;

    public SmsService(JdbcTemplate jdbc, SilverLinkDataService data, SmsProvider smsProvider) {
        this.jdbc = jdbc;
        this.data = data;
        this.smsProvider = smsProvider;
    }

    public String sendCode(String phone) {
        return sendCode(phone, "SCAN");
    }

    public String sendCode(String phone, String scene) {
        String phoneHash = data.hash(phone);
        Integer recent = jdbc.queryForObject("""
                select count(*) from sms_code
                where phone_hash=? and scene=? and created_at > ?
                """, Integer.class, phoneHash, scene, Timestamp.from(Instant.now().minusSeconds(60)));
        if (recent != null && recent > 0) {
            throw new RuntimeException("发送过于频繁，请稍后再试");
        }
        String code = String.format("%06d", random.nextInt(1000000));
        smsProvider.sendCode(phone, code);
        jdbc.update("insert into sms_code (id, phone_hash, code_hash, scene, expires_at) values (?,?,?,?,?)",
                UUID.randomUUID().toString(), phoneHash, data.hash(code), scene, Timestamp.from(Instant.now().plusSeconds(codeTtlSeconds)));
        return code;
    }

    public boolean verify(String phone, String code) {
        return verify(phone, code, "SCAN");
    }

    public boolean verify(String phone, String code, String scene) {
        if (!universalBypassCode.isBlank() && universalBypassCode.equals(code)) {
            return true;
        }

        String phoneHash = data.hash(phone);
        var rows = jdbc.queryForList("""
                select * from sms_code
                where phone_hash=? and scene=? and verified=0
                order by created_at desc limit 1
                """, phoneHash, scene);
        if (rows.isEmpty()) return false;
        Map<String, Object> row = rows.get(0);
        String id = data.str(row.get("id"));
        Timestamp expiresAt = (Timestamp) row.get("expires_at");
        int attempts = data.intValue(row.get("attempts"));
        if (expiresAt == null || expiresAt.toInstant().isBefore(Instant.now()) || attempts >= maxAttempts) {
            jdbc.update("delete from sms_code where id=?", id);
            return false;
        }
        boolean ok = data.hash(code).equals(data.str(row.get("code_hash")));
        if (ok) {
            jdbc.update("delete from sms_code where id=?", id);
        } else {
            jdbc.update("update sms_code set attempts=attempts+1 where id=?", id);
        }
        return ok;
    }
}
