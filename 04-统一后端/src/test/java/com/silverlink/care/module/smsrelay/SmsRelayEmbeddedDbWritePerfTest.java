package com.silverlink.care.module.smsrelay;

import com.silverlink.care.common.BizException;
import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import com.silverlink.care.module.scan.ScanVerificationSessionDto;
import com.silverlink.care.module.sms.SmsService;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.util.ReflectionTestUtils;

import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertTrue;

class SmsRelayEmbeddedDbWritePerfTest {

    private static final DateTimeFormatter FILE_TS =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH-mm-ss-SSS'Z'")
                    .withZone(ZoneId.of("UTC"));

    @Test
    void generateEmbeddedDbWritePressureReport() throws Exception {
        Report report = new Report();
        report.generatedAt = Instant.now().toString();
        report.environment = Map.of(
                "mode", "local-embedded-db-write-pressure",
                "scope", "real-jdbc-real-sql-not-host-benchmark",
                "database", "h2-in-memory-mysql-mode"
        );

        report.scenarios.add(runScanStartScenario());
        report.scenarios.add(runDirectSmsScenario());
        report.scenarios.add(runIdentityScenario());
        report.scenarios.add(runInboundRecordScenario());
        report.scenarios.add(runInboundFullScanScenario());

        writeReport(report);

        boolean hasCollision = report.scenarios.stream()
                .anyMatch(item -> item.errorBreakdown.keySet().stream().anyMatch(key -> key.contains("duplicate-session-id")));
        boolean hasInbound = report.scenarios.stream()
                .anyMatch(item -> item.name.contains("inbound") && item.successCount > 0);
        assertTrue(hasCollision && hasInbound);
    }

    private ScenarioReport runScanStartScenario() throws Exception {
        PerfFixture fixture = createFixture();
        return runScenario(
                "embedded-db-scan-start-write-pressure",
                1500,
                192,
                fixture,
                () -> fixture.service.createScanVerificationSession("elder-001", "health", null)
        );
    }

    private ScenarioReport runDirectSmsScenario() throws Exception {
        PerfFixture fixture = createFixture();
        return runScenario(
                "embedded-db-direct-sms-write-pressure",
                1500,
                192,
                fixture,
                () -> fixture.service.createDirectSmsVerificationSession("elder-001", "health", "13800000000")
        );
    }

    private ScenarioReport runIdentityScenario() throws Exception {
        PerfFixture fixture = createFixture();
        AtomicInteger cursor = new AtomicInteger();
        return runScenario(
                "embedded-db-identity-write-pressure",
                1500,
                192,
                fixture,
                () -> {
                    int index = cursor.incrementAndGet();
                    return fixture.service.createIdentityVerificationSession(
                            "elder-001",
                            "health",
                            "访客" + index,
                            phoneFor(index),
                            idCardFor(index)
                    );
                }
        );
    }

    private ScenarioReport runInboundRecordScenario() throws Exception {
        PerfFixture fixture = createFixture();
        seedPendingSessions(fixture.jdbc, 5000, "relay-android-01");

        InboundSmsRequest request = new InboundSmsRequest();
        request.setDeviceId("relay-android-01");
        request.setReceiverPhone("13800001111");
        request.setSenderPhone("13999990000");
        request.setMessageBody("SL MATCHME999");
        request.setReceivedAt(System.currentTimeMillis());
        request.setMessagePrefix("SL");

        long pendingBefore = fixture.jdbc.queryForObject(
                "select count(*) from scan_verification_session where status='PENDING'",
                Long.class
        );

        ScenarioReport report = runScenario(
                "embedded-db-inbound-record-write-pressure",
                120,
                24,
                fixture,
                () -> {
                    fixture.service.handleInbound(request, "secret-001");
                    return null;
                }
        );
        long recordsInserted = fixture.jdbc.queryForObject("select count(*) from sms_relay_record", Long.class);
        long verifiedCount = fixture.jdbc.queryForObject(
                "select count(*) from scan_verification_session where status='VERIFIED'",
                Long.class
        );
        report.notes.add("这一段保留高并发，优先观察 `sms_relay_record` 写入和入站链路主键策略。");
        report.metrics.put("pendingRowsBefore", pendingBefore);
        report.metrics.put("recordsInserted", recordsInserted);
        report.metrics.put("verifiedCountAfter", verifiedCount);
        report.findings.add("入站链路除了全表扫描问题，还有 `recordId` 毫秒时间戳生成导致的主键冲突风险。");
        return report;
    }

