package com.silverlink.care.module.qrcode;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.silverlink.care.infrastructure.crypto.AesGcmCryptoService;
import com.silverlink.care.infrastructure.crypto.HashService;
import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Service
public class QrCodeService {

    private final AesGcmCryptoService crypto;
    private final HashService hashService;
    private final JdbcTemplate jdbc;
    private final SilverLinkDataService data;
    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${silverlink.qrcode.public-base-url}")
    private String publicBaseUrl;

    public QrCodeService(AesGcmCryptoService crypto, HashService hashService, JdbcTemplate jdbc, SilverLinkDataService data) {
        this.crypto = crypto;
        this.hashService = hashService;
        this.jdbc = jdbc;
        this.data = data;
    }

    public QrCodeIssueResult generateWithToken(String elderId, String archiveNo) throws Exception {
        QrCodeEntity existing = findCurrentByElder(elderId);
        if (existing != null && existing.getQrToken() != null && !existing.getQrToken().isBlank()) {
            return new QrCodeIssueResult(existing, existing.getQrToken(), buildPublicUrl(existing.getQrToken()));
        }
        return issueOrReplaceToken(existing, elderId, archiveNo);
    }

    public QrCodeIssueResult regenerateWithToken(String id) throws Exception {
        QrCodeEntity old = findById(id);
        if (old == null) return null;
        return issueOrReplaceToken(old, old.getElderId(), old.getArchiveNo());
    }

    private QrCodeIssueResult issueOrReplaceToken(QrCodeEntity existing, String elderId, String archiveNo) throws Exception {
        String qrId = "QR" + Instant.now().toEpochMilli();
        String payload = mapper.writeValueAsString(Map.of(
                "qrId", qrId,
                "elderId", elderId,
                "issuedAt", Instant.now().toString(),
                "version", 1
        ));
        String token = crypto.encrypt(payload);
        QrCodeEntity entity = new QrCodeEntity();
        entity.setId(UUID.randomUUID().toString());
        entity.setQrId(qrId);
        entity.setElderId(elderId);
        entity.setArchiveNo(archiveNo);
        entity.setQrToken(token);
        entity.setQrTokenHash(hashService.sha256(token));
        entity.setStatus("ENABLED");
        entity.setKeyId("demo-key-v1");
        entity.setCreatedAt(Instant.now().toString());

        if (existing != null) {
            entity.setId(existing.getId());
            jdbc.update("""
                    update qr_code set qr_id=?, archive_no=?, qr_token=?, qr_token_hash=?, status='ENABLED', key_id=?, created_at=?, disabled_at=null
                    where id=?
                    """, entity.getQrId(), entity.getArchiveNo(), entity.getQrToken(), entity.getQrTokenHash(),
                    entity.getKeyId(), entity.getCreatedAt(), entity.getId());
        } else {
            jdbc.update("""
                    insert into qr_code (id, qr_id, elder_id, archive_no, qr_token, qr_token_hash, status, key_id, created_at, disabled_at)
                    values (?,?,?,?,?,?,?,?,?,?)
                    """, entity.getId(), entity.getQrId(), entity.getElderId(), entity.getArchiveNo(), entity.getQrToken(),
                    entity.getQrTokenHash(), entity.getStatus(), entity.getKeyId(), entity.getCreatedAt(), null);
        }
        return new QrCodeIssueResult(entity, token, buildPublicUrl(token));
    }

    public QrCodeEntity generate(String elderId, String archiveNo) throws Exception {
        return generateWithToken(elderId, archiveNo).getEntity();
    }

    public QrCodeEntity regenerate(String id) throws Exception {
        QrCodeIssueResult result = regenerateWithToken(id);
        return result == null ? null : result.getEntity();
    }

    public QrCodeEntity resolve(String token) throws Exception {
        String plain = crypto.decrypt(token);
        Map<?, ?> map = mapper.readValue(plain, Map.class);
        String qrId = String.valueOf(map.get("qrId"));
        String tokenHash = hashService.sha256(token);
        List<Map<String, Object>> rows = jdbc.queryForList("select * from qr_code where qr_id=? and qr_token_hash=?", qrId, tokenHash);
        return rows.isEmpty() ? null : toEntity(rows.get(0));
    }

    public QrCodeEntity findById(String id) {
        List<Map<String, Object>> rows = jdbc.queryForList("select * from qr_code where id=?", id);
        return rows.isEmpty() ? null : toEntity(rows.get(0));
    }

    public QrCodeEntity findCurrentByElder(String elderId) {
        List<Map<String, Object>> rows = jdbc.queryForList("select * from qr_code where elder_id=? order by created_at desc limit 1", elderId);
        return rows.isEmpty() ? null : toEntity(rows.get(0));
    }

    public void disable(String id) {
        jdbc.update("update qr_code set status='DISABLED', disabled_at=? where id=?", Instant.now().toString(), id);
    }

    public String buildPublicUrl(String token) {
        if (publicBaseUrl.endsWith("=")) {
            return publicBaseUrl + token;
        }
        String separator = publicBaseUrl.contains("?") ? "&token=" : "/s/";
        return publicBaseUrl + separator + token;
    }

    public Collection<QrCodeEntity> listAll() {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                select q.*, e.name_enc as elder_name_enc, e.age as elder_age, e.emergency_phone_enc as elder_phone_enc
                from qr_code q
                left join elder e on e.id = q.elder_id
                order by q.created_at desc
                """);
        List<QrCodeEntity> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            QrCodeEntity entity = toEntity(row);
            entity.setElderName(data.dec(row.get("elder_name_enc")));
            entity.setElderAge(data.intValue(row.get("elder_age")));
            entity.setElderPhone(data.dec(row.get("elder_phone_enc")));
            result.add(entity);
        }
        return result;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void ensureEveryElderHasOneQrCode() {
        try {
            List<Map<String, Object>> elders = jdbc.queryForList("select id, archive_no from elder order by created_at asc");
            for (Map<String, Object> elder : elders) {
                String elderId = data.str(elder.get("id"));
                List<Map<String, Object>> existingRows = jdbc.queryForList("select * from qr_code where elder_id=? order by created_at desc", elderId);
                if (existingRows.isEmpty()) {
                    generateWithToken(elderId, data.str(elder.get("archive_no")));
                    continue;
                }
                String keepId = data.str(existingRows.get(0).get("id"));
                jdbc.update("delete from qr_code where elder_id=? and id<>?", elderId, keepId);
            }
        } catch (Exception ignored) {
            // Startup should not fail only because QR backfill could not complete.
        }
    }

    private QrCodeEntity toEntity(Map<String, Object> row) {
        QrCodeEntity e = new QrCodeEntity();
        e.setId(data.str(row.get("id")));
        e.setQrId(data.str(row.get("qr_id")));
        e.setElderId(data.str(row.get("elder_id")));
        e.setArchiveNo(data.str(row.get("archive_no")));
        e.setQrToken(data.str(row.get("qr_token")));
        e.setQrTokenHash(data.str(row.get("qr_token_hash")));
        e.setStatus(data.str(row.get("status")));
        e.setKeyId(data.str(row.get("key_id")));
        e.setCreatedAt(data.str(row.get("created_at")));
        e.setDisabledAt(data.str(row.get("disabled_at")));
        return e;
    }
}
