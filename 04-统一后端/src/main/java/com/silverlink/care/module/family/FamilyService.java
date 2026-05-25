package com.silverlink.care.module.family;

import com.silverlink.care.common.BizException;
import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import com.silverlink.care.module.qrcode.QrCodeEntity;
import com.silverlink.care.module.qrcode.QrCodeService;
import com.silverlink.care.module.review.AdminReviewRequestService;
import com.silverlink.care.security.JwtTokenProvider;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class FamilyService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final JdbcTemplate jdbc;
    private final SilverLinkDataService data;
    private final JwtTokenProvider jwtTokenProvider;
    private final QrCodeService qrCodeService;
    private final AdminReviewRequestService reviewRequestService;

    public FamilyService(JdbcTemplate jdbc, SilverLinkDataService data, JwtTokenProvider jwtTokenProvider, QrCodeService qrCodeService, AdminReviewRequestService reviewRequestService) {
        this.jdbc = jdbc;
        this.data = data;
        this.jwtTokenProvider = jwtTokenProvider;
        this.qrCodeService = qrCodeService;
        this.reviewRequestService = reviewRequestService;
    }

    public FamilyLoginResultDto login(FamilyLoginRequest req) {
        var user = data.login(req.getPhone(), req.getPassword(), "FAMILY");
        if (user.isEmpty()) {
            return new FamilyLoginResultDto(false, null, "手机号或密码错误");
        }
        return new FamilyLoginResultDto(true, jwtTokenProvider.generateToken(req.getPhone(), "FAMILY", 86400000L), "登录成功");
    }

    public List<FamilyElderDto> myElders(String auth) {
        String familyUserId = resolveFamilyUserId(auth);
        List<Map<String, Object>> rows = jdbc.queryForList("""
                select b.bound_at, e.* from family_binding b join elder e on e.id=b.elder_id
                where b.family_user_id=? and b.status='ACTIVE' and e.status='ACTIVE'
                order by b.bound_at desc
                """, familyUserId);
        List<FamilyElderDto> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            FamilyElderDto dto = new FamilyElderDto();
            dto.setId(data.str(row.get("id")));
            dto.setName(data.maskName(data.dec(row.get("name_enc"))));
            dto.setAge(data.intValue(row.get("age")));
            dto.setArchiveNo(data.str(row.get("archive_no")));
            dto.setLastUpdate(data.str(row.get("bound_at")));
            result.add(dto);
        }
        return result;
    }

    public FamilyElderDetailDto elderDetail(String elderId, String auth) {
        checkBinding(resolveFamilyUserId(auth), elderId);
        Map<String, Object> elder = data.one("select * from elder where id=?", elderId);
        FamilyElderDetailDto dto = new FamilyElderDetailDto();
        dto.setId(elderId);
        dto.setName(data.dec(elder.get("name_enc")));
        dto.setAge(data.intValue(elder.get("age")));
        dto.setGender(data.str(elder.get("gender")));
        dto.setBloodType(data.str(elder.get("abo_type")));
        dto.setAllergyHistory(data.dec(elder.get("allergy_enc")));
        dto.setEmergencyContactName(data.dec(elder.get("emergency_contact_name_enc")));
        dto.setEmergencyContactPhone(data.dec(elder.get("emergency_phone_enc")));
        dto.setEmergencyContactRelation(data.str(elder.get("relationship")));
        dto.setBackupContactName(data.dec(elder.get("backup_contact_name_enc")));
        dto.setBackupContactPhone(data.dec(elder.get("backup_phone_enc")));
        dto.setBackupContactRelation("备用联系人");
        return dto;
    }

    public void updateContacts(String elderId, UpdateContactsRequest req, String auth) {
        checkBinding(resolveFamilyUserId(auth), elderId);
        jdbc.update("""
                update elder set emergency_contact_name_enc=?, emergency_phone_enc=?, relationship=?,
                backup_contact_name_enc=?, backup_phone_enc=? where id=?
                """, data.enc(req.getEmergencyContactName()), data.enc(req.getEmergencyContactPhone()),
                req.getEmergencyContactRelation(), data.enc(req.getBackupContactName()), data.enc(req.getBackupContactPhone()), elderId);
    }

    public List<FamilyMedicationDto> medications(String elderId, String auth) {
        checkBinding(resolveFamilyUserId(auth), elderId);
        List<FamilyMedicationDto> result = new ArrayList<>();
        for (Map<String, String> row : data.medications(elderId)) {
            FamilyMedicationDto dto = new FamilyMedicationDto();
            dto.setId(row.get("id"));
            dto.setName(row.get("name"));
            dto.setDosage(row.get("dosage"));
            dto.setUsage(row.get("usage"));
            dto.setTiming(row.get("timing"));
            dto.setUpdatedAt(row.get("updatedAt"));
            result.add(dto);
        }
        return result;
    }

    public FamilyMedicationDto addMedication(String elderId, FamilyMedicationRequest req, String auth) {
        checkBinding(resolveFamilyUserId(auth), elderId);
        Map<String, String> row = new LinkedHashMap<>();
        row.put("name", req.getName());
        row.put("dosage", req.getDosage());
        row.put("usage", req.getUsage());
        row.put("timing", req.getTiming());
        String id = data.addMedication(elderId, row).get("id");
        FamilyMedicationDto dto = new FamilyMedicationDto();
        dto.setId(id);
        dto.setName(req.getName());
        dto.setDosage(req.getDosage());
        dto.setUsage(req.getUsage());
        dto.setTiming(req.getTiming());
        dto.setUpdatedAt(LocalDateTime.now().format(FMT));
        return dto;
    }

    public void updateMedication(String elderId, String medicationId, FamilyMedicationRequest req, String auth) {
        checkBinding(resolveFamilyUserId(auth), elderId);
        Map<String, String> row = new LinkedHashMap<>();
        row.put("name", req.getName());
        row.put("dosage", req.getDosage());
        row.put("usage", req.getUsage());
        row.put("timing", req.getTiming());
        data.updateMedication(medicationId, row);
    }

    public void deleteMedication(String elderId, String medicationId, String auth) {
        checkBinding(resolveFamilyUserId(auth), elderId);
        data.deleteMedication(medicationId);
    }

    public FamilyQrCodeDto qrcode(String elderId, String auth) {
        checkBinding(resolveFamilyUserId(auth), elderId);
        List<Map<String, Object>> rows = jdbc.queryForList("select * from qr_code where elder_id=? and status='ENABLED' order by created_at desc limit 1", elderId);
        if (rows.isEmpty()) throw new BizException(404, "二维码不存在，请联系管理员生成");
        Map<String, Object> row = rows.get(0);
        FamilyQrCodeDto dto = new FamilyQrCodeDto();
        dto.setToken(data.str(row.get("qr_token")));
        dto.setStatus("DISABLED".equalsIgnoreCase(data.str(row.get("status"))) ? "已停用" : "启用");
        dto.setCreatedAt(data.str(row.get("created_at")));
        dto.setPdfUrl("/api/nameplates/" + elderId + "/pdf");
        Map<String, Object> pendingReview = reviewRequestService.findPendingByQrCode(data.str(row.get("id")));
        if (pendingReview != null) {
            dto.setDisableReviewStatus(data.str(pendingReview.get("status")));
            dto.setDisableReviewId(data.str(pendingReview.get("id")));
            dto.setReviewMessage("停用申请审核中。审核通过前二维码仍保持启用。");
        }
        return dto;
    }

    public FamilyQrCodeDto requestDisableQrCode(String elderId, String auth) {
        String familyUserId = resolveFamilyUserId(auth);
        checkBinding(familyUserId, elderId);
        QrCodeEntity current = qrCodeService.findCurrentByElder(elderId);
        if (current == null) {
            throw new BizException(404, "当前老人暂无二维码");
        }
        String account = resolveFamilyOperator(auth);
        Map<String, Object> review = reviewRequestService.createQrDisableRequest(account, "FAMILY", elderId, current);
        FamilyQrCodeDto dto = qrcode(elderId, auth);
        dto.setDisableReviewStatus(data.str(review.get("status")));
        dto.setDisableReviewId(data.str(review.get("id")));
        dto.setReviewMessage("停用申请已提交，等待管理员审核。审核通过前二维码仍保持启用。");
        return dto;
    }

    public List<FamilyBindingAdminDto> listBindings() {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                select b.*, e.name_enc as elder_name_enc, e.archive_no from family_binding b
                join elder e on e.id=b.elder_id order by b.bound_at desc
                """);
        List<FamilyBindingAdminDto> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            FamilyBindingAdminDto dto = new FamilyBindingAdminDto();
            dto.setId(data.str(row.get("id")));
            dto.setFamilyName(data.dec(row.get("family_name_enc")));
            dto.setFamilyPhoneMasked(data.maskPhone(data.dec(row.get("family_phone_enc"))));
            dto.setRelationship(data.str(row.get("relationship")));
            dto.setElderName(data.dec(row.get("elder_name_enc")));
            dto.setElderArchiveNo(data.str(row.get("archive_no")));
            dto.setInvitationCode(data.str(row.get("invitation_code")));
            dto.setBoundAt(data.str(row.get("bound_at")));
            dto.setStatus(data.str(row.get("status")));
            result.add(dto);
        }
        return result;
    }

    public void unbind(String id) {
        jdbc.update("update family_binding set status='DISABLED' where id=?", id);
    }

    public String resolveFamilyOperator(String auth) {
        if (auth == null || !auth.startsWith("Bearer ")) {
            return "family-user";
        }
        return jwtTokenProvider.getSubject(auth.substring(7));
    }

    private String resolveFamilyUserId(String auth) {
        if (auth == null || !auth.startsWith("Bearer ")) {
            throw new BizException(401, "未登录或 Token 无效");
        }
        String phone = jwtTokenProvider.getSubject(auth.substring(7));
        Map<String, Object> user = data.one("select * from app_user where account=? and role='FAMILY' and status='ACTIVE'", phone);
        return data.str(user.get("id"));
    }

    private void checkBinding(String familyUserId, String elderId) {
        if (!data.isFamilyBound(familyUserId, elderId)) {
            throw new BizException(403, "无权访问该老人信息");
        }
    }
}
