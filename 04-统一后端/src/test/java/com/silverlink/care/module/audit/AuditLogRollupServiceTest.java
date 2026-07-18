package com.silverlink.care.module.audit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.silverlink.care.infrastructure.cache.JsonTwoLevelCache;
import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuditLogRollupServiceTest {

    private AuditLogRollupRepository repository;
    private SilverLinkDataService data;
    private AuditLogRollupService service;

    @BeforeEach
    void setUp() {
        repository = mock(AuditLogRollupRepository.class);
        data = mock(SilverLinkDataService.class);
        JsonTwoLevelCache cache = null;
        service = new AuditLogRollupService(repository, data, cache, new ObjectMapper());
        ReflectionTestUtils.setField(service, "enabled", true);
        ReflectionTestUtils.setField(service, "ready", true);
        when(repository.latestRebuiltAt()).thenReturn(Instant.now().toString());
    }

    @Test
    void lowCardinalitySummaryUsesRollupAndKeepsRecentRowsOutsideStatistics() {
        AuditLogQuery query = new AuditLogQuery(null, null, null, null, null,
                "VISITOR_GROUP", null, null, null);
        when(repository.overview(query)).thenReturn(Map.of(
                "total", 10L, "successCount", 8L, "failureCount", 1L,
                "pendingCount", 1L, "sourceIpCount", 2L));
        when(repository.trend(query)).thenReturn(List.of(Map.of("day", "2026-07-18", "value", 10L)));
        when(repository.distribution(query)).thenReturn(Map.of(
                "actions", List.of(), "verificationMethods", List.of(), "results", List.of()));
        when(data.auditLogRecent(query, 6)).thenReturn(List.of(Map.of("id", "audit-1")));

        Map<String, Object> result = service.summary(query);

        assertEquals(10L, result.get("total"));
        assertEquals("ROLLUP", result.get("source"));
        assertEquals(List.of(Map.of("id", "audit-1")), result.get("recent"));
        verify(data, never()).auditLogStatistics(any());
        verify(data).auditLogRecent(query, 6);
    }

    @Test
    void highCardinalityFilterFallsBackToAuthoritativeTable() {
        AuditLogQuery query = new AuditLogQuery(null, null, "admin", null, null,
                "SYSTEM_ADMIN", null, null, null);
        when(data.auditLogStatistics(query)).thenReturn(Map.of(
                "total", 4L, "successCount", 4L, "failureCount", 0L,
                "pendingCount", 0L, "sourceIpCount", 1L,
                "trend", List.of(), "actions", List.of(), "verificationMethods", List.of()));

        Map<String, Object> result = service.overview(query);

        assertEquals("RAW", result.get("source"));
        assertEquals(4L, result.get("total"));
        verify(repository, never()).overview(any());
    }

    @Test
    void partialDayAndUnknownResultFiltersFallBackToAuthoritativeTable() {
        AuditLogQuery partialDay = new AuditLogQuery("2026-07-18T08:00:00Z", null, null, null,
                null, "SYSTEM_ADMIN", null, null, null);
        AuditLogQuery unknownResult = new AuditLogQuery(null, null, null, null,
                "CANCELLED", "SYSTEM_ADMIN", null, null, null);
        Map<String, Object> raw = Map.of(
                "total", 0L, "successCount", 0L, "failureCount", 0L,
                "pendingCount", 0L, "sourceIpCount", 0L,
                "trend", List.of(), "actions", List.of(), "verificationMethods", List.of());
        when(data.auditLogStatistics(partialDay)).thenReturn(raw);
        when(data.auditLogStatistics(unknownResult)).thenReturn(raw);

        assertEquals("RAW", service.overview(partialDay).get("source"));
        assertEquals("RAW", service.overview(unknownResult).get("source"));
        verify(repository, never()).overview(any());
    }

    @Test
    void disabledRollupFallsBackToRawStatistics() {
        ReflectionTestUtils.setField(service, "enabled", false);
        AuditLogQuery query = new AuditLogQuery(null, null, null, null, null,
                "SYSTEM_ADMIN", null, null, null);
        when(data.auditLogStatistics(query)).thenReturn(Map.of(
                "total", 1L, "successCount", 1L, "failureCount", 0L,
                "pendingCount", 0L, "sourceIpCount", 1L,
                "trend", List.of(), "actions", List.of(), "verificationMethods", List.of()));

        assertEquals("RAW", service.overview(query).get("source"));
    }

    @Test
    void hotRefreshSkipsUnchangedDays() {
        when(repository.needsRebuild(any())).thenReturn(false);

        service.refreshHotWindow();

        verify(repository, never()).rebuildDay(any());
    }
}
