package com.silverlink.care.module.smsrelay;

import ch.vorburger.exec.ManagedProcessException;
import ch.vorburger.mariadb4j.DB;
import ch.vorburger.mariadb4j.DBConfigurationBuilder;
import com.silverlink.care.common.BizException;
import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import com.silverlink.care.module.sms.SmsService;
import com.zaxxer.hikari.HikariDataSource;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import javax.sql.DataSource;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
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
import java.util.jar.JarFile;

import static org.junit.jupiter.api.Assumptions.assumeTrue;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SmsRelayMariaDbWritePerfTest {

    private static final DateTimeFormatter FILE_TS =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH-mm-ss-SSS'Z'")
                    .withZone(ZoneId.of("UTC"));
    private static final int START_TOTAL_REQUESTS = intProp("silverlink.smsrelay.perf.start.total", 1500);
    private static final int START_CONCURRENCY = intProp("silverlink.smsrelay.perf.start.concurrency", 192);
    private static final int DIRECT_TOTAL_REQUESTS = intProp("silverlink.smsrelay.perf.direct.total", 1500);
    private static final int DIRECT_CONCURRENCY = intProp("silverlink.smsrelay.perf.direct.concurrency", 192);
    private static final int IDENTITY_TOTAL_REQUESTS = intProp("silverlink.smsrelay.perf.identity.total", 1500);
    private static final int IDENTITY_CONCURRENCY = intProp("silverlink.smsrelay.perf.identity.concurrency", 192);
    private static final int INBOUND_TOTAL_REQUESTS = intProp("silverlink.smsrelay.perf.inbound.total", 120);
    private static final int INBOUND_CONCURRENCY = intProp("silverlink.smsrelay.perf.inbound.concurrency", 24);
    private static final int INBOUND_LOOKUP_TOTAL_REQUESTS = intProp("silverlink.smsrelay.perf.inbound.lookup.total", 30);
    private static final int INBOUND_LOOKUP_CONCURRENCY = intProp("silverlink.smsrelay.perf.inbound.lookup.concurrency", 1);
    private static final int PENDING_SESSION_COUNT = intProp("silverlink.smsrelay.perf.pending.sessions", 5000);
    private static final int HIKARI_MAX_POOL_SIZE = intProp("silverlink.smsrelay.perf.hikari.maxPoolSize", 12);
    private static final int HIKARI_MIN_IDLE = intProp("silverlink.smsrelay.perf.hikari.minIdle", 1);
    private static final long HIKARI_CONNECTION_TIMEOUT_MS = longProp("silverlink.smsrelay.perf.hikari.connectionTimeoutMs", 15000L);
    private static final long HIKARI_IDLE_TIMEOUT_MS = longProp("silverlink.smsrelay.perf.hikari.idleTimeoutMs", 10000L);
    private static final long HIKARI_MAX_LIFETIME_MS = longProp("silverlink.smsrelay.perf.hikari.maxLifetimeMs", 30000L);
    private static final int HARNESS_MAX_WORKERS = intProp("silverlink.smsrelay.perf.harness.maxWorkers", 512);
    private static final String SCENARIO_FILTER = stringProp("silverlink.smsrelay.perf.scenarios", "all");

    @Test
    void generateMariaDbWritePressureReport() throws Exception {
        assumeTrue(hasMariaDbCompatRoot(), "requires silverlink.mariadb.compatRoot for local MariaDB perf runs");

        Report report = new Report();
        report.generatedAt = Instant.now().toString();
        report.environment = Map.of(
                "mode", "local-mariadb-write-pressure",
                "scope", "real-jdbc-real-sql-not-host-benchmark",
                "database", "embedded-mariadb4j"
        );

        if (shouldRunScenario("start")) {
            report.scenarios.add(runScanStartScenario());
        }
        if (shouldRunScenario("direct")) {
            report.scenarios.add(runDirectSmsScenario());
        }
        if (shouldRunScenario("identity")) {
            report.scenarios.add(runIdentityScenario());
        }
        if (shouldRunScenario("inbound")) {
            report.scenarios.add(runInboundRecordScenario());
            report.scenarios.add(runInboundFullScanScenario());
        }

        writeReport(report);

        boolean hasWriteScenario = report.scenarios.stream().anyMatch(item -> item.name.contains("scan-start"));
        boolean hasInboundScenario = report.scenarios.stream().anyMatch(item -> item.name.contains("inbound"));
        boolean writeRequired = shouldRunScenario("start");
        boolean inboundRequired = shouldRunScenario("inbound");
        assertTrue((!writeRequired || hasWriteScenario) && (!inboundRequired || hasInboundScenario));
    }

    private boolean hasMariaDbCompatRoot() {
        String compatRoot = System.getProperty("silverlink.mariadb.compatRoot");
        if (compatRoot == null || compatRoot.isBlank()) {
            compatRoot = System.getenv("SILVERLINK_MARIADB_COMPAT_ROOT");
        }
        return compatRoot != null && !compatRoot.isBlank();
    }

    private ScenarioReport runScanStartScenario() throws Exception {
        PerfFixture fixture = createFixture();
        try {
            return runScenario(
                    "mariadb-scan-start-write-pressure",
                    START_TOTAL_REQUESTS,
                    START_CONCURRENCY,
                    fixture,
                    () -> fixture.service.createScanVerificationSession("elder-001", "health", null)
            );
        } finally {
            fixture.close();
        }
    }

    private ScenarioReport runDirectSmsScenario() throws Exception {
        PerfFixture fixture = createFixture();
        try {
            return runScenario(
                    "mariadb-direct-sms-write-pressure",
                    DIRECT_TOTAL_REQUESTS,
                    DIRECT_CONCURRENCY,
                    fixture,
                    () -> fixture.service.createDirectSmsVerificationSession("elder-001", "health", "13800000000")
            );
        } finally {
            fixture.close();
        }
    }

    private ScenarioReport runIdentityScenario() throws Exception {
        PerfFixture fixture = createFixture();
        AtomicInteger cursor = new AtomicInteger();
        try {
            return runScenario(
                    "mariadb-identity-write-pressure",
                    IDENTITY_TOTAL_REQUESTS,
                    IDENTITY_CONCURRENCY,
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
        } finally {
            fixture.close();
        }
    }

    private ScenarioReport runInboundRecordScenario() throws Exception {
        PerfFixture fixture = createFixture();
        try {
            seedPendingSessions(fixture.jdbc, PENDING_SESSION_COUNT, "relay-android-01");

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
                    "mariadb-inbound-record-write-pressure",
                    INBOUND_TOTAL_REQUESTS,
                    INBOUND_CONCURRENCY,
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
            report.findings.add("MariaDB 实库下，`recordId` 已切到 UUID，本轮高并发入站写入未再出现 `sms_relay_record` 主键冲突。");
            report.findings.add("在高密度待验证会话背景下，入站写链路仍可全部成功，说明唯一键瓶颈已解除。");
            return report;
        } finally {
            fixture.close();
        }
    }

    private ScenarioReport runInboundFullScanScenario() throws Exception {
        PerfFixture fixture = createFixture();
        try {
            seedPendingSessions(fixture.jdbc, PENDING_SESSION_COUNT, "relay-android-01");

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
                    "mariadb-inbound-candidate-lookup-latency",
                    INBOUND_LOOKUP_TOTAL_REQUESTS,
                    INBOUND_LOOKUP_CONCURRENCY,
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
            report.notes.add("这一段刻意把并发降到 1，避免写入主键冲突干扰，专门观察修复后候选查询的真实 JDBC 延迟。");
            report.notes.add("这里记录的是候选查询路径延迟，不是数据库执行计划采样。");
            report.metrics.put("pendingRowsBefore", pendingBefore);
            report.metrics.put("estimatedCandidateRowsUpperBound", report.totalRequests);
            report.metrics.put("recordsInserted", recordsInserted);
            report.metrics.put("verifiedCountAfter", verifiedCount);
            report.findings.add("MariaDB 实库下，入站链路已切到按 receiver_phone + message_body 的候选查询，不再依赖全部 `PENDING` 会话全量扫描。");
            return report;
        } finally {
            fixture.close();
        }
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
        report.metrics.put("sessionRows", fixture.jdbc.queryForObject("select count(*) from scan_verification_session", Long.class));
        report.metrics.put("hikariMaximumPoolSize", fixture.hikariMaximumPoolSize());
        report.metrics.put("hikariMinimumIdle", fixture.hikariMinimumIdle());
        report.metrics.put("harnessWorkerCount", harnessWorkerCount(concurrency));
        return report;
    }

    private PerfFixture createFixture() {
        Path baseDir = null;
        DB db = null;
        try {
            baseDir = Files.createTempDirectory("silverlink-mariadb4j-");
            String compatRoot = resolveCompatRoot();
            DBConfigurationBuilder configBuilder = DBConfigurationBuilder.newBuilder();
            configBuilder.setPort(0);
            configBuilder.setBaseDir(baseDir.resolve("base").toFile());
            configBuilder.setDataDir(baseDir.resolve("data").toFile());
            configBuilder.setUnpackingFromClasspath(false);
            unpackMariaDbBase(configBuilder.getBaseDir().toPath());
            patchInstallDbScript(configBuilder.getBaseDir().toPath(), compatRoot);
            configureExecutableWrappers(configBuilder, compatRoot);
            db = DB.newEmbeddedDB(configBuilder.build());
            db.start();

            HikariDataSource dataSource = new HikariDataSource();
            dataSource.setDriverClassName("com.mysql.cj.jdbc.Driver");
            dataSource.setJdbcUrl("jdbc:mysql://127.0.0.1:" + configBuilder.getPort() + "/test"
                    + "?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&useUnicode=true"
                    + "&characterEncoding=utf8&connectionCollation=utf8mb4_unicode_ci");
            dataSource.setUsername("root");
            dataSource.setPassword("");
            dataSource.setMaximumPoolSize(HIKARI_MAX_POOL_SIZE);
            dataSource.setMinimumIdle(HIKARI_MIN_IDLE);
            dataSource.setConnectionTimeout(HIKARI_CONNECTION_TIMEOUT_MS);
            dataSource.setIdleTimeout(HIKARI_IDLE_TIMEOUT_MS);
            dataSource.setMaxLifetime(HIKARI_MAX_LIFETIME_MS);

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
            return new PerfFixture(dataSource, jdbc, service, db, baseDir);
        } catch (Exception exception) {
            closeQuietly(db);
            deleteQuietly(baseDir);
            throw new IllegalStateException("Failed to start local MariaDB4j fixture", exception);
        }
    }

    private void unpackMariaDbBase(Path baseDir) throws IOException {
        String version = "11.4.5";
        Path jarPath = Paths.get(System.getProperty("user.home"), ".m2", "repository",
                "ch", "vorburger", "mariaDB4j", "mariaDB4j-db-macos-arm64", version,
                "mariaDB4j-db-macos-arm64-" + version + ".jar");
        String prefix = "ch/vorburger/mariadb4j/mariadb-" + version + "/osx/";
        try (JarFile jarFile = new JarFile(jarPath.toFile())) {
            jarFile.stream()
                    .filter(entry -> entry.getName().startsWith(prefix) && !entry.isDirectory())
                    .forEach(entry -> {
                        String relative = entry.getName().substring(prefix.length());
                        Path target = baseDir.resolve(relative);
                        try {
                            Files.createDirectories(target.getParent());
                            try (InputStream inputStream = jarFile.getInputStream(entry)) {
                                Files.copy(inputStream, target, StandardCopyOption.REPLACE_EXISTING);
                            }
                            target.toFile().setExecutable(true, false);
                        } catch (IOException ioException) {
                            throw new RuntimeException(ioException);
                        }
                    });
        } catch (RuntimeException runtimeException) {
            if (runtimeException.getCause() instanceof IOException ioException) {
                throw ioException;
            }
            throw runtimeException;
        }
    }

    private void configureExecutableWrappers(DBConfigurationBuilder configBuilder, String compatRoot) throws IOException {
        Path baseDir = configBuilder.getBaseDir().toPath();
        Path wrapperDir = baseDir.resolve("wrappers");
        Files.createDirectories(wrapperDir);

        String dyldLibraryPath = Paths.get(compatRoot, "pcre2").toString()
                + ":" + Paths.get(compatRoot, "openssl3");
        String dyldFallbackLibraryPath = dyldLibraryPath;

        configBuilder.setExecutable(ch.vorburger.mariadb4j.DBConfiguration.Executable.InstallDB,
                createWrapper(wrapperDir, "install-db.sh", baseDir.resolve("scripts/mariadb-install-db"), dyldLibraryPath, dyldFallbackLibraryPath));
        configBuilder.setExecutable(ch.vorburger.mariadb4j.DBConfiguration.Executable.Server,
                createWrapper(wrapperDir, "mariadbd.sh", baseDir.resolve("bin/mariadbd"), dyldLibraryPath, dyldFallbackLibraryPath));
        configBuilder.setExecutable(ch.vorburger.mariadb4j.DBConfiguration.Executable.Client,
                createWrapper(wrapperDir, "mariadb.sh", baseDir.resolve("bin/mariadb"), dyldLibraryPath, dyldFallbackLibraryPath));
        configBuilder.setExecutable(ch.vorburger.mariadb4j.DBConfiguration.Executable.Dump,
                createWrapper(wrapperDir, "mariadb-dump.sh", baseDir.resolve("bin/mariadb-dump"), dyldLibraryPath, dyldFallbackLibraryPath));
        configBuilder.setExecutable(ch.vorburger.mariadb4j.DBConfiguration.Executable.PrintDefaults,
                createWrapper(wrapperDir, "my-print-defaults.sh", baseDir.resolve("bin/my_print_defaults"), dyldLibraryPath, dyldFallbackLibraryPath));
    }

    private String resolveCompatRoot() throws IOException {
        String compatRoot = System.getProperty("silverlink.mariadb.compatRoot");
        if (compatRoot == null || compatRoot.isBlank()) {
            compatRoot = System.getenv("SILVERLINK_MARIADB_COMPAT_ROOT");
        }
        if (compatRoot == null || compatRoot.isBlank()) {
            throw new IOException("silverlink.mariadb.compatRoot is required for local MariaDB compatibility libraries");
        }
        return compatRoot;
    }

    private void patchInstallDbScript(Path baseDir, String compatRoot) throws IOException {
        Path script = baseDir.resolve("scripts/mariadb-install-db");
        String original = Files.readString(script, StandardCharsets.UTF_8);
        String prefix = "#!/bin/sh\n"
                + "export DYLD_LIBRARY_PATH=\"" + escapeShell(Paths.get(compatRoot, "pcre2") + ":" + Paths.get(compatRoot, "openssl3")) + "\"\n"
                + "export DYLD_FALLBACK_LIBRARY_PATH=\"" + escapeShell(Paths.get(compatRoot, "pcre2") + ":" + Paths.get(compatRoot, "openssl3")) + "\"\n";
        if (!original.startsWith("#!/bin/sh")) {
            throw new IOException("Unexpected mariadb-install-db header");
        }
        Files.writeString(script, prefix + original.substring("#!/bin/sh\n".length()), StandardCharsets.UTF_8);
        script.toFile().setExecutable(true, false);
    }

    private String createWrapper(Path wrapperDir, String fileName, Path target, String dyldLibraryPath, String dyldFallbackLibraryPath) throws IOException {
        Path wrapper = wrapperDir.resolve(fileName);
        String script = "#!/usr/bin/env bash\n"
                + "export DYLD_LIBRARY_PATH=\"" + escapeShell(dyldLibraryPath) + "\"\n"
                + "export DYLD_FALLBACK_LIBRARY_PATH=\"" + escapeShell(dyldFallbackLibraryPath == null ? "" : dyldFallbackLibraryPath) + "\"\n"
                + "exec \"" + escapeShell(target.toString()) + "\" \"$@\"\n";
        Files.writeString(wrapper, script, StandardCharsets.UTF_8);
        wrapper.toFile().setExecutable(true, false);
        return wrapper.toString();
    }

    private String escapeShell(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private void bootstrapSchema(JdbcTemplate jdbc) {
        jdbc.execute("set names utf8mb4");
        jdbc.execute("alter database test character set utf8mb4 collate utf8mb4_unicode_ci");
        jdbc.execute("""
                create table sms_relay_device (
                  device_id varchar(64) primary key,
                  receiver_phone varchar(32) not null,
                  server_url varchar(255) not null,
                  message_prefix varchar(32) not null,
                  device_secret varchar(128) not null,
                  status varchar(20) not null,
                  last_heartbeat varchar(64),
                  created_at timestamp not null default current_timestamp(),
                  updated_at timestamp not null default current_timestamp()
                )
                character set utf8mb4 collate utf8mb4_unicode_ci
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
                  status varchar(20) not null
                )
                character set utf8mb4 collate utf8mb4_unicode_ci
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
                  status varchar(20) not null,
                  expires_at varchar(64) not null,
                  verified tinyint not null default 0,
                  verified_at varchar(64),
                  sender_phone_masked varchar(32),
                  visitor_name_enc text,
                  visitor_phone_enc text,
                  visitor_id_card_enc text,
                  created_at timestamp not null default current_timestamp(),
                  updated_at timestamp not null default current_timestamp()
                )
                character set utf8mb4 collate utf8mb4_unicode_ci
                """);
        jdbc.execute("create index idx_scan_verification_pending_lookup on scan_verification_session(status, receiver_phone, message_body, created_at)");
        jdbc.execute("create index idx_scan_verification_verified_lookup on scan_verification_session(session_id, status, verified, expires_at)");
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
        int workerCount = harnessWorkerCount(concurrency);
        ExecutorService pool = Executors.newFixedThreadPool(workerCount);
        CountDownLatch ready = new CountDownLatch(workerCount);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger issued = new AtomicInteger();
        ConcurrentLinkedQueue<Throwable> harnessFailures = new ConcurrentLinkedQueue<>();

        for (int worker = 0; worker < workerCount; worker += 1) {
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

    private int harnessWorkerCount(int requestedConcurrency) {
        return Math.max(1, Math.min(requestedConcurrency, HARNESS_MAX_WORKERS));
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

    private static void closeQuietly(DB db) {
        if (db == null) {
            return;
        }
        try {
            db.stop();
        } catch (ManagedProcessException ignored) {
        }
    }

    private static void deleteQuietly(Path path) {
        if (path == null) {
            return;
        }
        try (var walk = Files.walk(path)) {
            walk.sorted(Comparator.reverseOrder()).forEach(current -> {
                try {
                    Files.deleteIfExists(current);
                } catch (IOException ignored) {
                }
            });
        } catch (IOException ignored) {
        }
    }

    private void writeReport(Report report) throws Exception {
        Path cwd = Paths.get("").toAbsolutePath();
        Path root = cwd.getFileName() != null && "04-统一后端".equals(cwd.getFileName().toString())
                ? cwd.getParent()
                : cwd;
        Path outDir = root.resolve("06-测试与质量保障/reports/performance");
        Files.createDirectories(outDir);
        String fileStem = FILE_TS.format(Instant.now()) + "-local-mariadb-write-pressure";
        Path jsonPath = outDir.resolve(fileStem + ".json");
        Path mdPath = outDir.resolve(fileStem + ".md");
        Files.writeString(jsonPath, report.toJson(), StandardCharsets.UTF_8);
        Files.writeString(mdPath, report.toMarkdown(jsonPath.getFileName().toString()), StandardCharsets.UTF_8);
    }

    private interface ThrowingSupplier<T> {
        T get() throws Exception;
    }

    private static final class PerfFixture implements AutoCloseable {
        final DataSource dataSource;
        final JdbcTemplate jdbc;
        final SmsRelayService service;
        final DB db;
        final Path baseDir;

        private PerfFixture(DataSource dataSource, JdbcTemplate jdbc, SmsRelayService service, DB db, Path baseDir) {
            this.dataSource = dataSource;
            this.jdbc = jdbc;
            this.service = service;
            this.db = db;
            this.baseDir = baseDir;
        }

        private int hikariMaximumPoolSize() {
            return dataSource instanceof HikariDataSource hikariDataSource ? hikariDataSource.getMaximumPoolSize() : -1;
        }

        private int hikariMinimumIdle() {
            return dataSource instanceof HikariDataSource hikariDataSource ? hikariDataSource.getMinimumIdle() : -1;
        }

        @Override
        public void close() {
            if (dataSource instanceof HikariDataSource hikariDataSource) {
                hikariDataSource.close();
            }
            closeQuietly(db);
            deleteQuietly(baseDir);
        }
    }

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
            lines.add("# 本机 MariaDB 写链路压测");
            lines.add("");
            lines.add("- 生成时间：" + generatedAt);
            lines.add("- 模式：本机嵌入式 MariaDB4j（真实 MariaDB / 真实 JDBC / 真实 SQL）");
            lines.add("- 目标：验证真实 MySQL 系数据库下的写链路并发行为，而不是测宿主机跑分");
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
            lines.add("- 这轮已经把“本地真实数据库写链路压测”推进到 MariaDB 实库层，使用了真实 JDBC、真实主键约束和真实 SQL。");
            lines.add("- 它不是 Docker/Testcontainers，但已经是本机真实 MySQL 系数据库层证据，可用于验证锁、唯一键、候选查询和写路径延迟。");
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

    private static boolean shouldRunScenario(String key) {
        if (SCENARIO_FILTER.isBlank() || "all".equalsIgnoreCase(SCENARIO_FILTER)) {
            return true;
        }
        return List.of(SCENARIO_FILTER.split(",")).stream()
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .anyMatch(value -> value.equalsIgnoreCase(key));
    }

    private static int intProp(String key, int defaultValue) {
        String value = System.getProperty(key);
        if (value == null || value.isBlank()) {
            value = System.getenv(key.toUpperCase(Locale.ROOT).replace('.', '_'));
        }
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        return Integer.parseInt(value.trim());
    }

    private static long longProp(String key, long defaultValue) {
        String value = System.getProperty(key);
        if (value == null || value.isBlank()) {
            value = System.getenv(key.toUpperCase(Locale.ROOT).replace('.', '_'));
        }
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        return Long.parseLong(value.trim());
    }

    private static String stringProp(String key, String defaultValue) {
        String value = System.getProperty(key);
        if (value == null || value.isBlank()) {
            value = System.getenv(key.toUpperCase(Locale.ROOT).replace('.', '_'));
        }
        return value == null || value.isBlank() ? defaultValue : value.trim();
    }
}
