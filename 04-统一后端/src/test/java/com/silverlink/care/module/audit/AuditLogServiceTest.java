package com.silverlink.care.module.audit;

import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class AuditLogServiceTest {

    private SilverLinkDataService data;
    private AuditLogService service;

    @BeforeEach
    void setUp() {
        data = mock(SilverLinkDataService.class);
        service = new AuditLogService(data);
        when(data.str(any())).thenAnswer(inv -> {
            Object arg = inv.getArgument(0);
            return arg == null ? "" : arg.toString();
        });
    }

    @Test
    void listAllReturnsEntities() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", "log-1");
        row.put("time", "2026-05-25");
        row.put("operator", "admin");
        row.put("role", "SYSTEM_ADMIN");
        row.put("sourceIp", "127.0.0.1");
        row.put("target", "elder-1");
        row.put("action", "LOGIN");
        row.put("verificationMethod", "");
        row.put("visitorName", "");
        row.put("visitorPhone", "");
        row.put("visitorPhoneMasked", "");
        row.put("visitorIdCard", "");
        row.put("visitorIdCardMasked", "");
        row.put("result", "SUCCESS");
        row.put("failReason", "");
        row.put("requestId", "");
        when(data.auditLogs(null, null, null)).thenReturn(List.of(row));

        var result = service.listAll();
        assertEquals(1, result.size());
        assertEquals("admin", result.get(0).getOperator());
        assertEquals("SUCCESS", result.get(0).getResult());
    }

    @Test
    void filterDelegatesToDataLayer() {
        when(data.auditLogs("admin", "LOGIN", null)).thenReturn(Collections.emptyList());
        var result = service.filter("admin", "LOGIN", null);
        assertTrue(result.isEmpty());
    }

    @Test
    void recordWithRawParametersDelegatesToData() {
        service.record("admin", "SYSTEM_ADMIN", "127.0.0.1", "elder-1", "VIEW", "SUCCESS", null, "req-1");
        verify(data).recordAudit("admin", "SYSTEM_ADMIN", "127.0.0.1", "elder-1", "VIEW", "SUCCESS", null, "req-1");
    }

    @Test
    void recordWithExtendedParametersDelegatesToData() {
        service.record("admin", "SYSTEM_ADMIN", "127.0.0.1", "elder-1", "VIEW", "SUCCESS", null, "req-1", "SMS", "王丽", "13800001111", "500102200212180836");
        verify(data).recordAudit("admin", "SYSTEM_ADMIN", "127.0.0.1", "elder-1", "VIEW", "SUCCESS", null, "req-1", "SMS", "王丽", "13800001111", "500102200212180836");
    }

    @Test
    void recordWithHttpRequestResolvesIp() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("192.168.1.1");
        service.record("admin", "SYSTEM_ADMIN", request, "elder-1", "VIEW", "SUCCESS", null, "req-1");
        verify(data).recordAudit(eq("admin"), eq("SYSTEM_ADMIN"), eq("192.168.1.1"), eq("elder-1"), eq("VIEW"), eq("SUCCESS"), any(), eq("req-1"));
    }

    @Test
    void resolveClientIpChecksProxyHeaders() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Forwarded-For", "10.0.0.1, 172.16.0.1");
        request.setRemoteAddr("192.168.1.1");
        assertEquals("10.0.0.1", service.resolveClientIp(request));
    }

    @Test
    void resolveClientIpFallsBackToRemoteAddr() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("192.168.1.1");
        assertEquals("192.168.1.1", service.resolveClientIp(request));
    }

    @Test
    void resolveClientIpReturnsEmptyForNullRequest() {
        assertEquals("", service.resolveClientIp(null));
    }

    @Test
    void resolveClientIpSkipsUnknownHeaderValues() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Forwarded-For", "unknown");
        request.setRemoteAddr("192.168.1.1");
        assertEquals("192.168.1.1", service.resolveClientIp(request));
    }

    @Test
    void operatorOfReturnsNameFromAuthentication() {
        var auth = new TestingAuthenticationToken("admin", "pwd");
        assertEquals("admin", service.operatorOf(auth));
    }

    @Test
    void operatorOfReturnsAnonymousForNull() {
        assertEquals("anonymous", service.operatorOf(null));
    }

    @Test
    void roleOfExtractsRoleFromAuthentication() {
        var auth = new TestingAuthenticationToken("admin", "pwd", List.of(new SimpleGrantedAuthority("ROLE_SYSTEM_ADMIN")));
        assertEquals("SYSTEM_ADMIN", service.roleOf(auth));
    }

    @Test
    void roleOfReturnsUnknownForNull() {
        assertEquals("UNKNOWN", service.roleOf(null));
    }

    @Test
    void recordWithAuthenticationAndHttpRequest() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.1");
        var auth = new TestingAuthenticationToken("admin", "pwd", List.of(new SimpleGrantedAuthority("ROLE_SYSTEM_ADMIN")));
        service.record(auth, request, "elder-1", "VIEW", "SUCCESS");
        verify(data).recordAudit(eq("admin"), eq("SYSTEM_ADMIN"), eq("10.0.0.1"), eq("elder-1"), eq("VIEW"), eq("SUCCESS"), any(), any());
    }

    @Test
    void recordWithAuthenticationAndIp() {
        var auth = new TestingAuthenticationToken("admin", "pwd", List.of(new SimpleGrantedAuthority("ROLE_VOLUNTEER")));
        service.record(auth, "10.0.0.1", "elder-1", "EDIT", "SUCCESS");
        verify(data).recordAudit(eq("admin"), eq("VOLUNTEER"), eq("10.0.0.1"), eq("elder-1"), eq("EDIT"), eq("SUCCESS"), any(), any());
    }

    @Test
    void recordWithAuthenticationAndRequestAndExtendedParams() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.1");
        var auth = new TestingAuthenticationToken("admin", "pwd", List.of(new SimpleGrantedAuthority("ROLE_SYSTEM_ADMIN")));
        service.record("admin", "SYSTEM_ADMIN", request, "elder-1", "VIEW", "SUCCESS", null, "req-1", "SMS", "王丽", "13800001111", "500102200212180836");
        verify(data).recordAudit(eq("admin"), eq("SYSTEM_ADMIN"), eq("10.0.0.1"), eq("elder-1"), eq("VIEW"), eq("SUCCESS"), any(), eq("req-1"), eq("SMS"), eq("王丽"), eq("13800001111"), eq("500102200212180836"));
    }
}
