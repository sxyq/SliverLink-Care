package com.silverlink.care.module.scan;

import com.silverlink.care.module.audit.AuditLogService;
import com.silverlink.care.module.smsrelay.SmsRelayService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ScanControllerTest {

    private ScanService scanService;
    private AuditLogService auditLogService;
    private WeChatAuthService weChatAuthService;
    private ScanController controller;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        scanService = mock(ScanService.class);
        auditLogService = mock(AuditLogService.class);
        weChatAuthService = mock(WeChatAuthService.class);
        controller = new ScanController(scanService, auditLogService, weChatAuthService);
        request = new MockHttpServletRequest();
    }

    @Test
    void coversResolveAuthAndVerificationFlow() throws Exception {
        when(scanService.resolve("token-1")).thenReturn(Map.of("elderId", "elder-1", "archiveNo", "A-001"));
        assertEquals("elder-1", controller.resolve(Map.of("token", "token-1"), request).getData().get("elderId"));

        when(weChatAuthService.resolveOpenId("wx-code")).thenReturn("openid-1");
        assertEquals("openid-1", controller.authWechat(Map.of("code", "wx-code")).getData().get("openid"));

        ScanVerificationSessionDto sessionDto = new ScanVerificationSessionDto();
        sessionDto.setSessionId("session-1");
        sessionDto.setElderId("elder-1");
        when(scanService.startVerificationSession("elder-1", "health")).thenReturn(sessionDto);
        assertEquals("session-1", controller.startVerification(Map.of("elderId", "elder-1", "target", "health"), request).getData().getSessionId());

        ScanVerificationStatusDto statusDto = new ScanVerificationStatusDto();
        statusDto.setSessionId("session-1");
        statusDto.setElderId("elder-1");
        statusDto.setStatus("VERIFIED");
        statusDto.setVerified(true);
        when(scanService.getVerificationStatus("session-1")).thenReturn(statusDto);
        assertEquals(true, controller.verificationStatus("session-1", request).getData().isVerified());

        when(scanService.verifyByIdentity("elder-1", "health", "张三", "13800000000", "500101199001010000")).thenReturn(statusDto);
        assertEquals("session-1", controller.verifyIdentity(Map.of(
                "elderId", "elder-1",
                "target", "health",
                "name", "张三",
                "phone", "13800000000",
                "idCard", "500101199001010000"
        ), request).getData().getSessionId());

        when(scanService.verifyByIdentity("elder-1", "health", "", "", "")).thenThrow(new RuntimeException("身份不匹配"));
        assertThrows(RuntimeException.class, () -> controller.verifyIdentity(Map.of(
                "elderId", "elder-1",
                "target", "health",
                "name", "",
                "phone", "",
                "idCard", ""
        ), request));
    }

    @Test
    void coversProtectedReadEndpoints() {
        SmsRelayService.VerifiedSessionContext context = new SmsRelayService.VerifiedSessionContext();
        context.setSessionId("session-1");
        context.setElderId("elder-1");
        context.setTarget("health");
        context.setVerificationMethod("SMS");
        context.setVisitorName("张三");
        context.setVisitorPhone("13800000000");
        context.setVisitorIdCard("500101199001010000");
        context.setSenderPhoneMasked("138****0000");

        when(scanService.authorizeSession("session-1", "elder-1", "health")).thenReturn(context);
        when(scanService.getArchiveData("elder-1")).thenReturn(Map.of("summary", "archive"));
        when(scanService.getVerifiedBasicInfoData("elder-1")).thenReturn(Map.of("name", "李奶奶"));
        when(scanService.getMedicationsData("elder-1")).thenReturn(List.of(Map.of("name", "阿司匹林")));
        when(scanService.getScalesData("elder-1")).thenReturn(List.of(Map.of("scaleName", "PHQ-9")));

        assertEquals("archive", controller.archive("elder-1", "session-1", request).getData().get("summary"));
        assertEquals("李奶奶", controller.basicInfo("elder-1", "session-1", request).getData().get("name"));
        assertEquals(1, controller.medications("elder-1", "session-1", request).getData().size());
        assertEquals(1, controller.scales("elder-1", "session-1", request).getData().size());
    }
}
