package com.silverlink.care.module.volunteer;

import com.silverlink.care.common.BizException;
import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import com.silverlink.care.module.qrcode.QrCodeEntity;
import com.silverlink.care.module.qrcode.QrCodeIssueResult;
import com.silverlink.care.module.qrcode.QrCodeService;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class VolunteerService {

    private final SilverLinkDataService data;
    private final QrCodeService qrCodeService;

    public VolunteerService(SilverLinkDataService data, QrCodeService qrCodeService) {
        this.data = data;
        this.qrCodeService = qrCodeService;
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

    public Map<String, Object> disableMyElderQrCode(String account, String elderId) {
        Map<String, Object> elder = findMyElder(account, elderId);
        QrCodeEntity current = qrCodeService.findCurrentByElder(elderId);
        if (current == null) {
            throw new BizException(404, "当前老人暂无二维码");
        }
        qrCodeService.disable(current.getId());
        QrCodeEntity disabled = qrCodeService.findCurrentByElder(elderId);
        return toQrManageMap(disabled, elder);
    }

    private Map<String, Object> findMyElder(String account, String elderId) {
        return getMyElders(account).stream()
                .filter(row -> elderId.equals(String.valueOf(row.get("id"))))
                .findFirst()
                .orElseThrow(() -> new BizException(403, "无权访问该老人档案"));
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
        map.put("url", entity.getQrToken() == null || entity.getQrToken().isBlank() ? "" : qrCodeService.buildPublicUrl(entity.getQrToken()));
        map.put("securityNote", "二维码不包含明文身份与健康信息，仅保存加密访问令牌。");
        return map;
    }
}
