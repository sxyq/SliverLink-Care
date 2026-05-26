package com.silverlink.care.module.review;

import com.silverlink.care.common.ApiResponse;
import com.silverlink.care.module.audit.AuditLogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.TestingAuthenticationToken;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class AdminReviewRequestControllerTest {

    private AdminReviewRequestService reviewRequestService;
    private AuditLogService auditLogService;
    private AdminReviewRequestController controller;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        reviewRequestService = mock(AdminReviewRequestService.class);
        auditLogService = mock(AuditLogService.class);
        controller = new AdminReviewRequestController(reviewRequestService, auditLogService);
        request = new MockHttpServletRequest();
    }

    @Test
    void listReturnsApiResponse() {
        when(reviewRequestService.list("PENDING")).thenReturn(List.of());
        var result = controller.list("PENDING");
        assertEquals(200, result.getCode());
        assertTrue(result.getData().isEmpty());
    }

    @Test
    void approveReturnsResultAndRecordsAudit() {
        Map<String, Object> approved = Map.of("id", "rev-1", "status", "APPROVED");
        when(reviewRequestService.approve("rev-1", "admin")).thenReturn(approved);
        var auth = new TestingAuthenticationToken("admin", "pwd", "SYSTEM_ADMIN");

        var result = controller.approve("rev-1", auth, request);
        assertEquals(200, result.getCode());
        assertEquals("APPROVED", result.getData().get("status"));
        verify(auditLogService).record(eq("admin"), eq("SYSTEM_ADMIN"), eq(request), eq("rev-1"), eq("APPROVE_QR_DISABLE_REQUEST"), eq("SUCCESS"), any(), any());
    }

    @Test
    void approveUsesDefaultAccountWhenAuthNull() {
        Map<String, Object> approved = Map.of("id", "rev-1", "status", "APPROVED");
        when(reviewRequestService.approve("rev-1", "admin")).thenReturn(approved);

        var result = controller.approve("rev-1", null, request);
        assertEquals(200, result.getCode());
        verify(reviewRequestService).approve("rev-1", "admin");
    }

    @Test
    void rejectReturnsResultAndRecordsAudit() {
        Map<String, Object> rejected = Map.of("id", "rev-2", "status", "REJECTED");
        when(reviewRequestService.reject(eq("rev-2"), eq("admin"), anyString())).thenReturn(rejected);
        var auth = new TestingAuthenticationToken("admin", "pwd", "SYSTEM_ADMIN");

        var result = controller.reject("rev-2", Map.of("note", "不符合"), auth, request);
        assertEquals(200, result.getCode());
        verify(auditLogService).record(eq("admin"), eq("SYSTEM_ADMIN"), eq(request), eq("rev-2"), eq("REJECT_QR_DISABLE_REQUEST"), eq("SUCCESS"), any(), any());
    }

    @Test
    void rejectHandlesNullBody() {
        Map<String, Object> rejected = Map.of("id", "rev-3", "status", "REJECTED");
        when(reviewRequestService.reject(eq("rev-3"), eq("admin"), anyString())).thenReturn(rejected);

        var result = controller.reject("rev-3", null, null, request);
        assertEquals(200, result.getCode());
        verify(reviewRequestService).reject("rev-3", "admin", "");
    }
}
