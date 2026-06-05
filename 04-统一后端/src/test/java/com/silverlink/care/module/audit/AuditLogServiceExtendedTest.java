package com.silverlink.care.module.audit;

import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.*;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

class AuditLogServiceExtendedTest {

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
    void operatorOfReturnsAnonymousWhenAuthIsNull() {
        assertEquals("anonymous", service.operatorOf(null));
    }

    @Test
    void operatorOfReturnsAnonymousWhenNameIsNull() {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn(null);
        assertEquals("anonymous", service.operatorOf(auth));
    }

    @Test
    void operatorOfReturnsAnonymousWhenNameIsBlank() {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("   ");
        assertEquals("anonymous", service.operatorOf(auth));
    }

    @Test
    void operatorOfReturnsNameWhenPresent() {
        var auth = new TestingAuthenticationToken("admin", "pwd");
        assertEquals("admin", service.operatorOf(auth));
    }

    @Test
    void roleOfReturnsUnknownWhenAuthIsNull() {
        assertEquals("UNKNOWN", service.roleOf(null));
    }

    @Test
    void roleOfReturnsUnknownWhenAuthoritiesIsNull() {
        Authentication auth = mock(Authentication.class);
        doReturn(null).when(auth).getAuthorities();
        assertEquals("UNKNOWN", service.roleOf(auth));
    }

    @Test
    void roleOfReturnsUnknownWhenAuthoritiesIsEmpty() {
        Authentication auth = mock(Authentication.class);
        doReturn(Collections.emptyList()).when(auth).getAuthorities();
        assertEquals("UNKNOWN", service.roleOf(auth));
    }

    @Test
    void roleOfReturnsUnknownWhenAuthorityIsNull() {
        List<GrantedAuthority> authorities = new ArrayList<>();
        authorities.add(null);
        Authentication auth = mock(Authentication.class);
        doReturn(authorities).when(auth).getAuthorities();
        assertEquals("UNKNOWN", service.roleOf(auth));
    }

    @Test
    void roleOfReturnsUnknownWhenAuthorityValueIsNull() {
        GrantedAuthority ga = mock(GrantedAuthority.class);
        when(ga.getAuthority()).thenReturn(null);
        Authentication auth = mock(Authentication.class);
        doReturn(List.of(ga)).when(auth).getAuthorities();
        assertEquals("UNKNOWN", service.roleOf(auth));
    }

    @Test
    void roleOfStripsRolePrefix() {
        var auth = new TestingAuthenticationToken("admin", "pwd", List.of(new SimpleGrantedAuthority("ROLE_VOLUNTEER")));
        assertEquals("VOLUNTEER", service.roleOf(auth));
    }

    @Test
    void resolveClientIpReturnsEmptyForNullRequest() {
        assertEquals("", service.resolveClientIp(null));
    }

