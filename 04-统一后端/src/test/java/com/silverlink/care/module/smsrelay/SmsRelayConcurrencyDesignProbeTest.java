package com.silverlink.care.module.smsrelay;

import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import com.silverlink.care.module.scan.ScanVerificationSessionDto;
import com.silverlink.care.module.scan.ScanVerificationStatusDto;
import com.silverlink.care.module.sms.SmsService;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.lang.management.GarbageCollectorMXBean;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.MemoryUsage;
import java.lang.management.ThreadMXBean;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertTrue;

class SmsRelayConcurrencyDesignProbeTest {

    private static final DateTimeFormatter FILE_TS =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH-mm-ss-SSS'Z'")
                    .withZone(ZoneId.of("UTC"));

    @Test
    void generateLocalConcurrencyDesignProbeReport() throws Exception {
        Report report = new Report();
        report.generatedAt = Instant.now().toString();
        report.environment = Map.of(
                "mode", "local-jvm-design-probe",
                "scope", "design-flaw-reproduction-not-host-performance",
                "database", "in-memory-fake-jdbc-with-unique-session-id-simulation"
        );

        report.scenarios.add(runStartSessionCollisionScenario());
        report.scenarios.add(runDirectSmsSessionCollisionScenario());
        report.scenarios.add(runIdentitySessionCollisionScenario());
        report.scenarios.add(runInboundFullScanScenario());

        writeReport(report);

        boolean hasWriteScenario = report.scenarios.stream().anyMatch(
                item -> item.name.contains("scan-verification-start")
        );
        boolean hasInboundScenario = report.scenarios.stream().anyMatch(
                item -> item.name.contains("inbound")
        );
        assertTrue(hasWriteScenario && hasInboundScenario);
    }

    private ScenarioReport runStartSessionCollisionScenario() throws Exception {
        ProbeJdbcTemplate jdbc = new ProbeJdbcTemplate();
        jdbc.devices.put("relay-android-01", new HashMap<>(deviceRow("relay-android-01")));
        SmsRelayService service = createService(jdbc, new NoopSmsService());

        return runConcurrentScenario(
                "scan-verification-start-session-id-collision",
                2000,
                256,
                () -> service.createScanVerificationSession("elder-001", "health", null),
                jdbc
        );
    }

    private ScenarioReport runDirectSmsSessionCollisionScenario() throws Exception {
        ProbeJdbcTemplate jdbc = new ProbeJdbcTemplate();
        SmsRelayService service = createService(jdbc, new NoopSmsService());

        return runConcurrentScenario(
                "scan-verification-direct-sms-session-id-collision",
                2000,
                256,
                () -> service.createDirectSmsVerificationSession("elder-001", "health", "13800000000"),
                jdbc
        );
    }

    private ScenarioReport runIdentitySessionCollisionScenario() throws Exception {
        ProbeJdbcTemplate jdbc = new ProbeJdbcTemplate();
        SmsRelayService service = createService(jdbc, new NoopSmsService());

        AtomicInteger cursor = new AtomicInteger();
        return runConcurrentScenario(
                "scan-verification-identity-session-id-collision",
                2000,
                256,
                () -> {
                    int index = cursor.incrementAndGet();
                    return service.createIdentityVerificationSession(
                            "elder-001",
                            "health",
                            "并发访客" + index,
                            phoneFor(index),
                            idCardFor(index)
                    );
                },
                jdbc
        );
    }

