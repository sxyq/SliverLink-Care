package com.silverlink.care.module.sms;

import com.silverlink.care.common.ApiResponse;
import com.silverlink.care.module.audit.AuditLogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class SmsControllerTest {

    private SmsService smsService;
    private AuditLogService auditLogService;
    private SmsController controller;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        smsService = mock(SmsService.class);
        auditLogService = mock(AuditLogService.class);
        controller = new SmsController(smsService, auditLogService);
        request = new MockHttpServletRequest();
    }

    @Test
    void sendReturnsMaskedPhoneOnSuccess() {
        when(smsService.sendCode("13800001111", "SCAN")).thenReturn("123456");

        var result = controller.send(Map.of("phone", "13800001111"), request);
        assertEquals(200, result.getCode());
        assertEquals("138****1111", result.getData().get("phone"));
        verify(auditLogService).record(eq("扫码用户"), eq("SCAN"), eq(request), eq("138****1111"), eq("SMS_SEND"), eq("SUCCESS"), any(), any());
    }

    @Test
    void sendReturns429OnRateLimit() {
        when(smsService.sendCode("13800001111", "SCAN")).thenThrow(new RuntimeException("发送过于频繁，请稍后再试"));

        var result = controller.send(Map.of("phone", "13800001111"), request);
        assertEquals(429, result.getCode());
        verify(auditLogService).record(eq("扫码用户"), eq("SCAN"), eq(request), eq("138****1111"), eq("SMS_SEND"), eq("FAIL"), any(), any());
    }

    @Test
    void sendUsesCustomScene() {
        when(smsService.sendCode("13800002222", "FAMILY")).thenReturn("654321");

        var result = controller.send(Map.of("phone", "13800002222", "scene", "FAMILY"), request);
        assertEquals(200, result.getCode());
        verify(smsService).sendCode("13800002222", "FAMILY");
    }

    @Test
    void verifyReturnsTrueOnSuccess() {
        when(smsService.verify("13800001111", "123456", "SCAN")).thenReturn(true);

        var result = controller.verify(Map.of("phone", "13800001111", "code", "123456"), request);
        assertEquals(200, result.getCode());
        assertTrue(result.getData().get("verified"));
        verify(auditLogService).record(eq("扫码用户"), eq("SCAN"), eq(request), eq("138****1111"), eq("SMS_VERIFY"), eq("SUCCESS"), any(), any());
    }

    @Test
    void verifyReturnsFalseOnFailure() {
        when(smsService.verify("13800001111", "000000", "SCAN")).thenReturn(false);

        var result = controller.verify(Map.of("phone", "13800001111", "code", "000000"), request);
        assertEquals(200, result.getCode());
        assertFalse(result.getData().get("verified"));
        verify(auditLogService).record(eq("扫码用户"), eq("SCAN"), eq(request), eq("138****1111"), eq("SMS_VERIFY"), eq("FAIL"), any(), any());
    }

    @Test
    void verifyUsesCustomScene() {
        when(smsService.verify("13800001111", "123456", "FAMILY")).thenReturn(true);

        controller.verify(Map.of("phone", "13800001111", "code", "123456", "scene", "FAMILY"), request);
        verify(smsService).verify("13800001111", "123456", "FAMILY");
    }

    @Test
    void maskPhoneHandlesNullAndShortPhone() {
        var result = controller.send(Map.of("phone", "123"), request);
        assertEquals(200, result.getCode());
    }
}
