package com.silverlink.care.module.qrcode;

import com.silverlink.care.module.audit.AuditLogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class QrCodeControllerTest {

    private QrCodeService qrCodeService;
    private AuditLogService auditLogService;
    private QrCodeController controller;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        qrCodeService = mock(QrCodeService.class);
        auditLogService = mock(AuditLogService.class);
        controller = new QrCodeController(qrCodeService, auditLogService);
        request = new MockHttpServletRequest();
    }

    @Test
    void coversQrCodeEndpoints() throws Exception {
        QrCodeEntity entity = new QrCodeEntity();
        entity.setId("qr-entity-1");
        entity.setQrId("qr-1");
        entity.setElderId("elder-1");
        entity.setArchiveNo("A-001");
        entity.setElderName("李奶奶");
        entity.setElderAge(78);
        entity.setElderPhone("13800000000");
        entity.setRelayDeviceId("device-1");
        entity.setRelayReceiverPhone("13900000000");
        entity.setStatus("ENABLED");
        entity.setCreatedAt("2026-05-26");
        entity.setQrToken("token-1");

        when(qrCodeService.listAll()).thenReturn(List.of(entity));
        when(qrCodeService.buildPublicUrl("token-1")).thenReturn("https://public/qr");
        assertEquals(1, controller.list().getData().size());

        QrCodeIssueResult issueResult = new QrCodeIssueResult(entity, "token-1", "https://public/qr");
        when(qrCodeService.generateWithToken("elder-1", "A-001")).thenReturn(issueResult);
        var create = controller.create(Map.of("elderId", "elder-1", "archiveNo", "A-001", "relayDeviceId", "device-1"), request);
        assertEquals("token-1", create.getData().get("token"));
        assertEquals("二维码不包含明文身份和健康信息，仅包含加密 token。", create.getData().get("securityNote"));
        verify(qrCodeService).bindRelayDevice("qr-entity-1", "device-1");

        assertEquals(200, controller.disable("qr-entity-1", request).getCode());

        when(qrCodeService.regenerateWithToken("qr-entity-1")).thenReturn(issueResult);
        assertEquals("https://public/qr", controller.regenerate("qr-entity-1", request).getData().get("url"));

        when(qrCodeService.regenerateWithToken("missing")).thenReturn(null);
        assertEquals(404, controller.regenerate("missing", request).getCode());

        QrCodeEntity bound = new QrCodeEntity();
        bound.setId("qr-entity-1");
        bound.setRelayDeviceId("device-2");
        bound.setRelayReceiverPhone("13700000000");
        when(qrCodeService.bindRelayDevice("qr-entity-1", "device-2")).thenReturn(bound);
        var relayBind = controller.bindRelayDevice("qr-entity-1", Map.of("relayDeviceId", "device-2"), request);
        assertEquals("device-2", relayBind.getData().get("relayDeviceId"));
        assertEquals("13700000000", relayBind.getData().get("relayReceiverPhone"));
    }
}
