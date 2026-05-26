package com.silverlink.care.module.smsrelay;

import com.silverlink.care.common.ApiResponse;
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
    private SmsRelayController controller;

    @BeforeEach
    void setUp() {
        smsRelayService = mock(SmsRelayService.class);
        controller = new SmsRelayController(smsRelayService);
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
    void listSessionsReturnsApiResponse() {
        when(smsRelayService.listVerificationSessions()).thenReturn(List.of());
        var result = controller.listSessions();
        assertEquals(200, result.getCode());
        assertTrue(result.getData().isEmpty());
    }
}
