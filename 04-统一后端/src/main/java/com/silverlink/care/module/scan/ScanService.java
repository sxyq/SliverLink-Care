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

    public Map<String, Object> getArchive(String elderId) {
        return data.health(elderId);
    }

    public List<Map<String, String>> getMedications(String elderId) {
        return data.medications(elderId);
    }

    public List<Map<String, Object>> getScales(String elderId) {
        return data.scales(elderId);
    }

    public ScanVerificationSessionDto startVerificationSession(String elderId, String target) {
        return smsRelayService.createScanVerificationSession(elderId, target);
    }

    public ScanVerificationStatusDto getVerificationStatus(String sessionId) {
        return smsRelayService.getScanVerificationStatus(sessionId);
    }
}
