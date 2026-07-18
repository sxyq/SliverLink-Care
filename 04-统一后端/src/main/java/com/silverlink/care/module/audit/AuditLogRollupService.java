package com.silverlink.care.module.audit;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.silverlink.care.infrastructure.cache.JsonTwoLevelCache;
import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;

@Service
public class AuditLogRollupService {

    private static final Logger log = LoggerFactory.getLogger(AuditLogRollupService.class);

    private final AuditLogRollupRepository repository;
    private final SilverLinkDataService data;
    private final JsonTwoLevelCache cache;
    private final ObjectMapper objectMapper;
    private final AtomicBoolean refreshRunning = new AtomicBoolean(false);
    private final AtomicInteger hotRefreshCount = new AtomicInteger();
    private final Set<String> cachedKeys = ConcurrentHashMap.newKeySet();

    @Value("${silverlink.audit.rollup-enabled:true}")
    private boolean enabled;

    private volatile boolean ready;

    public AuditLogRollupService(
            AuditLogRollupRepository repository,
            SilverLinkDataService data,
            JsonTwoLevelCache cache,
            ObjectMapper objectMapper
    ) {
        this.repository = repository;
        this.data = data;
        this.cache = cache;
        this.objectMapper = objectMapper;
    }

    @Scheduled(
            fixedDelayString = "${silverlink.audit.rollup-hot-interval-ms:30000}",
            initialDelayString = "${silverlink.audit.rollup-initial-delay-ms:5000}"
    )
    public void refreshHotWindow() {
        if (!enabled || !refreshRunning.compareAndSet(false, true)) return;
        try {
            boolean changed = false;
            if (!ready) backfillMissingDays();
            changed = !ready;
            LocalDate today = LocalDate.now(ZoneOffset.UTC);
            boolean currentReady = true;
            if (repository.needsRebuild(today)) {
                currentReady = rebuild(today);
                changed = true;
            }
            boolean allReady = ready && currentReady;
            if (hotRefreshCount.incrementAndGet() % 10 == 0
                    && repository.needsRebuild(today.minusDays(1))) {
                allReady &= rebuild(today.minusDays(1));
                changed = true;
            }
            ready = allReady;
            if (changed) invalidateCachedStatistics();
        } finally {
            refreshRunning.set(false);
        }
    }

    @Scheduled(cron = "${silverlink.audit.rollup-reconcile-cron:0 15 2 * * *}", zone = "UTC")
    public void reconcileRecentDays() {
        if (!enabled || !refreshRunning.compareAndSet(false, true)) return;
        try {
            LocalDate today = LocalDate.now(ZoneOffset.UTC);
            for (int offset = 0; offset < 7; offset++) rebuild(today.minusDays(offset));
            invalidateCachedStatistics();
        } finally {
            refreshRunning.set(false);
        }
    }

    @Scheduled(cron = "${silverlink.audit.rollup-full-reconcile-cron:0 45 3 * * SUN}", zone = "UTC")
    public void reconcileAllDays() {
        if (!enabled || !refreshRunning.compareAndSet(false, true)) return;
        try {
            boolean allReady = true;
            for (LocalDate day : repository.sourceDays()) allReady &= rebuild(day);
            ready = allReady;
            invalidateCachedStatistics();
        } finally {
            refreshRunning.set(false);
        }
    }

    public Map<String, Object> overview(AuditLogQuery query) {
        if (!useRollup(query)) return rawOverview(query);
        String key = cacheKey("overview", query);
        return cached(key, 1_000L, jitter(15_000L), () -> withMetadata(repository.overview(query), "ROLLUP"));
    }

    public Map<String, Object> trend(AuditLogQuery query) {
        if (!useRollup(query)) return rawTrend(query);
        String key = cacheKey("trend", query);
        return cached(key, 1_000L, jitter(60_000L), () -> withMetadata(
                new LinkedHashMap<>(Map.of("trend", repository.trend(query))), "ROLLUP"));
    }

    public Map<String, Object> distribution(AuditLogQuery query) {
        if (!useRollup(query)) return rawDistribution(query);
        String key = cacheKey("distribution", query);
        return cached(key, 1_000L, jitter(60_000L), () -> withMetadata(repository.distribution(query), "ROLLUP"));
    }

    public Map<String, Object> summary(AuditLogQuery query) {
        Map<String, Object> result = new LinkedHashMap<>(overview(query));
        result.putAll(trend(query));
        result.putAll(distribution(query));
        result.put("recent", data.auditLogRecent(query, 6));
        return result;
    }

    public boolean isReady() {
        return enabled && ready;
    }

    private void backfillMissingDays() {
        List<LocalDate> sourceDays = repository.sourceDays();
        Set<LocalDate> completed = repository.readyDays();
        boolean allReady = true;
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        for (LocalDate day : sourceDays) {
            if (day.equals(today) || completed.contains(day)) continue;
            allReady &= rebuild(day);
        }
        ready = allReady;
    }

