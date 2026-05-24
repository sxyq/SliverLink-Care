package com.silverlink.care.module.scan;

import com.silverlink.care.module.qrcode.QrCodeEntity;
import com.silverlink.care.module.qrcode.QrCodeService;
import com.silverlink.care.module.smsrelay.SmsRelayService;
import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class ScanService {

    private final QrCodeService qrCodeService;
    private final SilverLinkDataService data;
    private final SmsRelayService smsRelayService;

    public ScanService(QrCodeService qrCodeService, SilverLinkDataService data, SmsRelayService smsRelayService) {
        this.qrCodeService = qrCodeService;
        this.data = data;
        this.smsRelayService = smsRelayService;
    }

    public Map<String, Object> resolve(String token) throws Exception {
        QrCodeEntity entity = qrCodeService.resolve(token);
        if (entity == null || !"ENABLED".equals(entity.getStatus())) {
            throw new RuntimeException("二维码无效或已停用");
        }
        Map<String, Object> result = new LinkedHashMap<>(data.scanBasic(entity.getElderId()));
        result.put("elderId", entity.getElderId());
        return result;
    }

    public Map<String, Object> getArchive(String elderId, String sessionId) {
        smsRelayService.authorizeVerifiedSession(sessionId, elderId, "health");
        return data.health(elderId);
    }

    public Map<String, Object> getVerifiedBasicInfo(String elderId, String sessionId) {
        smsRelayService.authorizeVerifiedSession(sessionId, elderId, "health");
        return data.elderDetail(elderId, false);
    }

    public List<Map<String, String>> getMedications(String elderId, String sessionId) {
        smsRelayService.authorizeVerifiedSession(sessionId, elderId, "health");
        return data.medications(elderId);
    }

    public List<Map<String, Object>> getScales(String elderId, String sessionId) {
        smsRelayService.authorizeVerifiedSession(sessionId, elderId, "health");
        return data.scales(elderId);
    }

    public ScanVerificationSessionDto startVerificationSession(String elderId, String target) {
        QrCodeEntity currentQr = qrCodeService.findCurrentByElder(elderId);
        String relayDeviceId = currentQr == null ? "" : currentQr.getRelayDeviceId();
        return smsRelayService.createScanVerificationSession(elderId, target, relayDeviceId);
    }

    public ScanVerificationStatusDto getVerificationStatus(String sessionId) {
        return smsRelayService.getScanVerificationStatus(sessionId);
    }

    public ScanVerificationStatusDto verifyByIdentity(String elderId, String target, String visitorName, String visitorPhone, String visitorIdCard) {
        return smsRelayService.createIdentityVerificationSession(elderId, target, visitorName, visitorPhone, visitorIdCard);
    }

    public SmsRelayService.VerifiedSessionContext authorizeSession(String sessionId, String elderId, String target) {
        return smsRelayService.authorizeVerifiedSession(sessionId, elderId, target);
    }

    public Map<String, Object> getArchiveData(String elderId) {
        return data.health(elderId);
    }

    public Map<String, Object> getVerifiedBasicInfoData(String elderId) {
        return data.elderDetail(elderId, false);
    }

    public List<Map<String, String>> getMedicationsData(String elderId) {
        return data.medications(elderId);
    }

    public List<Map<String, Object>> getScalesData(String elderId) {
        return data.scales(elderId);
    }
}
