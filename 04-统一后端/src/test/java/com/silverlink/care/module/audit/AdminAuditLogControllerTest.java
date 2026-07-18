package com.silverlink.care.module.audit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class AdminAuditLogControllerTest {

    private AuditLogRollupService rollupService;
    private AdminAuditLogController controller;

    @BeforeEach
    void setUp() {
        AuditLogService auditLogService = mock(AuditLogService.class);
        rollupService = mock(AuditLogRollupService.class);
        AuditLogExportService exportService = mock(AuditLogExportService.class);
        controller = new AdminAuditLogController(auditLogService, rollupService, exportService);
    }

    @Test
    void splitSummaryEndpointsMapStructuredFilters() {
        when(rollupService.overview(any())).thenReturn(Map.of("total", 1L));
        when(rollupService.trend(any())).thenReturn(Map.of("trend", java.util.List.of()));
        when(rollupService.distribution(any())).thenReturn(Map.of("actions", java.util.List.of()));

        assertEquals(200, controller.overview(Map.of("role", "VISITOR_GROUP", "result", "SUCCESS")).getCode());
        assertEquals(200, controller.trend(Map.of("role", "VISITOR_GROUP")).getCode());
        assertEquals(200, controller.distribution(Map.of("role", "VISITOR_GROUP")).getCode());

        var queryCaptor = org.mockito.ArgumentCaptor.forClass(AuditLogQuery.class);
        verify(rollupService).overview(queryCaptor.capture());
        assertEquals("VISITOR_GROUP", queryCaptor.getValue().role());
        assertEquals("SUCCESS", queryCaptor.getValue().result());
    }

    @Test
    void legacySummaryUsesRollupCompatibilityResponse() {
        when(rollupService.summary(any())).thenReturn(Map.of("total", 3L));

        var response = controller.summary(Map.of("role", "SYSTEM_ADMIN"));

        assertEquals(3L, response.getData().get("total"));
        verify(rollupService).summary(any(AuditLogQuery.class));
    }
}