    private boolean rebuild(LocalDate day) {
        try {
            repository.rebuildDay(day);
            return true;
        } catch (RuntimeException exception) {
            ready = false;
            try {
                repository.markFailure(day, exception.getMessage());
            } catch (RuntimeException stateException) {
                log.warn("Unable to record failed audit rollup state for {}", day, stateException);
            }
            log.error("Audit rollup rebuild failed for {}", day, exception);
            return false;
        }
    }

    private boolean useRollup(AuditLogQuery query) {
        if (!enabled || !ready) return false;
        AuditLogQuery safe = safeQuery(query);
        return isBlank(safe.operator())
                && isBlank(safe.sourceIp())
                && isBlank(safe.target())
                && isDayFilter(safe.from())
                && isDayFilter(safe.to())
                && isSupportedResult(safe.result());
    }

    private Map<String, Object> rawOverview(AuditLogQuery query) {
        Map<String, Object> statistics = rawStatistics(query);
        Map<String, Object> result = new LinkedHashMap<>();
        copy(statistics, result, "total", "successCount", "failureCount", "pendingCount", "sourceIpCount");
        return withMetadata(result, "RAW");
    }

    private Map<String, Object> rawTrend(AuditLogQuery query) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("trend", rawStatistics(query).getOrDefault("trend", List.of()));
        return withMetadata(result, "RAW");
    }

    private Map<String, Object> rawDistribution(AuditLogQuery query) {
        Map<String, Object> statistics = rawStatistics(query);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("actions", statistics.getOrDefault("actions", List.of()));
        result.put("verificationMethods", statistics.getOrDefault("verificationMethods", List.of()));
        result.put("results", List.of());
        return withMetadata(result, "RAW");
    }

    private Map<String, Object> rawStatistics(AuditLogQuery query) {
        return data.auditLogStatistics(query);
    }

    private Map<String, Object> withMetadata(Map<String, Object> values, String source) {
        Map<String, Object> result = new LinkedHashMap<>(values);
        String asOf = "ROLLUP".equals(source) ? repository.latestRebuiltAt() : Instant.now().toString();
        result.put("asOf", asOf);
        result.put("lagSeconds", lagSeconds(asOf));
        result.put("source", source);
        return result;
    }

    private long lagSeconds(String asOf) {
        if (asOf == null || asOf.isBlank()) return 0L;
        try {
            return Math.max(0L, Duration.between(Instant.parse(asOf), Instant.now()).getSeconds());
        } catch (RuntimeException ignored) {
            return 0L;
        }
    }

    private Map<String, Object> cached(
            String key,
            long localTtlMillis,
            long redisTtlMillis,
            Supplier<Map<String, Object>> loader
    ) {
        if (cache == null) return loader.get();
        cachedKeys.add(key);
        String payload = cache.getOrLoad(key, localTtlMillis, redisTtlMillis, () -> toJson(loader.get()));
        Map<String, Object> parsed = fromJson(payload);
        if (parsed != null) return parsed;
        cache.invalidate(key);
        return loader.get();
    }

    private void invalidateCachedStatistics() {
        if (cache == null || cachedKeys.isEmpty()) return;
        List<String> keys = new ArrayList<>(cachedKeys);
        cachedKeys.clear();
        for (String key : keys) cache.invalidate(key);
    }

    private String cacheKey(String section, AuditLogQuery query) {
        AuditLogQuery safe = safeQuery(query);
        String fingerprint = String.join("|",
                value(safe.from()), value(safe.to()), value(safe.operator()), value(safe.action()),
                value(safe.result()), value(safe.role()), value(safe.verificationMethod()),
                value(safe.sourceIp()), value(safe.target()));
        return "audit:summary:" + section + ":v2:" + data.hash(fingerprint);
    }

    private AuditLogQuery safeQuery(AuditLogQuery query) {
        return query == null
                ? new AuditLogQuery(null, null, null, null, null, null, null, null, null)
                : query;
    }

    private void copy(Map<String, Object> source, Map<String, Object> target, String... keys) {
        for (String key : keys) target.put(key, source.getOrDefault(key, 0L));
    }

    private long jitter(long ttlMillis) {
        long variation = Math.max(1L, ttlMillis / 10L);
        return ttlMillis + ThreadLocalRandom.current().nextLong(-variation, variation + 1L);
    }

    private String toJson(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception exception) {
            throw new IllegalStateException("无法序列化审计汇总", exception);
        }
    }

    private Map<String, Object> fromJson(String value) {
        try {
            return objectMapper.readValue(value, new TypeReference<>() {});
        } catch (Exception exception) {
            return null;
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private boolean isDayFilter(String value) {
        return isBlank(value) || value.trim().matches("\\d{4}-\\d{2}-\\d{2}");
    }

    private boolean isSupportedResult(String value) {
        if (isBlank(value)) return true;
        return "SUCCESS".equalsIgnoreCase(value)
                || "FAIL".equalsIgnoreCase(value)
                || "PENDING".equalsIgnoreCase(value)
                || "成功".equals(value)
                || "失败".equals(value);
    }

    private String value(String value) {
        return value == null ? "" : value;
    }
}