    private ScenarioReport runInboundFullScanScenario() throws Exception {
        ProbeJdbcTemplate jdbc = new ProbeJdbcTemplate();
        SmsRelayService service = createService(jdbc, new NoopSmsService());
        jdbc.devices.put("relay-android-01", new HashMap<>(deviceRow("relay-android-01")));

        int pendingSessions = 8000;
        int iterations = 120;
        int concurrency = 40;

        for (int index = 0; index < pendingSessions; index += 1) {
            String sessionId = "seed-session-" + index;
            String messageBody = index == pendingSessions - 1 ? "SL MATCHME" : "SL other-" + index;
            Map<String, Object> row = new HashMap<>();
            row.put("session_id", sessionId);
            row.put("elder_id", "elder-001");
            row.put("target", "health");
            row.put("relay_device_id", "relay-android-01");
            row.put("receiver_phone", "13800001111");
            row.put("message_body", messageBody);
            row.put("message_prefix", "SL");
            row.put("status", "PENDING");
            row.put("expires_at", Instant.now().plusSeconds(600).toString());
            row.put("verified", false);
            jdbc.sessions.put(sessionId, row);
        }

        MetricsSnapshot before = MetricsSnapshot.capture();
        long started = System.nanoTime();
        runConcurrent(iterations, concurrency, () -> {
            InboundSmsRequest request = new InboundSmsRequest();
            request.setDeviceId("relay-android-01");
            request.setReceiverPhone("13800001111");
            request.setSenderPhone("13900000000");
            request.setMessagePrefix("SL");
            request.setMessageBody("SL MATCHME");
            request.setReceivedAt(System.currentTimeMillis());
            service.handleInbound(request, "secret-001");
            return null;
        });
        long elapsedMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started);
        MetricsSnapshot after = MetricsSnapshot.capture();

