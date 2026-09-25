package com.silverlink.care.module.smsrelay;

import com.silverlink.care.common.ApiResponse;
import com.silverlink.care.module.audit.AuditLogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class SmsRelayControllerTest {

    private SmsRelayService smsRelayService;
    private AuditLogService auditLogService;
    private SmsRelayController controller;

    @BeforeEach
    void setUp() {
        smsRelayService = mock(SmsRelayService.class);
        auditLogService = mock(AuditLogService.class);
        controller = new SmsRelayController(smsRelayService, auditLogService);
    }

    @Test
    void inboundValidatesAndHandles() {
        InboundSmsRequest req = new InboundSmsRequest();
        req.setDeviceId("device-1");
        req.setReceiverPhone("13800001111");
        req.setSenderPhone("15826216543");
        req.setMessageBody("SL ABCD");
        req.setReceivedAt(1748163600000L);
        req.setMessagePrefix("SL");

        var result = controller.inbound(req, "secret", "ts", "nonce", "sig");
        assertEquals(200, result.getCode());
        verify(smsRelayService).validateDeviceRequestSignature(eq("device-1"), eq("secret"), eq("/api/sms-relay/inbound"), eq("POST"), any(RelaySignatureHeaders.class), anyString());
        verify(smsRelayService).handleInbound(req, "secret");
    }

    @Test
    void heartbeatValidatesAndHandles() {
        HeartbeatRequest req = new HeartbeatRequest();
        req.setDeviceId("device-1");
        req.setTimestamp(1748163600000L);

        var result = controller.heartbeat(req, "secret", "ts", "nonce", "sig");
        assertEquals(200, result.getCode());
        verify(smsRelayService).validateDeviceRequestSignature(eq("device-1"), eq("secret"), eq("/api/sms-relay/heartbeat"), eq("POST"), any(RelaySignatureHeaders.class), anyString());
        verify(smsRelayService).handleHeartbeat(req, "secret");
    }

    @Test
    void getDeviceConfigValidatesAndReturns() {
        when(smsRelayService.getDeviceConfig("device-1", "secret")).thenReturn(new DeviceConfigDto());

        var result = controller.getDeviceConfig("device-1", "secret", "ts", "nonce", "sig");
        assertEquals(200, result.getCode());
        verify(smsRelayService).validateDeviceRequestSignature(eq("device-1"), eq("secret"), contains("/config"), eq("GET"), any(RelaySignatureHeaders.class), anyString());
    }

    @Test
    void listRecordsReturnsApiResponse() {
        when(smsRelayService.listRecords()).thenReturn(List.of());
        var result = controller.listRecords();
        assertEquals(200, result.getCode());
        assertTrue(result.getData().isEmpty());
    }

    @Test
    void listDevicesReturnsApiResponse() {
        when(smsRelayService.listDevices()).thenReturn(List.of());
        var result = controller.listDevices();
        assertEquals(200, result.getCode());
        assertTrue(result.getData().isEmpty());
    }

    @Test
    void updateDeviceReturnsUpdatedConfig() {
        DeviceConfigDto body = new DeviceConfigDto();
        when(smsRelayService.updateDevice("device-1", body)).thenReturn(body);

        var result = controller.updateDevice("device-1", body);
        assertEquals(200, result.getCode());
        verify(smsRelayService).updateDevice("device-1", body);
    }

    @Test
    void revokeDeviceReturnsUpdatedConfigAndRecordsAudit() {
        DeviceConfigDto revoked = new DeviceConfigDto();
        revoked.setDeviceId("device-1");
        revoked.setStatus("已吊销");
        when(smsRelayService.revokeDevice("device-1")).thenReturn(revoked);
        var request = mock(jakarta.servlet.http.HttpServletRequest.class);

        var result = controller.revokeDevice("device-1", request);

        assertEquals(200, result.getCode());
        assertEquals("已吊销", result.getData().getStatus());
        verify(auditLogService).record(eq(null), eq(request), eq("device-1"),
                eq("REVOKE_SMS_RELAY_DEVICE"), eq("SUCCESS"));
    }

    @Test
    void appCanCreateAndReadEnrollmentRequest() {
        SmsRelayEnrollmentRequest body = new SmsRelayEnrollmentRequest();
        body.setRequestId("request-1");
        SmsRelayEnrollmentStatusDto status = new SmsRelayEnrollmentStatusDto();
        status.setStatus("PENDING");
        when(smsRelayService.createEnrollmentRequest(body, "request-token")).thenReturn(status);
        when(smsRelayService.getEnrollmentStatus("request-1", "request-token")).thenReturn(status);

        assertEquals("PENDING", controller.createEnrollmentRequest(body, "request-token").getData().getStatus());
        assertEquals("PENDING", controller.getEnrollmentStatus("request-1", "request-token").getData().getStatus());
        verify(smsRelayService).createEnrollmentRequest(body, "request-token");
        verify(smsRelayService).getEnrollmentStatus("request-1", "request-token");
    }

    @Test
    void adminCanListApproveAndRejectEnrollmentRequests() {
        SmsRelayEnrollmentAdminDto approved = new SmsRelayEnrollmentAdminDto();
        approved.setStatus("APPROVED");
        when(smsRelayService.approveEnrollmentRequest("request-1")).thenReturn(approved);
        SmsRelayEnrollmentDecisionRequest decision = new SmsRelayEnrollmentDecisionRequest();
        decision.setReason("设备信息无法确认");
        SmsRelayEnrollmentAdminDto rejected = new SmsRelayEnrollmentAdminDto();
        rejected.setStatus("REJECTED");
        when(smsRelayService.rejectEnrollmentRequest("request-2", "设备信息无法确认")).thenReturn(rejected);

        assertTrue(controller.listEnrollmentRequests().getData().isEmpty());
        assertEquals("APPROVED", controller.approveEnrollmentRequest("request-1", mock(jakarta.servlet.http.HttpServletRequest.class)).getData().getStatus());
        assertEquals("REJECTED", controller.rejectEnrollmentRequest("request-2", decision, mock(jakarta.servlet.http.HttpServletRequest.class)).getData().getStatus());
        verify(auditLogService, times(2)).record(eq(null), any(jakarta.servlet.http.HttpServletRequest.class), anyString(), anyString(), eq("SUCCESS"));
    }

    @Test
    void listSessionsReturnsApiResponse() {
        when(smsRelayService.listVerificationSessions()).thenReturn(List.of());
        var result = controller.listSessions();
        assertEquals(200, result.getCode());
        assertTrue(result.getData().isEmpty());
    }
}