    @Test
    void resolveClientIpChecksXForwardedFor() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Forwarded-For", "10.0.0.1, 172.16.0.1");
        request.setRemoteAddr("192.168.1.1");
        assertEquals("10.0.0.1", service.resolveClientIp(request));
    }

    @Test
    void resolveClientIpChecksXRealIp() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Real-IP", "10.1.1.1");
        request.setRemoteAddr("192.168.1.1");
        assertEquals("10.1.1.1", service.resolveClientIp(request));
    }

    @Test
    void resolveClientIpChecksProxyClientIp() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Proxy-Client-IP", "10.2.2.2");
        request.setRemoteAddr("192.168.1.1");
        assertEquals("10.2.2.2", service.resolveClientIp(request));
    }

    @Test
    void resolveClientIpChecksWlProxyClientIp() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("WL-Proxy-Client-IP", "10.3.3.3");
        request.setRemoteAddr("192.168.1.1");
        assertEquals("10.3.3.3", service.resolveClientIp(request));
    }

    @Test
    void resolveClientIpChecksHttpXForwardedFor() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("HTTP_X_FORWARDED_FOR", "10.4.4.4");
        request.setRemoteAddr("192.168.1.1");
        assertEquals("10.4.4.4", service.resolveClientIp(request));
    }

    @Test
    void resolveClientIpChecksHttpClientIp() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("HTTP_CLIENT_IP", "10.5.5.5");
        request.setRemoteAddr("192.168.1.1");
        assertEquals("10.5.5.5", service.resolveClientIp(request));
    }

    @Test
    void resolveClientIpFallsBackToRemoteAddr() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("192.168.1.1");
        assertEquals("192.168.1.1", service.resolveClientIp(request));
    }

    @Test
    void resolveClientIpSkipsUnknownXForwardedFor() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Forwarded-For", "unknown");
        request.setRemoteAddr("192.168.1.1");
        assertEquals("192.168.1.1", service.resolveClientIp(request));
    }

    @Test
    void resolveClientIpSkipsUnknownInCommaList() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Forwarded-For", "unknown, 10.0.0.2");
        assertEquals("10.0.0.2", service.resolveClientIp(request));
    }

    @Test
    void resolveClientIpSkipsBlankPartsInCommaList() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Forwarded-For", "  , 10.0.0.3");
        assertEquals("10.0.0.3", service.resolveClientIp(request));
    }

    @Test
    void resolveClientIpPicksFirstHeaderWithNonBlankValue() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Forwarded-For", "unknown");
        request.addHeader("X-Real-IP", "10.6.6.6");
        request.setRemoteAddr("192.168.1.1");
        assertEquals("10.6.6.6", service.resolveClientIp(request));
    }

    @Test
    void recordWithAuthenticationAndIpDelegatesCorrectly() {
        var auth = new TestingAuthenticationToken("admin", "pwd", List.of(new SimpleGrantedAuthority("ROLE_SYSTEM_ADMIN")));
        SilverLinkDataService.AuditLogWrite write = captureSingleWrite(() ->
                service.record(auth, "10.0.0.1", "elder-1", "VIEW", "SUCCESS"));
        assertEquals("admin", write.operator());
        assertEquals("SYSTEM_ADMIN", write.role());
        assertEquals("10.0.0.1", write.ip());
        assertEquals("elder-1", write.target());
        assertEquals("VIEW", write.action());
    }

    @Test
    void recordWithAuthenticationAndIpUsesAnonymousWhenAuthIsNull() {
        SilverLinkDataService.AuditLogWrite write = captureSingleWrite(() ->
                service.record(null, "10.0.0.1", "elder-1", "VIEW", "SUCCESS"));
        assertEquals("anonymous", write.operator());
        assertEquals("UNKNOWN", write.role());
    }

    @Test
    void recordWithAuthenticationAndRequestDelegatesCorrectly() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.1");
        var auth = new TestingAuthenticationToken("admin", "pwd", List.of(new SimpleGrantedAuthority("ROLE_VOLUNTEER")));
        SilverLinkDataService.AuditLogWrite write = captureSingleWrite(() ->
                service.record(auth, request, "elder-1", "EDIT", "SUCCESS"));
        assertEquals("admin", write.operator());
        assertEquals("VOLUNTEER", write.role());
        assertEquals("10.0.0.1", write.ip());
        assertEquals("EDIT", write.action());
    }

    @Test
    void recordWithAuthenticationAndRequestUsesAnonymousWhenAuthIsNull() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.1");
        SilverLinkDataService.AuditLogWrite write = captureSingleWrite(() ->
                service.record(null, request, "elder-1", "VIEW", "SUCCESS"));
        assertEquals("anonymous", write.operator());
        assertEquals("UNKNOWN", write.role());
        assertEquals("10.0.0.1", write.ip());
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

    @Test
    void toEntitiesMapsRowsToAuditLogEntities() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", "log-1");
        row.put("time", "2026-05-25T10:00:00Z");
        row.put("operator", "admin");
        row.put("role", "SYSTEM_ADMIN");
        row.put("sourceIp", "127.0.0.1");
        row.put("target", "elder-1");
        row.put("action", "LOGIN");
        row.put("verificationMethod", "SMS");
        row.put("visitorName", "王丽");
        row.put("visitorPhone", "13800001111");
        row.put("visitorPhoneMasked", "138****1111");
        row.put("visitorIdCard", "500102200212180836");
        row.put("visitorIdCardMasked", "5001****0836");
        row.put("result", "SUCCESS");
        row.put("failReason", "");
        row.put("requestId", "req-1");
        when(data.auditLogs(null, null, null)).thenReturn(List.of(row));

        var result = service.listAll();
        assertEquals(1, result.size());
        AuditLogEntity entity = result.get(0);
        assertEquals("log-1", entity.getId());
        assertEquals("2026-05-25T10:00:00Z", entity.getTime());
        assertEquals("admin", entity.getOperator());
        assertEquals("SYSTEM_ADMIN", entity.getRole());
        assertEquals("127.0.0.1", entity.getSourceIp());
        assertEquals("elder-1", entity.getTarget());
        assertEquals("LOGIN", entity.getAction());
        assertEquals("SMS", entity.getVerificationMethod());
        assertEquals("王丽", entity.getVisitorName());
        assertEquals("13800001111", entity.getVisitorPhone());
        assertEquals("138****1111", entity.getVisitorPhoneMasked());
        assertEquals("500102200212180836", entity.getVisitorIdCard());
        assertEquals("5001****0836", entity.getVisitorIdCardMasked());
        assertEquals("SUCCESS", entity.getResult());
        assertEquals("", entity.getFailReason());
        assertEquals("req-1", entity.getRequestId());
    }

    @Test
    void toEntitiesHandlesEmptyList() {
        when(data.auditLogs(null, null, null)).thenReturn(Collections.emptyList());
        var result = service.listAll();
        assertTrue(result.isEmpty());
    }

    @Test
    void toEntitiesHandlesMultipleRows() {
        Map<String, Object> row1 = new LinkedHashMap<>();
        row1.put("id", "log-1");
        row1.put("time", "2026-05-25");
        row1.put("operator", "admin");
        row1.put("role", "SYSTEM_ADMIN");
        row1.put("sourceIp", "10.0.0.1");
        row1.put("target", "elder-1");
        row1.put("action", "LOGIN");
        row1.put("verificationMethod", "");
        row1.put("visitorName", "");
        row1.put("visitorPhone", "");
        row1.put("visitorPhoneMasked", "");
        row1.put("visitorIdCard", "");
        row1.put("visitorIdCardMasked", "");
        row1.put("result", "SUCCESS");
        row1.put("failReason", "");
        row1.put("requestId", "");

        Map<String, Object> row2 = new LinkedHashMap<>();
        row2.put("id", "log-2");
        row2.put("time", "2026-05-26");
        row2.put("operator", "volunteer");
        row2.put("role", "VOLUNTEER");
        row2.put("sourceIp", "10.0.0.2");
        row2.put("target", "elder-2");
        row2.put("action", "VIEW");
        row2.put("verificationMethod", "");
        row2.put("visitorName", "");
        row2.put("visitorPhone", "");
        row2.put("visitorPhoneMasked", "");
        row2.put("visitorIdCard", "");
        row2.put("visitorIdCardMasked", "");
        row2.put("result", "FAIL");
        row2.put("failReason", "权限不足");
        row2.put("requestId", "req-2");

        when(data.auditLogs(null, null, null)).thenReturn(List.of(row1, row2));
        var result = service.listAll();
        assertEquals(2, result.size());
        assertEquals("log-1", result.get(0).getId());
        assertEquals("admin", result.get(0).getOperator());
        assertEquals("log-2", result.get(1).getId());
        assertEquals("volunteer", result.get(1).getOperator());
        assertEquals("FAIL", result.get(1).getResult());
        assertEquals("权限不足", result.get(1).getFailReason());
    }

    @Test
    void toEntitiesHandlesNullValuesInRow() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", null);
        row.put("time", null);
        row.put("operator", null);
        row.put("role", null);
        row.put("sourceIp", null);
        row.put("target", null);
        row.put("action", null);
        row.put("verificationMethod", null);
        row.put("visitorName", null);
        row.put("visitorPhone", null);
        row.put("visitorPhoneMasked", null);
        row.put("visitorIdCard", null);
        row.put("visitorIdCardMasked", null);
        row.put("result", null);
        row.put("failReason", null);
        row.put("requestId", null);
        when(data.auditLogs(null, null, null)).thenReturn(List.of(row));

        var result = service.listAll();
        assertEquals(1, result.size());
        AuditLogEntity entity = result.get(0);
        assertEquals("", entity.getId());
        assertEquals("", entity.getOperator());
        assertEquals("", entity.getRole());
        assertEquals("", entity.getSourceIp());
        assertEquals("", entity.getTarget());
        assertEquals("", entity.getAction());
        assertEquals("", entity.getResult());
    }
}
