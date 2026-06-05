package com.silverlink.care.module.volunteer;

import com.silverlink.care.common.BizException;
import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import com.silverlink.care.module.qrcode.QrCodeEntity;
import com.silverlink.care.module.qrcode.QrCodeIssueResult;
import com.silverlink.care.module.qrcode.QrCodeService;
import com.silverlink.care.module.review.AdminReviewRequestService;
import com.silverlink.care.security.JwtTokenProvider;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class VolunteerService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final SilverLinkDataService data;
    private final QrCodeService qrCodeService;
    private final JwtTokenProvider jwtTokenProvider;
    private final AdminReviewRequestService reviewRequestService;

    public VolunteerService(SilverLinkDataService data, QrCodeService qrCodeService, JwtTokenProvider jwtTokenProvider, AdminReviewRequestService reviewRequestService) {
        this.data = data;
        this.qrCodeService = qrCodeService;
        this.jwtTokenProvider = jwtTokenProvider;
        this.reviewRequestService = reviewRequestService;
    }

    public List<Map<String, Object>> getMyElders(String account) {
        return data.assignedElders(account);
    }

    public String createMyElder(String account, Map<String, Object> body) {
        return data.createElderForVolunteer(account, body);
    }

    public Map<String, Object> getMyProfile(String account) {
        return data.volunteerProfile(account);
    }

    public Map<String, Object> updateMyProfile(String account, Map<String, Object> body) {
        return data.updateVolunteerProfile(account, body);
    }

    public List<Map<String, String>> getMyElderMedications(String account, String elderId) {
        findMyElder(account, elderId);
        return data.medications(elderId);
    }

    public Map<String, String> registerWithInvitation(VolunteerRegisterRequest req) {
        String invitationCode = req.getInvitationCode() == null ? "" : req.getInvitationCode().trim().toUpperCase();
        String account = req.getAccount() == null ? "" : req.getAccount().trim();
        String password = req.getPassword() == null ? "" : req.getPassword().trim();
        String name = req.getName() == null ? "" : req.getName().trim();
        String phone = req.getPhone() == null ? "" : req.getPhone().trim();

        if (invitationCode.isBlank()) {
            throw new BizException(400, "请输入邀请码");
        }
        if (account.isBlank()) {
            throw new BizException(400, "请输入账号");
        }
        if (password.isBlank()) {
            throw new BizException(400, "请输入密码");
        }
        if (name.isBlank()) {
            throw new BizException(400, "请输入姓名");
        }

        Map<String, Object> invitation = data.one("select * from invitation where code=?", invitationCode);
        validateInvitation(invitation);

        if (data.findUser(account, "VOLUNTEER").isPresent()) {
            throw new BizException(400, "该账号已存在，请更换后重试");
        }

        String elderId = data.str(invitation.get("elder_id"));
        String volunteerId = data.createVolunteer(Map.of(
                "account", account,
                "password", password,
                "name", name,
                "phone", phone,
                "elderIds", List.of(elderId)
        ));

        Map<String, String> result = new LinkedHashMap<>();
        result.put("token", jwtTokenProvider.generateToken(account, "VOLUNTEER", 86400000L));
        result.put("name", name);
        result.put("account", account);
        result.put("volunteerId", volunteerId);
        result.put("invitationCode", invitationCode);
        return result;
    }

    public Map<String, Object> getMyElderQrCode(String account, String elderId) throws Exception {
        Map<String, Object> elder = findMyElder(account, elderId);
        QrCodeEntity current = qrCodeService.findCurrentByElder(elderId);
        if (current == null || current.getQrToken() == null || current.getQrToken().isBlank()) {
            QrCodeIssueResult issued = qrCodeService.generateWithToken(elderId, String.valueOf(elder.getOrDefault("archiveNo", "")));
            current = issued.getEntity();
        }
        return toQrManageMap(current, elder);
    }

    public Map<String, Object> regenerateMyElderQrCode(String account, String elderId) throws Exception {
        Map<String, Object> elder = findMyElder(account, elderId);
        QrCodeEntity current = qrCodeService.findCurrentByElder(elderId);
        if (current == null) {
            QrCodeIssueResult issued = qrCodeService.generateWithToken(elderId, String.valueOf(elder.getOrDefault("archiveNo", "")));
            return toQrManageMap(issued.getEntity(), elder);
        }
        QrCodeIssueResult issued = qrCodeService.regenerateWithToken(current.getId());
        return toQrManageMap(issued.getEntity(), elder);
    }

    public Map<String, Object> requestDisableMyElderQrCode(String account, String elderId) {
        Map<String, Object> elder = findMyElder(account, elderId);
        QrCodeEntity current = qrCodeService.findCurrentByElder(elderId);
        if (current == null) {
            throw new BizException(404, "当前老人暂无二维码");
        }
        Map<String, Object> review = reviewRequestService.createQrDisableRequest(account, "VOLUNTEER", elderId, current);
        Map<String, Object> result = toQrManageMap(current, elder);
        result.put("disableReviewStatus", review.get("status"));
        result.put("disableReviewId", review.get("id"));
        result.put("reviewMessage", "停用申请已提交，等待管理员审核。审核通过前二维码仍保持启用。");
        return result;
    }

    private Map<String, Object> findMyElder(String account, String elderId) {
        return getMyElders(account).stream()
                .filter(row -> elderId.equals(String.valueOf(row.get("id"))))
                .findFirst()
                .orElseThrow(() -> new BizException(403, "无权访问该老人档案"));
    }

    private void validateInvitation(Map<String, Object> invitation) {
        if (!"ACTIVE".equalsIgnoreCase(data.str(invitation.get("status")))) {
            throw new BizException(400, "邀请码不可用");
        }
        if (data.intValue(invitation.get("used_count")) >= data.intValue(invitation.get("max_uses"))) {
            throw new BizException(400, "邀请码已用完");
        }
        String expiresAt = data.str(invitation.get("expires_at"));
        if (!expiresAt.isBlank()) {
            LocalDateTime expireTime = LocalDateTime.parse(expiresAt, FMT);
            if (expireTime.isBefore(LocalDateTime.now())) {
                throw new BizException(400, "邀请码已过期");
            }
        }
    }

    private Map<String, Object> toQrManageMap(QrCodeEntity entity, Map<String, Object> elder) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", entity.getId());
        map.put("qrId", entity.getQrId());
        map.put("elderId", entity.getElderId());
        map.put("archiveNo", elder.getOrDefault("archiveNo", ""));
        map.put("elderName", elder.getOrDefault("name", ""));
        map.put("elderAge", elder.getOrDefault("age", 0));
        map.put("elderPhone", elder.getOrDefault("emergencyContactPhone", ""));
        map.put("status", switch (String.valueOf(entity.getStatus())) {
            case "DISABLED" -> "已停用";
            case "REGENERATED" -> "已重新生成";
            default -> "启用";
        });
        map.put("createdAt", entity.getCreatedAt());
        map.put("disabledAt", entity.getDisabledAt());
        map.put("token", entity.getQrToken());
        String publicUrl = entity.getQrToken() == null || entity.getQrToken().isBlank() ? "" : qrCodeService.buildPublicUrl(entity.getQrToken());
        map.put("url", publicUrl);
        map.put("publicUrl", publicUrl);
        map.put("qrImageBase64", entity.getQrToken() == null || entity.getQrToken().isBlank() ? "" : qrCodeService.renderPublicQrImageBase64(entity.getQrToken()));
        map.put("qrImageUrl", entity.getQrToken() == null || entity.getQrToken().isBlank() ? "" : qrCodeService.buildPublicQrImageUrl(entity.getQrToken()));
        map.put("securityNote", "二维码不包含明文身份与健康信息，仅保存加密访问令牌。");
        Map<String, Object> pendingReview = reviewRequestService.findPendingByQrCode(entity.getId());
        if (pendingReview != null) {
            map.put("disableReviewStatus", pendingReview.get("status"));
            map.put("disableReviewId", pendingReview.get("id"));
            map.put("reviewMessage", "停用申请审核中。审核通过前二维码仍保持启用。");
        }
        return map;
    }
}
