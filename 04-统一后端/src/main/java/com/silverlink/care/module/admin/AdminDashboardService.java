package com.silverlink.care.module.admin;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.silverlink.care.infrastructure.cache.JsonTwoLevelCache;
import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import com.silverlink.care.module.audit.AuditLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class AdminDashboardService {

    private static final String SUMMARY_CACHE_KEY = "admin:dashboard:summary:v2";

    private final SilverLinkDataService data;
    private final JsonTwoLevelCache cache;
    private final ObjectMapper objectMapper;
    private final AuditLogService auditLogService;

    public AdminDashboardService(SilverLinkDataService data) {
        this(data, null, new ObjectMapper(), null);
    }

    @Autowired
    public AdminDashboardService(SilverLinkDataService data, JsonTwoLevelCache cache, ObjectMapper objectMapper, AuditLogService auditLogService) {
        this.data = data;
        this.cache = cache;
        this.objectMapper = objectMapper;
        this.auditLogService = auditLogService;
    }

    public Map<String, Object> stats() {
        return data.dashboard();
    }

    public List<Map<String, Object>> elders() {
        return data.eldersForAdmin();
    }

    public List<Map<String, Object>> volunteers() {
        return data.volunteers();
    }

    public List<Map<String, Object>> auditLogs() {
        return data.auditLogs(null, null, null);
    }

    public Map<String, Object> summary() {
        if (cache == null || auditLogService == null) return buildSummary();
        String payload = cache.getOrLoad(SUMMARY_CACHE_KEY, 1_000L, 15_000L, this::serializeMetrics);
        Map<String, Object> summary;
        try {
            summary = objectMapper.readValue(payload, new TypeReference<>() {});
        } catch (Exception ignored) {
            cache.invalidate(SUMMARY_CACHE_KEY);
            summary = new java.util.LinkedHashMap<>(data.dashboard());
        }
        summary.put("recentAuditLogs", auditLogService.recentSummary());
        return summary;
    }

    public void invalidateSummary() {
        if (cache != null) cache.invalidate(SUMMARY_CACHE_KEY);
    }

    private String serializeMetrics() {
        try {
            return objectMapper.writeValueAsString(data.dashboard());
        } catch (Exception exception) {
            throw new IllegalStateException("无法序列化仪表盘摘要", exception);
        }
    }

    private Map<String, Object> buildSummary() {
        Map<String, Object> summary = new java.util.LinkedHashMap<>(data.dashboard());
        summary.put("recentAuditLogs", auditLogService == null ? List.of() : auditLogService.recentSummary());
        return summary;
    }
}
