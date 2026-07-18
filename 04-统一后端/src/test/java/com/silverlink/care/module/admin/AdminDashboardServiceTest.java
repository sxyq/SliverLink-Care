package com.silverlink.care.module.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.silverlink.care.infrastructure.cache.JsonTwoLevelCache;
import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import com.silverlink.care.module.audit.AuditLogService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminDashboardServiceTest {

    @Mock
    private SilverLinkDataService data;

    @InjectMocks
    private AdminDashboardService service;

    @Test
    void stats_returnsDashboardMap() {
        Map<String, Object> expected = Map.of("elderCount", 10, "volunteerCount", 5);
        when(data.dashboard()).thenReturn(expected);

        Map<String, Object> result = service.stats();

        assertSame(expected, result);
        verify(data).dashboard();
    }

    @Test
    void stats_delegatesToDataService() {
        when(data.dashboard()).thenReturn(Map.of());

        service.stats();

        verify(data, times(1)).dashboard();
    }

    @Test
    void elders_returnsElderList() {
        List<Map<String, Object>> expected = List.of(Map.of("id", "e1", "name", "张三"));
        when(data.eldersForAdmin()).thenReturn(expected);

        List<Map<String, Object>> result = service.elders();

        assertSame(expected, result);
        verify(data).eldersForAdmin();
    }

    @Test
    void elders_delegatesToDataService() {
        when(data.eldersForAdmin()).thenReturn(List.of());

        service.elders();

        verify(data, times(1)).eldersForAdmin();
    }

    @Test
    void volunteers_returnsVolunteerList() {
        List<Map<String, Object>> expected = List.of(Map.of("id", "v1", "name", "李四"));
        when(data.volunteers()).thenReturn(expected);

        List<Map<String, Object>> result = service.volunteers();

        assertSame(expected, result);
        verify(data).volunteers();
    }

    @Test
    void volunteers_delegatesToDataService() {
        when(data.volunteers()).thenReturn(List.of());

        service.volunteers();

        verify(data, times(1)).volunteers();
    }

    @Test
    void auditLogs_callsWithNullFilters() {
        List<Map<String, Object>> expected = List.of(Map.of("id", "a1"));
        when(data.auditLogs(null, null, null)).thenReturn(expected);

        List<Map<String, Object>> result = service.auditLogs();

        assertSame(expected, result);
        verify(data).auditLogs(null, null, null);
    }

    @Test
    void auditLogs_delegatesToDataServiceWithNulls() {
        when(data.auditLogs(null, null, null)).thenReturn(List.of());

        service.auditLogs();

        verify(data, times(1)).auditLogs(null, null, null);
    }

    @Test
    void summaryCachesMetricsButNotRecentAuditDetails() {
        JsonTwoLevelCache cache = mock(JsonTwoLevelCache.class);
        AuditLogService auditLogService = mock(AuditLogService.class);
        AdminDashboardService cachedService = new AdminDashboardService(data, cache, new ObjectMapper(), auditLogService);
        when(data.dashboard()).thenReturn(Map.of("elderCount", 2));
        when(auditLogService.recentSummary()).thenReturn(List.of(Map.of(
                "operator", "admin", "sourceIp", "127.0.0.1")));
        AtomicReference<String> cachedPayload = new AtomicReference<>();
        when(cache.getOrLoad(anyString(), anyLong(), anyLong(), any())).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            Supplier<String> loader = invocation.getArgument(3);
            String loaded = loader.get();
            cachedPayload.set(loaded);
            return loaded;
        });

        Map<String, Object> result = cachedService.summary();

        assertTrue(result.containsKey("recentAuditLogs"));
        assertNotNull(cachedPayload.get());
        assertFalse(cachedPayload.get().contains("recentAuditLogs"));
        assertFalse(cachedPayload.get().contains("127.0.0.1"));
    }
}