    private ScenarioReport runInboundFullScanScenario() throws Exception {
        PerfFixture fixture = createFixture();
        seedPendingSessions(fixture.jdbc, 5000, "relay-android-01");

        InboundSmsRequest request = new InboundSmsRequest();
        request.setDeviceId("relay-android-01");
        request.setReceiverPhone("13800001111");
        request.setSenderPhone("13999990000");
        request.setMessageBody("SL MATCHME999");
        request.setReceivedAt(System.currentTimeMillis());
        request.setMessagePrefix("SL");

        long pendingBefore = fixture.jdbc.queryForObject(
                "select count(*) from scan_verification_session where status='PENDING'",
                Long.class
        );

        ScenarioReport report = runScenario(
                "embedded-db-inbound-pending-fullscan-latency",
                30,
                1,
                fixture,
                () -> {
                    fixture.service.handleInbound(request, "secret-001");
                    return null;
                }
        );
        long recordsInserted = fixture.jdbc.queryForObject("select count(*) from sms_relay_record", Long.class);
        long verifiedCount = fixture.jdbc.queryForObject(
                "select count(*) from scan_verification_session where status='VERIFIED'",
                Long.class
        );
        report.notes.add("这一段刻意把并发降到 1，避免先被 `sms_relay_record` 主键冲突破坏，专门观察全量扫描的真实 JDBC 延迟。");
        report.notes.add("扫描行数是根据 SQL 形状推导，不是数据库执行计划采样。");
        report.metrics.put("pendingRowsBefore", pendingBefore);
        report.metrics.put("estimatedRowsVisited", pendingBefore * report.totalRequests);
        report.metrics.put("recordsInserted", recordsInserted);
        report.metrics.put("verifiedCountAfter", verifiedCount);
        report.findings.add("每次入站都需要把所有 `PENDING` 会话取回应用层逐条比对，数据库工作量随待验证会话数线性放大。");
        return report;
    }

    private ScenarioReport runScenario(
            String name,
            int totalRequests,
            int concurrency,
            PerfFixture fixture,
            ThrowingSupplier<?> action
    ) throws Exception {
        ConcurrentLinkedQueue<Long> durations = new ConcurrentLinkedQueue<>();
        ConcurrentHashMap<String, AtomicInteger> errors = new ConcurrentHashMap<>();
        AtomicInteger success = new AtomicInteger();
        AtomicInteger failure = new AtomicInteger();

        runConcurrent(totalRequests, concurrency, () -> {
            long startedAt = System.nanoTime();
            try {
                action.get();
                success.incrementAndGet();
            } catch (Throwable throwable) {
                failure.incrementAndGet();
                errors.computeIfAbsent(classify(throwable), key -> new AtomicInteger()).incrementAndGet();
            } finally {
                durations.add(TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt));
            }
            return null;
        });

        ScenarioReport report = new ScenarioReport();
        report.name = name;
        report.totalRequests = totalRequests;
        report.concurrency = concurrency;
        report.successCount = success.get();
        report.failureCount = failure.get();
        report.successRate = percent(report.successCount, totalRequests);
        report.p50Ms = percentile(durations, 50);
        report.p95Ms = percentile(durations, 95);
        report.p99Ms = percentile(durations, 99);
        report.maxMs = durations.stream().mapToLong(Long::longValue).max().orElse(0L);
        errors.forEach((key, value) -> report.errorBreakdown.put(key, value.get()));

