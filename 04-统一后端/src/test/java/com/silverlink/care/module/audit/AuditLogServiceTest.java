package com.silverlink.care.module.audit;

import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.*;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

class AuditLogServiceTest {

    private SilverLinkDataService data;
    private AuditLogService service;

    @BeforeEach
    void setUp() {
        data = mock(SilverLinkDataService.class);
        service = new AuditLogService(data);
        ReflectionTestUtils.setField(service, "batchSize", 1);
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
        SilverLinkDataService.AuditLogWrite write = captureSingleWrite(() ->
                service.record("admin", "SYSTEM_ADMIN", "127.0.0.1", "elder-1", "VIEW", "SUCCESS", null, "req-1"));
        assertFalse(write.id().isBlank());
        assertEquals("admin", write.operator());
        assertEquals("SYSTEM_ADMIN", write.role());
        assertEquals("127.0.0.1", write.ip());
        assertEquals("elder-1", write.target());
        assertEquals("VIEW", write.action());
        assertEquals("SUCCESS", write.result());
        assertNull(write.failReason());
        assertEquals("req-1", write.requestId());
    }

    @Test
    void recordWithExtendedParametersDelegatesToData() {
        SilverLinkDataService.AuditLogWrite write = captureSingleWrite(() ->
                service.record("admin", "SYSTEM_ADMIN", "127.0.0.1", "elder-1", "VIEW", "SUCCESS", null, "req-1", "SMS", "王丽", "13800001111", "500102200212180836"));
        assertEquals("SMS", write.verificationMethod());
        assertEquals("王丽", write.visitorName());
        assertEquals("13800001111", write.visitorPhone());
        assertEquals("500102200212180836", write.visitorIdCard());
    }

    @Test
    void recordWithHttpRequestResolvesIp() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("192.168.1.1");
        SilverLinkDataService.AuditLogWrite write = captureSingleWrite(() ->
                service.record("admin", "SYSTEM_ADMIN", request, "elder-1", "VIEW", "SUCCESS", null, "req-1"));
        assertEquals("192.168.1.1", write.ip());
        assertEquals("req-1", write.requestId());
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
        SilverLinkDataService.AuditLogWrite write = captureSingleWrite(() ->
                service.record(auth, request, "elder-1", "VIEW", "SUCCESS"));
        assertEquals("admin", write.operator());
        assertEquals("SYSTEM_ADMIN", write.role());
        assertEquals("10.0.0.1", write.ip());
        assertEquals("elder-1", write.target());
    }

    @Test
    void recordWithAuthenticationAndIp() {
        var auth = new TestingAuthenticationToken("admin", "pwd", List.of(new SimpleGrantedAuthority("ROLE_VOLUNTEER")));
        SilverLinkDataService.AuditLogWrite write = captureSingleWrite(() ->
                service.record(auth, "10.0.0.1", "elder-1", "EDIT", "SUCCESS"));
        assertEquals("VOLUNTEER", write.role());
        assertEquals("EDIT", write.action());
    }

    @Test
    void recordWithAuthenticationAndRequestAndExtendedParams() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.1");
        SilverLinkDataService.AuditLogWrite write = captureSingleWrite(() ->
                service.record("admin", "SYSTEM_ADMIN", request, "elder-1", "VIEW", "SUCCESS", null, "req-1", "SMS", "王丽", "13800001111", "500102200212180836"));
        assertEquals("10.0.0.1", write.ip());
        assertEquals("SMS", write.verificationMethod());
        assertEquals("王丽", write.visitorName());
        assertEquals("13800001111", write.visitorPhone());
        assertEquals("500102200212180836", write.visitorIdCard());
    }

    @Test
    void flushPendingScheduledSkipsEmptyQueueAndFlushesPendingWrites() {
        service.flushPendingScheduled();
        verify(data, never()).recordAuditBatch(anyList());

        ReflectionTestUtils.setField(service, "batchSize", 8);
        service.record("admin", "SYSTEM_ADMIN", "127.0.0.1", "elder-1", "VIEW", "SUCCESS", null, "req-1");

        verify(data, never()).recordAuditBatch(anyList());

        service.flushPendingScheduled();

        verify(data, atLeastOnce()).recordAuditBatch(anyList());
    }

    @Test
    void batchFailureRetriesWithTheSameAuditId() {
        AtomicReference<SilverLinkDataService.AuditLogWrite> batched = new AtomicReference<>();
        doAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            List<SilverLinkDataService.AuditLogWrite> writes = invocation.getArgument(0);
            batched.set(writes.get(0));
            throw new RuntimeException("batch failed");
        }).when(data).recordAuditBatch(anyList());

        service.record("admin", "SYSTEM_ADMIN", "127.0.0.1", "elder-1", "VIEW", "SUCCESS", null, "req-1");

        var retried = org.mockito.ArgumentCaptor.forClass(SilverLinkDataService.AuditLogWrite.class);
        verify(data).recordAudit(retried.capture());
        assertNotNull(batched.get());
        assertEquals(batched.get().id(), retried.getValue().id());
        assertEquals(batched.get().time(), retried.getValue().time());
    }

    private SilverLinkDataService.AuditLogWrite captureSingleWrite(Runnable action) {
        AtomicReference<SilverLinkDataService.AuditLogWrite> captured = new AtomicReference<>();
        doAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            List<SilverLinkDataService.AuditLogWrite> batch = (List<SilverLinkDataService.AuditLogWrite>) invocation.getArgument(0);
            if (!batch.isEmpty()) {
                captured.set(batch.get(0));
            }
            return null;
        }).when(data).recordAuditBatch(anyList());

        action.run();

        SilverLinkDataService.AuditLogWrite write = captured.get();
        assertNotNull(write, "expected a batched audit log entry");
        verify(data, atLeastOnce()).recordAuditBatch(anyList());
        verify(data, never()).recordAudit(
                any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any()
        );
        return write;
    }
}
