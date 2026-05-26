package com.silverlink.care.module.audit;

import com.silverlink.care.common.ApiResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuditLogControllerTest {

    private AuditLogService auditLogService;
    private AuditLogController controller;

    @BeforeEach
    void setUp() {
        auditLogService = mock(AuditLogService.class);
        controller = new AuditLogController(auditLogService);
    }

    @Test
    void listWithoutFiltersReturnsAll() {
        when(auditLogService.listAll()).thenReturn(List.of());
        var result = controller.list(null, null, null);
        assertEquals(200, result.getCode());
        verify(auditLogService).listAll();
        verify(auditLogService, never()).filter(any(), any(), any());
    }

    @Test
    void listWithFiltersCallsFilter() {
        when(auditLogService.filter("admin", null, null)).thenReturn(List.of());
        var result = controller.list("admin", null, null);
        assertEquals(200, result.getCode());
        verify(auditLogService).filter("admin", null, null);
    }

    @Test
    void reportRecordsAndReturnsOk() {
        var result = controller.report(Map.of("operator", "scan-user", "action", "view", "target", "elder-1", "requestId", "req-1"));
        assertEquals(200, result.getCode());
        assertTrue(result.getData().get("ok"));
        verify(auditLogService).record(eq("scan-user"), eq("SCAN_USER"), eq("CLIENT"), eq("elder-1"), eq("view"), eq("成功"), eq(""), eq("req-1"));
    }

    @Test
    void reportUsesDefaultsWhenFieldsMissing() {
        var result = controller.report(Map.of());
        assertEquals(200, result.getCode());
        verify(auditLogService).record(eq("scan-client"), eq("SCAN_USER"), eq("CLIENT"), eq(""), eq("client-report"), eq("成功"), eq(""), eq(""));
    }
}