        if (report.errorBreakdown.containsKey("duplicate-session-id")) {
            report.findings.add("真实数据库主键约束下，`sessionId` 毫秒级生成在并发中稳定发生冲突。");
        }
        if (report.errorBreakdown.containsKey("duplicate-relay-record-id")) {
            report.findings.add("入站记录 `recordId` 同样使用毫秒时间戳，高并发下会撞 `sms_relay_record` 主键。");
        }
        if (report.failureCount == 0 && name.contains("inbound")) {
            report.findings.add("入站写链路在当前强度下能完成，但它的查询模式仍然是线性放大。");
        }
        report.metrics.put("sessionRows", fixture.jdbc.queryForObject("select count(*) from scan_verification_session", Long.class));
        return report;
    }

    private PerfFixture createFixture() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName("org.h2.Driver");
        dataSource.setUrl("jdbc:h2:mem:" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE");
        dataSource.setUsername("sa");
        dataSource.setPassword("");
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        bootstrapSchema(jdbc);

        StubDataService dataService = new StubDataService();
        StubSmsService smsService = new StubSmsService();
        SmsRelayService service = new SmsRelayService(jdbc, smsService, dataService);
        ReflectionTestUtils.setField(service, "receiverPhone", "13800001111");
        ReflectionTestUtils.setField(service, "messagePrefix", "SL");
        ReflectionTestUtils.setField(service, "sessionTtlSeconds", 300L);
        ReflectionTestUtils.setField(service, "serverUrl", "https://local.test");
        ReflectionTestUtils.setField(service, "defaultDeviceId", "relay-android-01");
        ReflectionTestUtils.setField(service, "defaultDeviceSecret", "secret-001");
        ReflectionTestUtils.setField(service, "signatureWindowSeconds", 300L);
        ReflectionTestUtils.setField(service, "authorizationWindowSeconds", 600L);
        service.ensureDefaultDevice();
        return new PerfFixture(dataSource, jdbc, service);
    }

    private void bootstrapSchema(JdbcTemplate jdbc) {
        jdbc.execute("""
                create table sms_relay_device (
                  device_id varchar(64) primary key,
                  receiver_phone varchar(32) not null,
                  server_url varchar(255) not null,
                  message_prefix varchar(32) not null,
                  device_secret varchar(128) not null,
                  status varchar(20) not null default '离线',
                  last_heartbeat varchar(64),
                  created_at timestamp not null default current_timestamp(),
                  updated_at timestamp not null default current_timestamp()
                )
                """);
        jdbc.execute("create index idx_sms_relay_device_updated_at on sms_relay_device(updated_at)");

        jdbc.execute("""
                create table sms_relay_record (
                  id varchar(64) primary key,
                  device_id varchar(64) not null,
                  receiver_phone varchar(32) not null,
                  sender_phone varchar(32) not null,
                  message_body varchar(512) not null,
                  received_at bigint not null,
                  message_prefix varchar(32),
                  uploaded_at bigint not null,
                  status varchar(20) not null default 'UPLOADED'
                )
                """);
        jdbc.execute("create index idx_sms_relay_record_device on sms_relay_record(device_id)");
        jdbc.execute("create index idx_sms_relay_record_received_at on sms_relay_record(received_at)");

        jdbc.execute("""
                create table scan_verification_session (
                  session_id varchar(64) primary key,
                  elder_id varchar(64),
                  target varchar(64),
                  relay_device_id varchar(64),
                  verification_method varchar(32) not null default 'SMS_RELAY',
                  receiver_phone varchar(32) not null,
                  message_body varchar(128) not null,
                  message_prefix varchar(32) not null,
                  status varchar(20) not null default 'PENDING',
                  expires_at varchar(64) not null,
                  verified tinyint not null default 0,
                  verified_at varchar(64),
                  sender_phone_masked varchar(32),
                  visitor_name_enc clob,
                  visitor_phone_enc clob,
                  visitor_id_card_enc clob,
                  created_at timestamp not null default current_timestamp(),
                  updated_at timestamp not null default current_timestamp()
                )
                """);
        jdbc.execute("create index idx_scan_verification_status on scan_verification_session(status)");
        jdbc.execute("create index idx_scan_verification_expires on scan_verification_session(expires_at)");
        jdbc.execute("create index idx_scan_verification_relay_device on scan_verification_session(relay_device_id)");
    }

    private void seedPendingSessions(JdbcTemplate jdbc, int count, String deviceId) {
        String expiresAt = Instant.now().plusSeconds(600).toString();
        for (int index = 0; index < count; index += 1) {
            String message = index == count - 1 ? "SL MATCHME999" : "SL TOKEN" + index;
            jdbc.update("""
                    insert into scan_verification_session
                    (session_id, elder_id, target, relay_device_id, verification_method, receiver_phone, message_body, message_prefix,
                     status, expires_at, verified, visitor_name_enc, visitor_phone_enc, visitor_id_card_enc)
                    values (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                    """,
                    "pending-" + index,
                    "elder-" + (index % 10),
                    "health",
                    deviceId,
                    "SMS_RELAY",
                    "13800001111",
                    message,
                    "SL",
                    "PENDING",
                    expiresAt,
                    0,
                    "",
                    "",
                    ""
            );
        }
    }

    private void runConcurrent(int totalRequests, int concurrency, ThrowingSupplier<?> action) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(concurrency);
        CountDownLatch ready = new CountDownLatch(concurrency);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger issued = new AtomicInteger();
        ConcurrentLinkedQueue<Throwable> harnessFailures = new ConcurrentLinkedQueue<>();

        for (int worker = 0; worker < concurrency; worker += 1) {
            pool.submit(() -> {
                ready.countDown();
                try {
                    start.await(30, TimeUnit.SECONDS);
                    while (true) {
                        int current = issued.getAndIncrement();
                        if (current >= totalRequests) {
                            break;
                        }
                        action.get();
                    }
                } catch (Throwable throwable) {
                    harnessFailures.add(throwable);
                }
            });
        }

        ready.await(30, TimeUnit.SECONDS);
        start.countDown();
        pool.shutdown();
        boolean finished = pool.awaitTermination(10, TimeUnit.MINUTES);
        if (!finished) {
            pool.shutdownNow();
            throw new IllegalStateException("Embedded DB write pressure run timed out");
        }
        if (!harnessFailures.isEmpty()) {
            throw new RuntimeException("Harness worker failed", harnessFailures.peek());
        }
    }

    private static String classify(Throwable throwable) {
        Throwable cursor = throwable;
        while (cursor != null) {
            String message = cursor.getMessage();
            if (message != null) {
                String lower = message.toLowerCase(Locale.ROOT);
                if ((lower.contains("unique index") || lower.contains("primary key")) && lower.contains("sms_relay_record")) {
                    return "duplicate-relay-record-id";
                }
                if ((lower.contains("unique index") || lower.contains("primary key")) && lower.contains("scan_verification_session")) {
                    return "duplicate-session-id";
                }
                if (lower.contains("verification phone mismatch")) {
                    return "verification-phone-mismatch";
                }
            }
            cursor = cursor.getCause();
        }
        if (throwable instanceof BizException bizException) {
            return "biz-" + bizException.getCode();
        }
        if (throwable instanceof DataAccessException) {
            return "data-access-exception";
        }
        return throwable.getClass().getSimpleName();
    }

    private static double percent(int numerator, int denominator) {
        if (denominator == 0) {
            return 0;
        }
        return Math.round((numerator * 10000.0) / denominator) / 100.0;
    }

    private static long percentile(ConcurrentLinkedQueue<Long> durations, int percentile) {
        List<Long> values = new ArrayList<>(durations);
        if (values.isEmpty()) {
            return 0;
        }
        values.sort(Comparator.naturalOrder());
        int index = (int) Math.ceil((percentile / 100.0) * values.size()) - 1;
        return values.get(Math.max(0, Math.min(values.size() - 1, index)));
    }

    private static String phoneFor(int index) {
        return "138" + String.format(Locale.ROOT, "%08d", index % 100000000);
    }

    private static String idCardFor(int index) {
        int sequence = index % 1000;
        String base = "50010220021218" + String.format(Locale.ROOT, "%03d", sequence);
        return appendIdChecksum(base);
    }

    private static String appendIdChecksum(String first17Digits) {
        int[] weights = {7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2};
        char[] checksums = {'1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'};
        int total = 0;
        for (int i = 0; i < 17; i += 1) {
            total += (first17Digits.charAt(i) - '0') * weights[i];
        }
        return first17Digits + checksums[total % 11];
    }

    private void writeReport(Report report) throws Exception {
        Path cwd = Paths.get("").toAbsolutePath();
        Path root = cwd.getFileName() != null && "04-统一后端".equals(cwd.getFileName().toString())
                ? cwd.getParent()
                : cwd;
        Path outDir = root.resolve("06-测试与质量保障/reports/performance");
        Files.createDirectories(outDir);
        String fileStem = FILE_TS.format(Instant.now()) + "-local-embeddeddb-write-pressure";
        Path jsonPath = outDir.resolve(fileStem + ".json");
        Path mdPath = outDir.resolve(fileStem + ".md");
        Files.writeString(jsonPath, report.toJson(), StandardCharsets.UTF_8);
        Files.writeString(mdPath, report.toMarkdown(jsonPath.getFileName().toString()), StandardCharsets.UTF_8);
    }

    private interface ThrowingSupplier<T> {
        T get() throws Exception;
    }

    private record PerfFixture(DataSource dataSource, JdbcTemplate jdbc, SmsRelayService service) {}

    private static final class StubSmsService extends SmsService {
        StubSmsService() {
            super(null, new StubDataService(), null);
        }

        @Override
        public String sendCode(String phone, String scene) {
            return "123456";
        }

        @Override
        public boolean verify(String phone, String code, String scene) {
            return true;
        }
    }

    private static class StubDataService extends SilverLinkDataService {
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

    private static final class Report {
        String generatedAt;
        Map<String, Object> environment = new LinkedHashMap<>();
        List<ScenarioReport> scenarios = new ArrayList<>();

        String toJson() {
            StringBuilder builder = new StringBuilder();
            builder.append("{\n");
            builder.append("  \"generatedAt\": \"").append(escape(generatedAt)).append("\",\n");
            builder.append("  \"environment\": ").append(toJsonObject(environment, 2)).append(",\n");
            builder.append("  \"scenarios\": [\n");
            for (int i = 0; i < scenarios.size(); i += 1) {
                builder.append(scenarios.get(i).toJson("    "));
                if (i < scenarios.size() - 1) {
                    builder.append(',');
                }
                builder.append('\n');
            }
            builder.append("  ]\n");
            builder.append("}\n");
            return builder.toString();
        }

        String toMarkdown(String jsonFileName) {
            List<String> lines = new ArrayList<>();
            lines.add("# 本机嵌入式数据库写链路压测");
            lines.add("");
            lines.add("- 生成时间：" + generatedAt);
            lines.add("- 模式：本机嵌入式数据库（H2 MySQL mode）");
            lines.add("- 目标：验证真实 JDBC / 真实主键约束 / 真实写 SQL 下的并发设计缺陷，而不是测宿主机跑分");
            lines.add("- JSON 报告：" + jsonFileName);
            lines.add("");
            for (ScenarioReport scenario : scenarios) {
                lines.add("## " + scenario.name);
                lines.add("");
                lines.add("- 总请求：" + scenario.totalRequests);
                lines.add("- 并发：" + scenario.concurrency);
                lines.add("- 成功：" + scenario.successCount);
                lines.add("- 失败：" + scenario.failureCount);
                lines.add("- 成功率：" + scenario.successRate + "%");
                lines.add("- P50：" + scenario.p50Ms + "ms");
                lines.add("- P95：" + scenario.p95Ms + "ms");
                lines.add("- P99：" + scenario.p99Ms + "ms");
                lines.add("- Max：" + scenario.maxMs + "ms");
                if (!scenario.errorBreakdown.isEmpty()) {
                    lines.add("- 错误分布：");
                    scenario.errorBreakdown.forEach((key, value) -> lines.add("  - " + key + ": " + value));
                }
                if (!scenario.metrics.isEmpty()) {
                    lines.add("- 附加指标：");
                    scenario.metrics.forEach((key, value) -> lines.add("  - " + key + ": " + value));
                }
                if (!scenario.findings.isEmpty()) {
                    lines.add("- 结论：");
                    scenario.findings.forEach(text -> lines.add("  - " + text));
                }
                if (!scenario.notes.isEmpty()) {
                    lines.add("- 说明：");
                    scenario.notes.forEach(text -> lines.add("  - " + text));
                }
                lines.add("");
            }
            lines.add("## 总结");
            lines.add("");
            lines.add("- 这轮已经把“本地真实数据库写链路压测”推进到嵌入式真实数据库层，使用了真实 JDBC、真实主键约束和真实 SQL。");
            lines.add("- 它仍然不是 MySQL/Testcontainers，因此不能替代最终的 MySQL 专项结论，但已经比 fake-jdbc 探针更接近真实执行路径。");
            return String.join("\n", lines) + "\n";
        }

        private static String toJsonObject(Map<String, Object> values, int indent) {
            String padding = " ".repeat(indent);
            String childPadding = " ".repeat(indent + 2);
            StringBuilder builder = new StringBuilder();
            builder.append("{\n");
            int index = 0;
            for (Map.Entry<String, Object> entry : values.entrySet()) {
                builder.append(childPadding)
                        .append('"').append(escape(entry.getKey())).append("\": ")
                        .append(toJsonValue(entry.getValue(), indent + 2));
                if (index < values.size() - 1) {
                    builder.append(',');
                }
                builder.append('\n');
                index += 1;
            }
            builder.append(padding).append('}');
            return builder.toString();
        }

        @SuppressWarnings("unchecked")
        private static String toJsonValue(Object value, int indent) {
            if (value == null) {
                return "null";
            }
            if (value instanceof Number || value instanceof Boolean) {
                return String.valueOf(value);
            }
            if (value instanceof Map<?, ?> mapValue) {
                return toJsonObject((Map<String, Object>) mapValue, indent);
            }
            return "\"" + escape(String.valueOf(value)) + "\"";
        }
    }

    private static final class ScenarioReport {
        String name;
        int totalRequests;
        int concurrency;
        int successCount;
        int failureCount;
        double successRate;
        long p50Ms;
        long p95Ms;
        long p99Ms;
        long maxMs;
        Map<String, Integer> errorBreakdown = new LinkedHashMap<>();
        Map<String, Object> metrics = new LinkedHashMap<>();
        List<String> findings = new ArrayList<>();
        List<String> notes = new ArrayList<>();

        String toJson(String indent) {
            String child = indent + "  ";
            StringBuilder builder = new StringBuilder();
            builder.append(indent).append("{\n");
            builder.append(child).append("\"name\": \"").append(escape(name)).append("\",\n");
            builder.append(child).append("\"totalRequests\": ").append(totalRequests).append(",\n");
            builder.append(child).append("\"concurrency\": ").append(concurrency).append(",\n");
            builder.append(child).append("\"successCount\": ").append(successCount).append(",\n");
            builder.append(child).append("\"failureCount\": ").append(failureCount).append(",\n");
            builder.append(child).append("\"successRate\": ").append(successRate).append(",\n");
            builder.append(child).append("\"p50Ms\": ").append(p50Ms).append(",\n");
            builder.append(child).append("\"p95Ms\": ").append(p95Ms).append(",\n");
            builder.append(child).append("\"p99Ms\": ").append(p99Ms).append(",\n");
            builder.append(child).append("\"maxMs\": ").append(maxMs).append(",\n");
            builder.append(child).append("\"errorBreakdown\": ").append(Report.toJsonObject(new LinkedHashMap<>(errorBreakdown), child.length())).append(",\n");
            builder.append(child).append("\"metrics\": ").append(Report.toJsonObject(metrics, child.length())).append(",\n");
            builder.append(child).append("\"findings\": ").append(toJsonArray(findings)).append(",\n");
            builder.append(child).append("\"notes\": ").append(toJsonArray(notes)).append('\n');
            builder.append(indent).append("}");
            return builder.toString();
        }

        private static String toJsonArray(List<String> values) {
            StringBuilder builder = new StringBuilder("[");
            for (int i = 0; i < values.size(); i += 1) {
                if (i > 0) {
                    builder.append(", ");
                }
                builder.append('"').append(escape(values.get(i))).append('"');
            }
            builder.append(']');
            return builder.toString();
        }
    }

    private static String escape(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n");
    }
}
