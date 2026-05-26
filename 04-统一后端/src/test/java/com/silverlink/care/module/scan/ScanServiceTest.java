package com.silverlink.care.module.scan;

import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import com.silverlink.care.module.qrcode.QrCodeEntity;
import com.silverlink.care.module.qrcode.QrCodeService;
import com.silverlink.care.module.smsrelay.SmsRelayService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ScanServiceTest {

    private QrCodeService qrCodeService;
    private SilverLinkDataService data;
    private SmsRelayService smsRelayService;
    private ScanService service;

    @BeforeEach
    void setUp() {
        qrCodeService = mock(QrCodeService.class);
        data = mock(SilverLinkDataService.class);
        smsRelayService = mock(SmsRelayService.class);
        service = new ScanService(qrCodeService, data, smsRelayService);
    }

    @Test
    void resolveReturnsScanBasicForEnabledQrCode() throws Exception {
        QrCodeEntity entity = new QrCodeEntity();
        entity.setElderId("elder-1");
        entity.setStatus("ENABLED");

        when(qrCodeService.resolve("token-1")).thenReturn(entity);
        when(data.scanBasic("elder-1")).thenReturn(Map.of("archiveNo", "A-001", "name", "李奶奶"));

        Map<String, Object> result = service.resolve("token-1");

        assertEquals("elder-1", result.get("elderId"));
        assertEquals("A-001", result.get("archiveNo"));
        assertEquals("李奶奶", result.get("name"));
    }

    @Test
    void resolveRejectsMissingOrDisabledQrCode() throws Exception {
        when(qrCodeService.resolve("missing")).thenReturn(null);
        assertThrows(RuntimeException.class, () -> service.resolve("missing"));

        QrCodeEntity disabled = new QrCodeEntity();
        disabled.setStatus("DISABLED");
        when(qrCodeService.resolve("disabled")).thenReturn(disabled);
        assertThrows(RuntimeException.class, () -> service.resolve("disabled"));
    }

    @Test
    void delegatesProtectedReadAndVerificationFlows() {
        Map<String, Object> archive = Map.of("summary", "archive");
        Map<String, Object> basicInfo = Map.of("name", "李奶奶");
        List<Map<String, String>> medications = List.of(Map.of("name", "阿司匹林"));
        List<Map<String, Object>> scales = List.of(Map.of("scaleName", "PHQ-9"));

        when(data.health("elder-1")).thenReturn(archive);
        when(data.elderDetail("elder-1", false)).thenReturn(basicInfo);
        when(data.medications("elder-1")).thenReturn(medications);
        when(data.scales("elder-1")).thenReturn(scales);

        ScanVerificationStatusDto status = new ScanVerificationStatusDto();
        status.setSessionId("session-1");
        when(smsRelayService.getScanVerificationStatus("session-1")).thenReturn(status);
        when(smsRelayService.createIdentityVerificationSession("elder-1", "health", "张三", "13800000000", "500101199001010000"))
                .thenReturn(status);

        SmsRelayService.VerifiedSessionContext context = new SmsRelayService.VerifiedSessionContext();
        context.setSessionId("session-1");
        context.setElderId("elder-1");
        context.setTarget("health");
        when(smsRelayService.authorizeVerifiedSession("session-1", "elder-1", "health")).thenReturn(context);

        QrCodeEntity boundQr = new QrCodeEntity();
        boundQr.setRelayDeviceId("device-1");
        ScanVerificationSessionDto relaySession = new ScanVerificationSessionDto();
        relaySession.setSessionId("relay-session");
        ScanVerificationSessionDto noRelaySession = new ScanVerificationSessionDto();
        noRelaySession.setSessionId("plain-session");
        when(qrCodeService.findCurrentByElder("elder-1")).thenReturn(boundQr);
        when(qrCodeService.findCurrentByElder("elder-2")).thenReturn(null);
        when(smsRelayService.createScanVerificationSession("elder-1", "health", "device-1")).thenReturn(relaySession);
        when(smsRelayService.createScanVerificationSession("elder-2", "health", "")).thenReturn(noRelaySession);

        assertSame(archive, service.getArchive("elder-1", "session-1"));
        assertSame(basicInfo, service.getVerifiedBasicInfo("elder-1", "session-1"));
        assertSame(medications, service.getMedications("elder-1", "session-1"));
        assertSame(scales, service.getScales("elder-1", "session-1"));
        assertSame(archive, service.getArchiveData("elder-1"));
        assertSame(basicInfo, service.getVerifiedBasicInfoData("elder-1"));
        assertSame(medications, service.getMedicationsData("elder-1"));
        assertSame(scales, service.getScalesData("elder-1"));
        assertSame(status, service.getVerificationStatus("session-1"));
        assertSame(status, service.verifyByIdentity("elder-1", "health", "张三", "13800000000", "500101199001010000"));
        assertSame(context, service.authorizeSession("session-1", "elder-1", "health"));
        assertEquals("relay-session", service.startVerificationSession("elder-1", "health").getSessionId());
        assertEquals("plain-session", service.startVerificationSession("elder-2", "health").getSessionId());
    }
}
