package com.silverlink.care.module.invitation;

import com.silverlink.care.common.BizException;
import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import com.silverlink.care.module.sms.SmsService;
import com.silverlink.care.security.JwtTokenProvider;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class InvitationService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final JdbcTemplate jdbc;
    private final SilverLinkDataService data;
    private final SmsService smsService;
    private final JwtTokenProvider jwtTokenProvider;

    public InvitationService(JdbcTemplate jdbc, SilverLinkDataService data, SmsService smsService, JwtTokenProvider jwtTokenProvider) {
        this.jdbc = jdbc;
        this.data = data;
        this.smsService = smsService;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    public InvitationPreviewDto preview(String code) {
        Map<String, Object> row = data.one("""
                select i.*, e.name_enc, e.age, e.archive_no from invitation i
                join elder e on e.id=i.elder_id where i.code=?
                """, code);
        InvitationPreviewDto dto = new InvitationPreviewDto();
        dto.setCode(data.str(row.get("code")));
        dto.setElderName(data.maskName(data.dec(row.get("name_enc"))));
        dto.setElderAge(data.intValue(row.get("age")));
        dto.setElderArchiveNo(maskArchiveNo(data.str(row.get("archive_no"))));
        dto.setStatus(data.str(row.get("status")));
        dto.setExpiresAt(data.str(row.get("expires_at")));
        dto.setMaxUses(data.intValue(row.get("max_uses")));
        dto.setUsedCount(data.intValue(row.get("used_count")));
        return dto;
    }

    public void sendSms(String code, String phone) {
        Map<String, Object> row = data.one("select * from invitation where code=?", code);
        if (!"ACTIVE".equals(data.str(row.get("status")))) {
            throw new BizException(400, "邀请码不可用");
        }
        smsService.sendCode(phone, "INVITATION:" + code);
    }

    public RegisterResultDto register(String code, RegisterRequest req) {
        Map<String, Object> row = data.one("select * from invitation where code=?", code);
        if (!"ACTIVE".equals(data.str(row.get("status")))) {
            return new RegisterResultDto(false, null, "邀请码不可用");
        }
        if (data.intValue(row.get("used_count")) >= data.intValue(row.get("max_uses"))) {
            return new RegisterResultDto(false, null, "邀请码已用完");
        }
        if (!smsService.verify(req.getPhone(), req.getSmsCode(), "INVITATION:" + code)) {
            return new RegisterResultDto(false, null, "验证码错误或已过期");
        }

        String familyId = "family-" + System.currentTimeMillis();
        jdbc.update("insert into app_user (id, account, password_hash, name_enc, phone_enc, role, status) values (?,?,?,?,?,'FAMILY','ACTIVE')",
                familyId, req.getPhone(), req.getPassword(), data.enc(req.getName()), data.enc(req.getPhone()));

        String bindingId = "bind-" + System.currentTimeMillis();
        jdbc.update("""
                insert into family_binding (id, family_user_id, family_name_enc, family_phone_enc, relationship, elder_id, invitation_code, bound_at, status)
                values (?,?,?,?,?,?,?,?, 'ACTIVE')
                """, bindingId, familyId, data.enc(req.getName()), data.enc(req.getPhone()), req.getRelationship(),
                data.str(row.get("elder_id")), code, LocalDateTime.now().format(FMT));
        jdbc.update("update invitation set used_count=used_count+1 where code=?", code);
        String token = jwtTokenProvider.generateToken(req.getPhone(), "FAMILY", 86400000L);
        return new RegisterResultDto(true, token, "注册成功");
    }

    public List<InvitationAdminDto> listForAdmin() {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                select i.*, e.name_enc, e.archive_no from invitation i
                join elder e on e.id=i.elder_id order by i.created_at desc
                """);
        List<InvitationAdminDto> result = new ArrayList<>();
        for (Map<String, Object> row : rows) result.add(toAdminDto(row));
        return result;
    }

    public InvitationAdminDto create(CreateInvitationRequest req) {
        Map<String, Object> elder = data.one("select * from elder where id=?", req.getElderId());
        String code = generateCode();
        String now = LocalDateTime.now().format(FMT);
        String expiresAt = LocalDateTime.now().plusDays(req.getExpiresInDays() == null ? 7 : req.getExpiresInDays()).format(FMT);
        String id = "invite-" + System.currentTimeMillis();
        jdbc.update("insert into invitation (id, code, elder_id, expires_at, max_uses, used_count, status, created_at) values (?,?,?,?,?,0,'ACTIVE',?)",
                id, code, req.getElderId(), expiresAt, req.getMaxUses() == null ? 1 : req.getMaxUses(), now);
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", id);
        row.put("code", code);
        row.put("name_enc", elder.get("name_enc"));
        row.put("archive_no", elder.get("archive_no"));
        row.put("expires_at", expiresAt);
        row.put("max_uses", req.getMaxUses() == null ? 1 : req.getMaxUses());
        row.put("used_count", 0);
        row.put("status", "ACTIVE");
        row.put("created_at", now);
        return toAdminDto(row);
    }

    public void disable(String id) {
        jdbc.update("update invitation set status='DISABLED' where id=?", id);
    }

    public void delete(String id) {
        jdbc.update("delete from invitation where id=?", id);
    }

    private InvitationAdminDto toAdminDto(Map<String, Object> row) {
        InvitationAdminDto dto = new InvitationAdminDto();
        dto.setId(data.str(row.get("id")));
        dto.setCode(data.str(row.get("code")));
        dto.setElderName(data.dec(row.get("name_enc")));
        dto.setArchiveNo(data.str(row.get("archive_no")));
        dto.setExpiresAt(data.str(row.get("expires_at")));
        dto.setMaxUses(data.intValue(row.get("max_uses")));
        dto.setUsedCount(data.intValue(row.get("used_count")));
        dto.setStatus(data.str(row.get("status")));
        dto.setCreatedAt(data.str(row.get("created_at")));
        return dto;
    }

    private String generateCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        Random random = new Random();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 8; i++) sb.append(chars.charAt(random.nextInt(chars.length())));
        return sb.toString();
    }

    private String maskArchiveNo(String archiveNo) {
        if (archiveNo == null || archiveNo.length() <= 6) return "****";
        return archiveNo.substring(0, 4) + "****" + archiveNo.substring(archiveNo.length() - 3);
    }
}