        ScenarioReport report = new ScenarioReport();
        report.name = "sms-relay-inbound-session-match-query";
        report.iterations = iterations;
        report.concurrency = concurrency;
        report.durationMs = elapsedMs;
        report.successCount = iterations;
        report.failureCount = 0;
        report.metrics = after.delta(before);
        report.extra = Map.of(
                "seedPendingSessions", pendingSessions,
                "pendingSessionScanQueries", jdbc.pendingSessionScanQueries.get(),
                "scannedPendingRows", jdbc.scannedPendingRows.get(),
                "verificationUpdates", jdbc.verifiedUpdates.get(),
                "perInboundAverageRowsScanned", jdbc.scannedPendingRows.get() / Math.max(1, jdbc.pendingSessionScanQueries.get())
        );
        long averageRows = jdbc.scannedPendingRows.get() / Math.max(1, jdbc.pendingSessionScanQueries.get());
        if (averageRows <= 2) {
            report.findings.add("handleInbound 已缩小到按 receiver_phone + message_body 精准匹配候选会话，不再按全部 PENDING 会话全量扫描。");
            report.findings.add("本地并发探针下，单次入站平均只访问极少量候选行，说明匹配策略已从 O(n) 全表扫描收敛到近似 O(1) 候选查询。");
        } else {
            report.findings.add("handleInbound 仍然会放大候选扫描量，需要继续检查匹配 SQL 或索引策略。");
        }
        return report;
    }

    private ScenarioReport runConcurrentScenario(
            String name,
            int iterations,
            int concurrency,
            ThrowingSupplier<?> action,
            ProbeJdbcTemplate jdbc
    ) throws Exception {
        MetricsSnapshot before = MetricsSnapshot.capture();
        AtomicInteger successCount = new AtomicInteger();
        AtomicInteger duplicateFailures = new AtomicInteger();
        AtomicInteger otherFailures = new AtomicInteger();
        CopyOnWriteArrayList<String> failureExamples = new CopyOnWriteArrayList<>();

        long started = System.nanoTime();
        runConcurrent(iterations, concurrency, () -> {
            try {
                action.get();
                successCount.incrementAndGet();
            } catch (DuplicateKeyException ex) {
                duplicateFailures.incrementAndGet();
                if (failureExamples.size() < 8) {
                    failureExamples.add(ex.getMessage());
                }
            } catch (Exception ex) {
                otherFailures.incrementAndGet();
                if (failureExamples.size() < 8) {
                    failureExamples.add(ex.getClass().getSimpleName() + ": " + ex.getMessage());
                }
            }
            return null;
        });
        long elapsedMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started);
        MetricsSnapshot after = MetricsSnapshot.capture();

        ScenarioReport report = new ScenarioReport();
        report.name = name;
        report.iterations = iterations;
        report.concurrency = concurrency;
        report.durationMs = elapsedMs;
        report.successCount = successCount.get();
        report.failureCount = duplicateFailures.get() + otherFailures.get();
        report.metrics = after.delta(before);
        report.extra = new LinkedHashMap<>();
        report.extra.put("duplicateKeyFailures", duplicateFailures.get());
        report.extra.put("otherFailures", otherFailures.get());
        report.extra.put("uniqueSessionIds", jdbc.uniqueInsertedSessionIds.get());
        report.extra.put("totalInsertAttempts", jdbc.totalSessionInsertAttempts.get());
        report.extra.put("collisionExamples", new ArrayList<>(failureExamples));
        if (duplicateFailures.get() > 0) {
            report.findings.add("sessionId 仅由毫秒时间戳组成，在并发请求落在同一毫秒时会发生主键冲突。");
            report.findings.add("这类失败与本机性能强弱无关，属于 ID 生成策略的并发设计缺陷。");
        } else {
            report.findings.add("当前会话 ID 生成策略在本地并发探针下未再出现主键冲突。");
        }
        return report;
    }

    private void runConcurrent(int iterations, int concurrency, ThrowingSupplier<?> action) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(concurrency);
        CountDownLatch ready = new CountDownLatch(concurrency);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger cursor = new AtomicInteger();
        List<Future<?>> futures = new ArrayList<>();

        for (int worker = 0; worker < concurrency; worker += 1) {
            futures.add(pool.submit(() -> {
                ready.countDown();
                start.await();
                while (true) {
                    int index = cursor.getAndIncrement();
                    if (index >= iterations) {
                        return null;
                    }
                    action.get();
                }
            }));
        }

        ready.await(10, TimeUnit.SECONDS);
        start.countDown();
        for (Future<?> future : futures) {
            future.get(30, TimeUnit.SECONDS);
        }
        pool.shutdown();
        pool.awaitTermination(30, TimeUnit.SECONDS);
    }

    private SmsRelayService createService(ProbeJdbcTemplate jdbc, SmsService smsService) {
        SmsRelayService service = new SmsRelayService(jdbc, smsService, new StubDataService());
        ReflectionTestUtils.setField(service, "receiverPhone", "13800001111");
        ReflectionTestUtils.setField(service, "messagePrefix", "SL");
        ReflectionTestUtils.setField(service, "sessionTtlSeconds", 300L);
        ReflectionTestUtils.setField(service, "serverUrl", "http://localhost:8080");
        ReflectionTestUtils.setField(service, "defaultDeviceId", "relay-android-01");
        ReflectionTestUtils.setField(service, "defaultDeviceSecret", "secret-001");
        ReflectionTestUtils.setField(service, "signatureWindowSeconds", 300L);
        ReflectionTestUtils.setField(service, "authorizationWindowSeconds", 1200L);
        return service;
    }

    private void writeReport(Report report) throws IOException {
        String timestamp = FILE_TS.format(Instant.now());
        Path root = Path.of(System.getProperty("user.dir")).getParent();
        Path outDir = root.resolve("06-测试与质量保障/reports/performance");
        Files.createDirectories(outDir);

        String baseName = timestamp + "-local-scan-write-design-probe";
        Path jsonPath = outDir.resolve(baseName + ".json");
        Path mdPath = outDir.resolve(baseName + ".md");

        Files.writeString(jsonPath, toJson(report), StandardCharsets.UTF_8);
        Files.writeString(mdPath, toMarkdown(report, jsonPath), StandardCharsets.UTF_8);
    }

    private String toMarkdown(Report report, Path jsonPath) {
        List<String> lines = new ArrayList<>();
        lines.add("# SilverLink 本地并发设计缺陷探针报告");
        lines.add("");
        lines.add("- 生成时间：" + report.generatedAt);
        lines.add("- 目标：本机复现并发设计缺陷，不以本机绝对性能作为结论");
        lines.add("- 结构化数据：" + jsonPath.getFileName());
        lines.add("");
        lines.add("| 场景 | 请求数 | 并发 | 成功 | 失败 | 耗时 | 线程峰值增量 | 堆增量 | 关键发现 |");
        lines.add("| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |");
        for (ScenarioReport scenario : report.scenarios) {
            lines.add(String.format(
                    Locale.ROOT,
                    "| %s | %d | %d | %d | %d | %dms | %d | %dB | %s |",
                    scenario.name,
                    scenario.iterations,
                    scenario.concurrency,
                    scenario.successCount,
                    scenario.failureCount,
                    scenario.durationMs,
                    scenario.metrics.peakThreadDelta,
                    scenario.metrics.heapUsedDelta,
                    scenario.findings.isEmpty() ? "" : scenario.findings.get(0)
            ));
        }
        lines.add("");
        for (ScenarioReport scenario : report.scenarios) {
            lines.add("## " + scenario.name);
            lines.add("");
            lines.add("- 请求数：" + scenario.iterations);
            lines.add("- 并发：" + scenario.concurrency);
            lines.add("- 成功：" + scenario.successCount);
            lines.add("- 失败：" + scenario.failureCount);
            lines.add("- 耗时：" + scenario.durationMs + "ms");
            lines.add("- JVM 指标：");
            lines.add("  - 线程峰值增量：" + scenario.metrics.peakThreadDelta);
            lines.add("  - Heap 使用增量：" + scenario.metrics.heapUsedDelta + " bytes");
            lines.add("  - GC 次数增量：" + scenario.metrics.gcCountDelta);
            lines.add("  - GC 时间增量：" + scenario.metrics.gcTimeDeltaMs + " ms");
            lines.add("- 额外数据：" + scenario.extra);
            lines.add("- 结论：");
            for (String finding : scenario.findings) {
                lines.add("  - " + finding);
            }
            lines.add("");
        }
        return String.join("\n", lines) + "\n";
    }

    private String toJson(Report report) {
        StringBuilder builder = new StringBuilder();
        builder.append("{\n");
        builder.append("  \"generatedAt\": \"").append(escape(report.generatedAt)).append("\",\n");
        builder.append("  \"environment\": ").append(mapToJson(report.environment, 2)).append(",\n");
        builder.append("  \"scenarios\": [\n");
        for (int index = 0; index < report.scenarios.size(); index += 1) {
            builder.append(report.scenarios.get(index).toJson("    "));
            if (index < report.scenarios.size() - 1) {
                builder.append(',');
            }
            builder.append('\n');
        }
        builder.append("  ]\n");
        builder.append("}\n");
        return builder.toString();
    }

    private String mapToJson(Map<String, ?> map, int indent) {
        String prefix = " ".repeat(indent);
        StringBuilder builder = new StringBuilder();
        builder.append("{");
        if (!map.isEmpty()) {
            builder.append("\n");
        }
        int index = 0;
        for (Map.Entry<String, ?> entry : map.entrySet()) {
            builder.append(prefix).append("  ")
                    .append("\"").append(escape(entry.getKey())).append("\": ")
                    .append(valueToJson(entry.getValue(), indent + 2));
            if (index < map.size() - 1) {
                builder.append(",");
            }
            builder.append("\n");
            index += 1;
        }
        builder.append(prefix).append("}");
        return builder.toString();
    }

    private String listToJson(List<?> list, int indent) {
        String prefix = " ".repeat(indent);
        StringBuilder builder = new StringBuilder();
        builder.append("[");
        if (!list.isEmpty()) {
            builder.append("\n");
        }
        for (int index = 0; index < list.size(); index += 1) {
            builder.append(prefix).append("  ").append(valueToJson(list.get(index), indent + 2));
            if (index < list.size() - 1) {
                builder.append(",");
            }
            builder.append("\n");
        }
        builder.append(prefix).append("]");
        return builder.toString();
    }

    private String valueToJson(Object value, int indent) {
        if (value == null) {
            return "null";
        }
        if (value instanceof Number || value instanceof Boolean) {
            return String.valueOf(value);
        }
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> normalized = new LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                normalized.put(String.valueOf(entry.getKey()), entry.getValue());
            }
            return mapToJson(normalized, indent);
        }
        if (value instanceof List<?> list) {
            return listToJson(list, indent);
        }
        return "\"" + escape(String.valueOf(value)) + "\"";
    }

    private static String escape(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private static String phoneFor(int index) {
        return "138" + String.format(Locale.ROOT, "%08d", index % 100_000_000);
    }

    private static String idCardFor(int index) {
        String base17 = "11010119900101" + String.format(Locale.ROOT, "%03d", index % 1000);
        int[] weights = {7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2};
        char[] checksumMap = {'1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'};
        int total = 0;
        for (int i = 0; i < 17; i += 1) {
            total += (base17.charAt(i) - '0') * weights[i];
        }
        return base17 + checksumMap[total % 11];
    }

    private static Map<String, Object> deviceRow(String deviceId) {
        Map<String, Object> row = new HashMap<>();
        row.put("device_id", deviceId);
        row.put("receiver_phone", "13800001111");
        row.put("server_url", "http://localhost:8080");
        row.put("message_prefix", "SL");
        row.put("device_secret", "secret-001");
        row.put("status", "在线");
        row.put("last_heartbeat", Instant.now().toString());
        return row;
    }

    private interface ThrowingSupplier<T> {
        T get() throws Exception;
    }

    private static final class Report {
        String generatedAt;
        Map<String, Object> environment;
        List<ScenarioReport> scenarios = new ArrayList<>();
    }

    private static final class ScenarioReport {
        String name;
        int iterations;
        int concurrency;
        int successCount;
        int failureCount;
        long durationMs;
        MetricsDelta metrics;
        Map<String, Object> extra = new LinkedHashMap<>();
        List<String> findings = new ArrayList<>();

        String toJson(String indent) {
            StringBuilder builder = new StringBuilder();
            builder.append(indent).append("{\n");
            builder.append(indent).append("  \"name\": \"").append(escape(name)).append("\",\n");
            builder.append(indent).append("  \"iterations\": ").append(iterations).append(",\n");
            builder.append(indent).append("  \"concurrency\": ").append(concurrency).append(",\n");
            builder.append(indent).append("  \"successCount\": ").append(successCount).append(",\n");
            builder.append(indent).append("  \"failureCount\": ").append(failureCount).append(",\n");
            builder.append(indent).append("  \"durationMs\": ").append(durationMs).append(",\n");
            builder.append(indent).append("  \"metrics\": ").append(metrics.toJson(indent + "  ")).append(",\n");
            builder.append(indent).append("  \"extra\": ").append(new SmsRelayConcurrencyDesignProbeTest().mapToJson(extra, indent.length() + 2)).append(",\n");
            builder.append(indent).append("  \"findings\": ").append(new SmsRelayConcurrencyDesignProbeTest().listToJson(findings, indent.length() + 2)).append("\n");
            builder.append(indent).append("}");
            return builder.toString();
        }
    }

    private static final class MetricsSnapshot {
        long peakThreadCount;
        long heapUsed;
        long gcCount;
        long gcTimeMs;

        static MetricsSnapshot capture() {
            ThreadMXBean threadMx = ManagementFactory.getThreadMXBean();
            MemoryMXBean memoryMx = ManagementFactory.getMemoryMXBean();
            MemoryUsage heapUsage = memoryMx.getHeapMemoryUsage();

            long gcCount = 0;
            long gcTimeMs = 0;
            for (GarbageCollectorMXBean gcMx : ManagementFactory.getGarbageCollectorMXBeans()) {
                long count = gcMx.getCollectionCount();
                long time = gcMx.getCollectionTime();
                if (count > 0) {
                    gcCount += count;
                }
                if (time > 0) {
                    gcTimeMs += time;
                }
            }

            MetricsSnapshot snapshot = new MetricsSnapshot();
            snapshot.peakThreadCount = threadMx.getPeakThreadCount();
            snapshot.heapUsed = heapUsage.getUsed();
            snapshot.gcCount = gcCount;
            snapshot.gcTimeMs = gcTimeMs;
            return snapshot;
        }

        MetricsDelta delta(MetricsSnapshot before) {
            MetricsDelta delta = new MetricsDelta();
            delta.peakThreadDelta = Math.max(0, peakThreadCount - before.peakThreadCount);
            delta.heapUsedDelta = heapUsed - before.heapUsed;
            delta.gcCountDelta = Math.max(0, gcCount - before.gcCount);
            delta.gcTimeDeltaMs = Math.max(0, gcTimeMs - before.gcTimeMs);
            return delta;
        }
    }

    private static final class MetricsDelta {
        long peakThreadDelta;
        long heapUsedDelta;
        long gcCountDelta;
        long gcTimeDeltaMs;

        String toJson(String indent) {
            return "{\n"
                    + indent + "  \"peakThreadDelta\": " + peakThreadDelta + ",\n"
                    + indent + "  \"heapUsedDelta\": " + heapUsedDelta + ",\n"
                    + indent + "  \"gcCountDelta\": " + gcCountDelta + ",\n"
                    + indent + "  \"gcTimeDeltaMs\": " + gcTimeDeltaMs + "\n"
                    + indent + "}";
        }
    }

    private static final class StubDataService extends SilverLinkDataService {
        StubDataService() {
            super(null, null, null, null);
        }

        @Override
        public String enc(String value) {
            return value == null ? "" : value;
        }

        @Override
        public String dec(Object value) {
            return value == null ? "" : String.valueOf(value);
        }
    }

    private static final class NoopSmsService extends SmsService {
        NoopSmsService() {
            super(null, new StubDataService(), null);
        }

        @Override
        public String sendCode(String phone, String scene) {
            // no-op
            return "000000";
        }

        @Override
        public boolean verify(String phone, String code, String scene) {
            return true;
        }
    }

    private static final class ProbeJdbcTemplate extends JdbcTemplate {
        private final ConcurrentHashMap<String, Map<String, Object>> devices = new ConcurrentHashMap<>();
        private final ConcurrentHashMap<String, Map<String, Object>> sessions = new ConcurrentHashMap<>();
        private final AtomicInteger totalSessionInsertAttempts = new AtomicInteger();
        private final AtomicInteger uniqueInsertedSessionIds = new AtomicInteger();
        private final AtomicLong pendingSessionScanQueries = new AtomicLong();
        private final AtomicLong scannedPendingRows = new AtomicLong();
        private final AtomicLong verifiedUpdates = new AtomicLong();

        @Override
        public int update(String sql, Object... args) {
            if (sql.contains("insert into sms_relay_device")) {
                Map<String, Object> row = new ConcurrentHashMap<>();
                row.put("device_id", args[0]);
                row.put("receiver_phone", args[1]);
                row.put("server_url", args[2]);
                row.put("message_prefix", args[3]);
                row.put("device_secret", args[4]);
                row.put("status", args[5]);
                devices.put(String.valueOf(args[0]), row);
                return 1;
            }

            if (sql.contains("insert into scan_verification_session")) {
                totalSessionInsertAttempts.incrementAndGet();
                String sessionId = String.valueOf(args[0]);
                Map<String, Object> row = sessionRowFromInsertArgs(args);
                Map<String, Object> previous = sessions.putIfAbsent(sessionId, row);
                if (previous != null) {
                    throw new DuplicateKeyException("duplicate session_id: " + sessionId);
                }
                uniqueInsertedSessionIds.incrementAndGet();
                return 1;
            }

            if (sql.contains("update scan_verification_session set status='EXPIRED'")) {
                Map<String, Object> row = sessions.get(String.valueOf(args[0]));
                if (row != null) {
                    row.put("status", "EXPIRED");
                    row.put("verified", false);
                }
                return 1;
            }

            if (sql.contains("set status='VERIFIED', verified=1")) {
                Map<String, Object> row = sessions.get(String.valueOf(args[2]));
                if (row != null) {
                    row.put("status", "VERIFIED");
                    row.put("verified", true);
                    row.put("verified_at", args[0]);
                    row.put("sender_phone_masked", args[1]);
                    verifiedUpdates.incrementAndGet();
                }
                return 1;
            }

            if (sql.contains("insert into sms_relay_record")) {
                return 1;
            }

            return 1;
        }

        @Override
        public <T> T queryForObject(String sql, Class<T> requiredType, Object... args) {
            if (sql.contains("select count(*) from sms_relay_device")) {
                Integer count = devices.containsKey(String.valueOf(args[0])) ? 1 : 0;
                return requiredType.cast(count);
            }
            return null;
        }

        @Override
        public Map<String, Object> queryForMap(String sql, Object... args) {
            if (sql.contains("from scan_verification_session")) {
                Map<String, Object> row = sessions.get(String.valueOf(args[0]));
                return row == null ? Map.of() : new HashMap<>(row);
            }
            if (sql.contains("from sms_relay_device")) {
                Map<String, Object> row = devices.get(String.valueOf(args[0]));
                return row == null ? Map.of() : new HashMap<>(row);
            }
            return Map.of();
        }

        @Override
        public List<Map<String, Object>> queryForList(String sql, Object... args) {
            if (sql.contains("from scan_verification_session where session_id=?")) {
                Map<String, Object> row = sessions.get(String.valueOf(args[0]));
                return row == null ? List.of() : List.of(new HashMap<>(row));
            }
            if (sql.contains("from sms_relay_device") && sql.contains("order by")) {
                if (devices.isEmpty()) {
                    return List.of();
                }
                Map<String, Object> row = new HashMap<>(devices.values().iterator().next());
                if (sql.contains("select device_id")) {
                    return List.of(Map.of("device_id", row.get("device_id")));
                }
                return List.of(row);
            }
            if (sql.contains("from sms_relay_device where device_id=?")) {
                Map<String, Object> row = devices.get(String.valueOf(args[0]));
                return row == null ? List.of() : List.of(new HashMap<>(row));
            }
            if (sql.contains("from scan_verification_session")
                    && sql.contains("status='PENDING'")
                    && sql.contains("receiver_phone=?")
                    && sql.contains("message_body=?")) {
                pendingSessionScanQueries.incrementAndGet();
                String receiverPhone = String.valueOf(args[0]);
                String messageBody = String.valueOf(args[1]);
                ArrayList<Map<String, Object>> rows = new ArrayList<>();
                for (Map<String, Object> value : sessions.values()) {
                    if (!"PENDING".equals(String.valueOf(value.get("status")))) {
                        continue;
                    }
                    if (!receiverPhone.equals(String.valueOf(value.get("receiver_phone")))) {
                        continue;
                    }
                    if (!messageBody.equals(String.valueOf(value.get("message_body")))) {
                        continue;
                    }
                    scannedPendingRows.incrementAndGet();
                    rows.add(new HashMap<>(value));
                }
                return rows;
            }
            return List.of();
        }

        @Override
        public List<Map<String, Object>> queryForList(String sql) {
            return queryForList(sql, new Object[0]);
        }

        private Map<String, Object> sessionRowFromInsertArgs(Object... args) {
            Map<String, Object> row = new ConcurrentHashMap<>();
            row.put("session_id", args[0]);
            row.put("elder_id", args[1]);
            row.put("target", args[2]);

            if (args.length == 10) {
                row.put("relay_device_id", args[3]);
                row.put("receiver_phone", args[4]);
                row.put("message_body", args[5]);
                row.put("message_prefix", args[6]);
                row.put("status", args[7]);
                row.put("expires_at", args[8]);
                row.put("verified", args[9]);
            } else if (args.length == 9) {
                row.put("receiver_phone", args[3]);
                row.put("message_body", args[4]);
                row.put("message_prefix", args[5]);
                row.put("status", args[6]);
                row.put("expires_at", args[7]);
                row.put("verified", args[8]);
            } else if (args.length == 15) {
                row.put("verification_method", args[3]);
                row.put("receiver_phone", args[4]);
                row.put("message_body", args[5]);
                row.put("message_prefix", args[6]);
                row.put("status", args[7]);
                row.put("expires_at", args[8]);
                row.put("verified", args[9]);
                row.put("verified_at", args[10]);
                row.put("sender_phone_masked", args[11]);
                row.put("visitor_name_enc", args[12]);
                row.put("visitor_phone_enc", args[13]);
                row.put("visitor_id_card_enc", args[14]);
            }

            row.putIfAbsent("verification_method", "SMS_RELAY");
            row.putIfAbsent("verified_at", "");
            row.putIfAbsent("sender_phone_masked", "");
            row.putIfAbsent("visitor_name_enc", "");
            row.putIfAbsent("visitor_phone_enc", "");
            row.putIfAbsent("visitor_id_card_enc", "");
            return row;
        }
    }
}
