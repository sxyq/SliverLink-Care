package com.silverlink.care.module.scan;

import ch.vorburger.exec.ManagedProcessException;
import ch.vorburger.mariadb4j.DB;
import ch.vorburger.mariadb4j.DBConfigurationBuilder;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.silverlink.care.common.ApiResponse;
import com.silverlink.care.infrastructure.crypto.AesGcmCryptoService;
import com.silverlink.care.infrastructure.crypto.HashService;
import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import com.silverlink.care.module.audit.AuditLogService;
import com.silverlink.care.module.qrcode.QrCodeEntity;
import com.silverlink.care.module.qrcode.QrCodeService;
import com.silverlink.care.module.sms.SmsService;
import com.silverlink.care.module.smsrelay.SmsRelayService;
import com.zaxxer.hikari.HikariDataSource;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;

import javax.sql.DataSource;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executor;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.jar.JarFile;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ScanReadMariaDbPerfTest {

    private static final DateTimeFormatter FILE_TS =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH-mm-ss-SSS'Z'")
                    .withZone(ZoneId.of("UTC"));

    @Test
    void generateMariaDbReadOptimizationReport() throws Exception {
        assumeTrue(hasMariaDbCompatRoot(), "requires silverlink.mariadb.compatRoot for local MariaDB perf runs");

        Report report = new Report();
        report.generatedAt = Instant.now().toString();
        report.environment = Map.of(
                "mode", "local-mariadb-scan-read-optimization",
                "scope", "real-jdbc-real-sql-controller-read-path",
                "database", "embedded-mariadb4j",
                "optimization", "async-audit + verified-session-cache + protected-read-cache + sql-pushdown"
        );

        ScenarioReport resolveBaseline = runResolveScenario(false);
        ScenarioReport resolveOptimized = runResolveScenario(true);
        ScenarioReport protectedBaseline = runProtectedReadScenario(false);
        ScenarioReport protectedOptimized = runProtectedReadScenario(true);
        ScenarioReport protectedHighTierBaseline = runProtectedReadHighTierScenario(false);
        ScenarioReport protectedHighTierOptimized = runProtectedReadHighTierScenario(true);
        ScenarioReport poolBound = runProtectedReadPoolTuningScenario("optimized-protected-read-pool10-cold-cache", 10);
        ScenarioReport poolTuned = runProtectedReadPoolTuningScenario("optimized-protected-read-pool64-cold-cache", 64);
        ScenarioReport auditBaseline = runAuditQueryScenario(false);
        ScenarioReport auditOptimized = runAuditQueryScenario(true);

        report.scenarios.add(resolveBaseline);
        report.scenarios.add(resolveOptimized);
        report.scenarios.add(protectedBaseline);
        report.scenarios.add(protectedOptimized);
        report.scenarios.add(protectedHighTierBaseline);
        report.scenarios.add(protectedHighTierOptimized);
        report.scenarios.add(poolBound);
        report.scenarios.add(poolTuned);
        report.scenarios.add(auditBaseline);
        report.scenarios.add(auditOptimized);

        report.summary.add(compare("resolve-controller", resolveBaseline, resolveOptimized));
        report.summary.add(compare("protected-read-mix", protectedBaseline, protectedOptimized));
        report.summary.add(compare("protected-read-mix-high-tier", protectedHighTierBaseline, protectedHighTierOptimized));
        report.summary.add(compare("protected-read-cold-cache-pool", poolBound, poolTuned));
        report.summary.add(compare("audit-log-filter", auditBaseline, auditOptimized));

        writeReport(report);

        assertTrue(resolveOptimized.successCount == resolveOptimized.totalRequests);
        assertTrue(protectedOptimized.successCount == protectedOptimized.totalRequests);
        assertTrue(auditOptimized.successCount == auditOptimized.totalRequests);
    }

    private boolean hasMariaDbCompatRoot() {
        String compatRoot = System.getProperty("silverlink.mariadb.compatRoot");
        if (compatRoot == null || compatRoot.isBlank()) {
            compatRoot = System.getenv("SILVERLINK_MARIADB_COMPAT_ROOT");
        }
        return compatRoot != null && !compatRoot.isBlank();
    }

    private ScenarioReport runResolveScenario(boolean optimized) throws Exception {
        PerfFixture fixture = createFixture(optimized);
        try {
            long auditBefore = fixture.countAuditRows();
            ScenarioReport report = runScenario(
                    optimized ? "optimized-resolve-controller" : "baseline-resolve-controller",
                    600,
                    48,
                    () -> fixture.controller.resolve(Map.of("token", "demo-token"), request())
            );
            fixture.awaitAuditRows(auditBefore + report.totalRequests, 10);
            report.notes.add(optimized
                    ? "开启 resolve 缓存与异步审计，观察重复扫码页打开时的读取延迟。"
                    : "关闭缓存并使用同步审计，作为控制组。");
            report.metrics.put("auditRowsAfter", fixture.countAuditRows());
            return report;
        } finally {
            fixture.close();
        }
    }

    private ScenarioReport runProtectedReadScenario(boolean optimized) throws Exception {
        PerfFixture fixture = createFixture(optimized);
        AtomicInteger cursor = new AtomicInteger();
        try {
            long auditBefore = fixture.countAuditRows();
            ScenarioReport report = runScenario(
                    optimized ? "optimized-protected-read-mix" : "baseline-protected-read-mix",
                    800,
                    64,
                    () -> {
                        int index = cursor.getAndIncrement() % 4;
                        if (index == 0) {
                            ApiResponse<Map<String, Object>> response = fixture.controller.archive("elder-001", "verified-session-001", request());
                            return response.getData();
                        }
                        if (index == 1) {
                            ApiResponse<Map<String, Object>> response = fixture.controller.basicInfo("elder-001", "verified-session-001", request());
                            return response.getData();
                        }
                        if (index == 2) {
                            ApiResponse<List<Map<String, String>>> response = fixture.controller.medications("elder-001", "verified-session-001", request());
                            return response.getData();
                        }
                        ApiResponse<List<Map<String, Object>>> response = fixture.controller.scales("elder-001", "verified-session-001", request());
                        return response.getData();
                    }
            );
            fixture.awaitAuditRows(auditBefore + report.totalRequests, 10);
            report.notes.add(optimized
                    ? "开启已验证 session 缓存、档案详情缓存和异步审计，模拟同一访客连续查看四个详情页。"
                    : "关闭 session/data cache，并保持同步审计，保留原始控制路径。");
            report.metrics.put("auditRowsAfter", fixture.countAuditRows());
            report.metrics.put("expectedAuditRowsAdded", report.totalRequests);
            return report;
        } finally {
            fixture.close();
        }
    }

    private ScenarioReport runProtectedReadHighTierScenario(boolean optimized) throws Exception {
        PerfFixture fixture = createFixture(optimized);
        AtomicInteger cursor = new AtomicInteger();
        int totalRequests = Integer.getInteger("scan.read.high.total", 1600);
        int concurrency = Integer.getInteger("scan.read.high.concurrency", 128);
        try {
            long auditBefore = fixture.countAuditRows();
            ScenarioReport report = runScenario(
                    optimized ? "optimized-protected-read-mix-high-tier" : "baseline-protected-read-mix-high-tier",
                    totalRequests,
                    concurrency,
                    () -> {
                        int index = cursor.getAndIncrement() % 4;
                        if (index == 0) {
                            return fixture.controller.archive("elder-001", "verified-session-001", request()).getData();
                        }
                        if (index == 1) {
                            return fixture.controller.basicInfo("elder-001", "verified-session-001", request()).getData();
                        }
                        if (index == 2) {
                            return fixture.controller.medications("elder-001", "verified-session-001", request()).getData();
                        }
                        return fixture.controller.scales("elder-001", "verified-session-001", request()).getData();
                    }
            );
            fixture.awaitAuditRows(auditBefore + report.totalRequests, 20);
            report.notes.add(optimized
                    ? "更高分档并发下，开启缓存并发去重、详情缓存、session 缓存和异步审计。"
                    : "更高分档并发下，保留未优化控制路径，作为极限对照组。");
            report.metrics.put("auditRowsAfter", fixture.countAuditRows());
            report.metrics.put("expectedAuditRowsAdded", report.totalRequests);
            return report;
        } finally {
            fixture.close();
        }
    }

    private ScenarioReport runProtectedReadPoolTuningScenario(String name, int maximumPoolSize) throws Exception {
        PerfFixture fixture = createFixture(
                true,
                maximumPoolSize,
                Math.max(2, Math.min(16, maximumPoolSize / 4)),
                2000L,
                60_000L,
                0L,
                10_000L
        );
        AtomicInteger cursor = new AtomicInteger();
        int totalRequests = Integer.getInteger("scan.read.pool.total", 6400);
        int concurrency = Integer.getInteger("scan.read.pool.concurrency", 256);
        try {
            long auditBefore = fixture.countAuditRows();
            ScenarioReport report = runScenario(
                    name,
                    totalRequests,
                    concurrency,
                    () -> {
                        int index = cursor.getAndIncrement() % 4;
                        if (index == 0) {
                            return fixture.controller.archive("elder-001", "verified-session-001", request()).getData();
                        }
                        if (index == 1) {
                            return fixture.controller.basicInfo("elder-001", "verified-session-001", request()).getData();
                        }
                        if (index == 2) {
                            return fixture.controller.medications("elder-001", "verified-session-001", request()).getData();
                        }
                        return fixture.controller.scales("elder-001", "verified-session-001", request()).getData();
                    }
            );
            fixture.awaitAuditRows(auditBefore + report.totalRequests, 20);
            report.notes.add("关闭详情短缓存，只保留已验证 session 缓存、SQL 优化和异步审计，用于单独观察 Hikari 连接池大小对冷缓存详情读取的影响。");
            report.metrics.put("hikariMaximumPoolSize", fixture.hikariMaximumPoolSize());
            report.metrics.put("hikariMinimumIdle", fixture.hikariMinimumIdle());
            report.metrics.put("hikariConnectionTimeoutMs", fixture.hikariConnectionTimeoutMs());
            report.metrics.put("auditRowsAfter", fixture.countAuditRows());
            return report;
        } finally {
            fixture.close();
        }
    }

    private ScenarioReport runAuditQueryScenario(boolean optimized) throws Exception {
        PerfFixture fixture = createFixture(optimized);
        try {
            ScenarioReport report = runScenario(
                    optimized ? "optimized-audit-log-filter" : "baseline-audit-log-filter",
                    120,
                    16,
                    () -> optimized
                            ? fixture.data.auditLogs("扫码用户", "VIEW_ARCHIVE", "SUCCESS")
                            : legacyAuditLogs(fixture.data, fixture.jdbc, "扫码用户", "VIEW_ARCHIVE", "SUCCESS")
            );
            report.notes.add(optimized
                    ? "当前实现将 operator/action/result 过滤下推到 SQL 层，只返回命中的 125 行。"
                    : "控制组模拟旧实现：先取最近 500 行，再在 Java 里筛选并逐条解密。");
            report.metrics.put("matchingRows", 125);
            report.metrics.put("scannedRowsUpperBound", optimized ? 125 : 500);
            return report;
        } finally {
            fixture.close();
        }
    }

    private ScenarioReport runScenario(String name, int totalRequests, int concurrency, ThrowingSupplier<?> action) throws Exception {
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
        return report;
    }

    private PerfFixture createFixture(boolean optimized) {
        return createFixture(optimized, 24, 1, 15_000L, optimized ? 60_000L : 0L, optimized ? 15_000L : 0L, optimized ? 10_000L : 0L);
    }

    private PerfFixture createFixture(
            boolean optimized,
            int maximumPoolSize,
            int minimumIdle,
            long connectionTimeoutMs,
            long authorizedSessionCacheTtlMs,
            long protectedReadCacheTtlMs,
            long resolveCacheTtlMs
    ) {
        Path baseDir = null;
        DB db = null;
        ExecutorService auditExecutor = null;
        try {
            baseDir = Files.createTempDirectory("silverlink-scan-read-mariadb4j-");
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
            dataSource.setMaximumPoolSize(maximumPoolSize);
            dataSource.setMinimumIdle(minimumIdle);
            dataSource.setConnectionTimeout(connectionTimeoutMs);
            dataSource.setIdleTimeout(10000);
            dataSource.setMaxLifetime(30000);

            JdbcTemplate jdbc = new JdbcTemplate(dataSource);
            bootstrapSchema(jdbc, optimized);

            AesGcmCryptoService crypto = new AesGcmCryptoService();
            ReflectionTestUtils.setField(crypto, "keyId", "demo-key-v1");
            ReflectionTestUtils.setField(crypto, "aesKeyBase64",
                    Base64.getEncoder().encodeToString("0123456789abcdef0123456789abcdef".getBytes(StandardCharsets.UTF_8)));
            HashService hashService = new HashService();
            SilverLinkDataService data = new SilverLinkDataService(jdbc, crypto, hashService, new ObjectMapper());

            seedDomainData(jdbc, data);

            SmsRelayService smsRelayService = new SmsRelayService(jdbc, new StubSmsService(data), data);
            ReflectionTestUtils.setField(smsRelayService, "authorizationWindowSeconds", 600L);
            ReflectionTestUtils.setField(smsRelayService, "authorizedSessionCacheTtlMs", authorizedSessionCacheTtlMs);

            QrCodeService qrCodeService = mock(QrCodeService.class);
            QrCodeEntity entity = new QrCodeEntity();
            entity.setElderId("elder-001");
            entity.setStatus("ENABLED");
            when(qrCodeService.resolve("demo-token")).thenReturn(entity);

            ScanService scanService = new ScanService(qrCodeService, data, smsRelayService);
            ReflectionTestUtils.setField(scanService, "resolveCacheTtlMs", resolveCacheTtlMs);
            ReflectionTestUtils.setField(scanService, "protectedReadCacheTtlMs", protectedReadCacheTtlMs);

            AuditLogService auditLogService;
            if (optimized) {
                auditExecutor = Executors.newFixedThreadPool(4, runnable -> {
                    Thread thread = new Thread(runnable, "scan-read-audit-" + UUID.randomUUID());
                    thread.setDaemon(true);
                    return thread;
                });
                auditLogService = new AuditLogService(data, auditExecutor);
            } else {
                auditLogService = new AuditLogService(data);
            }

            ScanController controller = new ScanController(scanService, auditLogService, new WeChatAuthService());
            return new PerfFixture(dataSource, jdbc, data, controller, db, baseDir, auditExecutor, optimized);
        } catch (Exception exception) {
            if (auditExecutor != null) {
                auditExecutor.shutdownNow();
            }
            closeQuietly(db);
            deleteQuietly(baseDir);
            throw new IllegalStateException("Failed to start local MariaDB4j scan-read fixture", exception);
        }
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

    private void bootstrapSchema(JdbcTemplate jdbc, boolean optimized) {
        jdbc.execute("set names utf8mb4");
        jdbc.execute("alter database test character set utf8mb4 collate utf8mb4_unicode_ci");
        jdbc.execute("""
                create table elder (
                  id varchar(64) primary key,
                  archive_no varchar(64) not null,
                  name_enc text,
                  gender varchar(16),
                  age int,
                  residence_enc text,
                  emergency_contact_name_enc text,
                  emergency_phone_enc text,
                  backup_contact_name_enc text,
                  backup_phone_enc text,
                  relationship varchar(32),
                  abo_type varchar(8),
                  rh_type varchar(8),
                  allergy_enc text,
                  status varchar(16) not null,
                  created_at timestamp not null default current_timestamp(),
                  updated_at timestamp not null default current_timestamp()
                ) character set utf8mb4 collate utf8mb4_unicode_ci
                """);
        jdbc.execute("create index idx_elder_status on elder(status)");

        jdbc.execute("""
                create table health_record (
                  id varchar(64) primary key,
                  elder_id varchar(64) not null,
                  record_date varchar(32),
                  volunteer varchar(64),
                  height_cm decimal(10,2),
                  weight_kg decimal(10,2),
                  waist_cm decimal(10,2),
                  bmi decimal(10,2),
                  health_self_assessment varchar(64),
                  self_care_assessment varchar(64),
                  cognitive_screening varchar(64),
                  emotion_screening varchar(64),
                  created_at timestamp not null default current_timestamp()
                ) character set utf8mb4 collate utf8mb4_unicode_ci
                """);
        if (optimized) {
            jdbc.execute("create index idx_health_record_elder_created on health_record(elder_id, created_at)");
        } else {
            jdbc.execute("create index idx_health_record_elder on health_record(elder_id)");
        }

        jdbc.execute("""
                create table medication (
                  id varchar(64) primary key,
                  elder_id varchar(64) not null,
                  name_enc text,
                  dosage_enc text,
                  usage_text_enc text,
                  timing_enc text,
                  updated_at timestamp not null default current_timestamp()
                ) character set utf8mb4 collate utf8mb4_unicode_ci
                """);
        if (optimized) {
            jdbc.execute("create index idx_medication_elder_updated on medication(elder_id, updated_at)");
        } else {
            jdbc.execute("create index idx_medication_elder on medication(elder_id)");
        }

        jdbc.execute("""
                create table scale_record (
                  id varchar(64) primary key,
                  elder_id varchar(64) not null,
                  scale_name varchar(64),
                  score int,
                  record_date varchar(32),
                  volunteer varchar(64),
                  payload_enc text,
                  created_at timestamp not null default current_timestamp()
                ) character set utf8mb4 collate utf8mb4_unicode_ci
                """);
        if (optimized) {
            jdbc.execute("create index idx_scale_record_elder_created on scale_record(elder_id, created_at)");
        } else {
            jdbc.execute("create index idx_scale_record_elder on scale_record(elder_id)");
        }

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
                ) character set utf8mb4 collate utf8mb4_unicode_ci
                """);
        if (optimized) {
            jdbc.execute("create index idx_scan_session_lookup on scan_verification_session(session_id, status, verified, expires_at)");
            jdbc.execute("create index idx_scan_session_pending_lookup on scan_verification_session(status, receiver_phone, message_body, created_at)");
        } else {
            jdbc.execute("create index idx_scan_session_lookup on scan_verification_session(session_id, status)");
            jdbc.execute("create index idx_scan_session_status on scan_verification_session(status)");
        }

        jdbc.execute("""
                create table audit_log (
                  id varchar(64) primary key,
                  time varchar(64) not null,
                  operator varchar(64),
                  role varchar(32),
                  source_ip varchar(64),
                  target varchar(64),
                  action varchar(64),
                  verification_method varchar(32),
                  visitor_name_enc text,
                  visitor_phone_enc text,
                  visitor_id_card_enc text,
                  result varchar(32),
                  fail_reason varchar(255),
                  request_id varchar(128)
                ) character set utf8mb4 collate utf8mb4_unicode_ci
                """);
        jdbc.execute("create index idx_audit_time on audit_log(time)");
        if (optimized) {
            jdbc.execute("create index idx_audit_operator_action_result_time on audit_log(operator, action, result, time)");
        } else {
            jdbc.execute("create index idx_audit_operator on audit_log(operator)");
            jdbc.execute("create index idx_audit_action on audit_log(action)");
            jdbc.execute("create index idx_audit_result on audit_log(result)");
        }
    }

    private void seedDomainData(JdbcTemplate jdbc, SilverLinkDataService data) {
        jdbc.update("""
                insert into elder
                (id, archive_no, name_enc, gender, age, residence_enc, emergency_contact_name_enc, emergency_phone_enc,
                 backup_contact_name_enc, backup_phone_enc, relationship, abo_type, rh_type, allergy_enc, status)
                values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                "elder-001",
                "A-001",
                data.enc("李奶奶"),
                "女",
                82,
                data.enc("上海市徐汇区"),
                data.enc("王阿姨"),
                data.enc("13800001111"),
                data.enc("张叔叔"),
                data.enc("13900002222"),
                "子女",
                "A",
                "+",
                data.enc("无"),
                "ACTIVE"
        );

        jdbc.update("""
                insert into health_record
                (id, elder_id, record_date, volunteer, height_cm, weight_kg, waist_cm, bmi, health_self_assessment,
                 self_care_assessment, cognitive_screening, emotion_screening)
                values (?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                "health-001",
                "elder-001",
                "2026-05-27",
                "志愿者A",
                160.5,
                58.2,
                83.4,
                22.6,
                "良好",
                "良好",
                "正常",
                "稳定"
        );

        for (int index = 0; index < 16; index += 1) {
            jdbc.update("""
                    insert into medication (id, elder_id, name_enc, dosage_enc, usage_text_enc, timing_enc, updated_at)
                    values (?,?,?,?,?,?,?)
                    """,
                    "med-" + index,
                    "elder-001",
                    data.enc("药物" + index),
                    data.enc((index + 1) + "片"),
                    data.enc("饭后口服"),
                    data.enc(String.format(Locale.ROOT, "%02d:00", (index % 8) + 8)),
                    Timestamp.from(Instant.now().minusSeconds(index))
            );
        }

        for (int index = 0; index < 16; index += 1) {
            String payload = """
                    {"questions":[{"index":1,"score":2},{"index":2,"score":1},{"index":3,"score":0}],"note":"local-read-%d"}
                    """.formatted(index).trim();
            jdbc.update("""
                    insert into scale_record (id, elder_id, scale_name, score, record_date, volunteer, payload_enc, created_at)
                    values (?,?,?,?,?,?,?,?)
                    """,
                    "scale-" + index,
                    "elder-001",
                    "PHQ-9",
                    4 + (index % 5),
                    "2026-05-" + String.format(Locale.ROOT, "%02d", (index % 28) + 1),
                    "志愿者A",
                    data.enc(payload),
                    Timestamp.from(Instant.now().minusSeconds(index))
            );
        }

        jdbc.update("""
                insert into scan_verification_session
                (session_id, elder_id, target, verification_method, receiver_phone, message_body, message_prefix, status,
                 expires_at, verified, verified_at, sender_phone_masked, visitor_name_enc, visitor_phone_enc, visitor_id_card_enc)
                values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                "verified-session-001",
                "elder-001",
                "health",
                "IDENTITY",
                "13800001111",
                "",
                "IDENTITY",
                "VERIFIED",
                Instant.now().plusSeconds(300).toString(),
                true,
                Instant.now().minusSeconds(30).toString(),
                "138****1111",
                data.enc("测试访客"),
                data.enc("13812345678"),
                data.enc("500101199001010011")
        );

        seedAuditRows(jdbc, data);
    }

    private void seedAuditRows(JdbcTemplate jdbc, SilverLinkDataService data) {
        for (int index = 0; index < 500; index += 1) {
            boolean matches = index < 125;
            String operator = matches ? "扫码用户" : "管理员" + index;
            String action = matches ? "VIEW_ARCHIVE" : (index % 2 == 0 ? "VIEW_MEDICATIONS" : "SCAN_QR");
            String result = matches ? "SUCCESS" : (index % 3 == 0 ? "FAIL" : "SUCCESS");
            jdbc.update("""
                    insert into audit_log
                    (id, time, operator, role, source_ip, target, action, verification_method,
                     visitor_name_enc, visitor_phone_enc, visitor_id_card_enc, result, fail_reason, request_id)
                    values (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                    """,
                    "audit-seed-" + index,
                    Instant.now().minusSeconds(index).toString(),
                    operator,
                    matches ? "VISITOR" : "ADMIN",
                    "127.0.0.1",
                    "elder-001",
                    action,
                    matches ? "IDENTITY" : "",
                    data.enc(matches ? "测试访客" : "操作员" + index),
                    data.enc("1381234" + String.format(Locale.ROOT, "%04d", index)),
                    data.enc("50010119900101" + String.format(Locale.ROOT, "%04d", index % 10000)),
                    result,
                    matches ? "" : "not-match",
                    "req-" + index
            );
        }
    }

    private List<Map<String, Object>> legacyAuditLogs(SilverLinkDataService data, JdbcTemplate jdbc, String operator, String action, String result) {
        List<Map<String, Object>> rows = jdbc.queryForList("select * from audit_log order by time desc limit 500");
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            if (operator != null && !operator.isBlank() && !data.str(row.get("operator")).contains(operator)) {
                continue;
            }
            if (action != null && !action.isBlank() && !action.equals(data.str(row.get("action")))) {
                continue;
            }
            if (result != null && !result.isBlank() && !result.equals(data.str(row.get("result")))) {
                continue;
            }
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", row.get("id"));
            map.put("time", row.get("time"));
            map.put("operator", row.get("operator"));
            map.put("role", row.get("role"));
            map.put("sourceIp", row.get("source_ip"));
            map.put("target", row.get("target"));
            map.put("action", row.get("action"));
            map.put("verificationMethod", row.get("verification_method"));
            map.put("visitorName", data.dec(row.get("visitor_name_enc")));
            map.put("visitorPhone", data.dec(row.get("visitor_phone_enc")));
            map.put("visitorIdCard", data.dec(row.get("visitor_id_card_enc")));
            map.put("result", row.get("result"));
            map.put("failReason", row.get("fail_reason"));
            map.put("requestId", row.get("request_id"));
            out.add(map);
        }
        return out;
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

    private void configureExecutableWrappers(DBConfigurationBuilder configBuilder, String compatRoot) throws IOException {
        Path baseDir = configBuilder.getBaseDir().toPath();
        Path wrapperDir = baseDir.resolve("wrappers");
        Files.createDirectories(wrapperDir);

        String dyldLibraryPath = Paths.get(compatRoot, "pcre2").toString()
                + ":" + Paths.get(compatRoot, "openssl3");

        configBuilder.setExecutable(ch.vorburger.mariadb4j.DBConfiguration.Executable.InstallDB,
                createWrapper(wrapperDir, "install-db.sh", baseDir.resolve("scripts/mariadb-install-db"), dyldLibraryPath));
        configBuilder.setExecutable(ch.vorburger.mariadb4j.DBConfiguration.Executable.Server,
                createWrapper(wrapperDir, "mariadbd.sh", baseDir.resolve("bin/mariadbd"), dyldLibraryPath));
        configBuilder.setExecutable(ch.vorburger.mariadb4j.DBConfiguration.Executable.Client,
                createWrapper(wrapperDir, "mariadb.sh", baseDir.resolve("bin/mariadb"), dyldLibraryPath));
        configBuilder.setExecutable(ch.vorburger.mariadb4j.DBConfiguration.Executable.Dump,
                createWrapper(wrapperDir, "mariadb-dump.sh", baseDir.resolve("bin/mariadb-dump"), dyldLibraryPath));
        configBuilder.setExecutable(ch.vorburger.mariadb4j.DBConfiguration.Executable.PrintDefaults,
                createWrapper(wrapperDir, "my-print-defaults.sh", baseDir.resolve("bin/my_print_defaults"), dyldLibraryPath));
    }

    private String createWrapper(Path wrapperDir, String fileName, Path target, String dyldLibraryPath) throws IOException {
        Path wrapper = wrapperDir.resolve(fileName);
        String script = "#!/usr/bin/env bash\n"
                + "export DYLD_LIBRARY_PATH=\"" + escapeShell(dyldLibraryPath) + "\"\n"
                + "export DYLD_FALLBACK_LIBRARY_PATH=\"" + escapeShell(dyldLibraryPath) + "\"\n"
                + "exec \"" + escapeShell(target.toString()) + "\" \"$@\"\n";
        Files.writeString(wrapper, script, StandardCharsets.UTF_8);
        wrapper.toFile().setExecutable(true, false);
        return wrapper.toString();
    }

    private String escapeShell(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
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
            throw new IllegalStateException("Embedded DB scan-read pressure run timed out");
        }
        if (!harnessFailures.isEmpty()) {
            throw new RuntimeException("Harness worker failed", harnessFailures.peek());
        }
    }

    private String compare(String scenario, ScenarioReport baseline, ScenarioReport optimized) {
        long p95Improvement = baseline.p95Ms - optimized.p95Ms;
        long p99Improvement = baseline.p99Ms - optimized.p99Ms;
        return scenario + ": baseline P95 " + baseline.p95Ms + "ms -> optimized P95 " + optimized.p95Ms
                + "ms, baseline P99 " + baseline.p99Ms + "ms -> optimized P99 " + optimized.p99Ms
                + "ms, improvement " + p95Improvement + "ms / " + p99Improvement + "ms";
    }

    private static String classify(Throwable throwable) {
        Throwable cursor = throwable;
        while (cursor != null) {
            String message = cursor.getMessage();
            if (message != null) {
                String lower = message.toLowerCase(Locale.ROOT);
                if (lower.contains("verification session")) {
                    return "verification-session";
                }
                if (lower.contains("not found")) {
                    return "not-found";
                }
            }
            cursor = cursor.getCause();
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

    private static HttpServletRequest request() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");
        return request;
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
        String fileStem = FILE_TS.format(Instant.now()) + "-local-mariadb-scan-read-optimization";
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
        final SilverLinkDataService data;
        final ScanController controller;
        final DB db;
        final Path baseDir;
        final ExecutorService auditExecutor;
        final boolean optimized;

        private PerfFixture(
                DataSource dataSource,
                JdbcTemplate jdbc,
                SilverLinkDataService data,
                ScanController controller,
                DB db,
                Path baseDir,
                ExecutorService auditExecutor,
                boolean optimized
        ) {
            this.dataSource = dataSource;
            this.jdbc = jdbc;
            this.data = data;
            this.controller = controller;
            this.db = db;
            this.baseDir = baseDir;
            this.auditExecutor = auditExecutor;
            this.optimized = optimized;
        }

        long countAuditRows() {
            Long count = jdbc.queryForObject("select count(*) from audit_log", Long.class);
            return count == null ? 0L : count;
        }

        int hikariMaximumPoolSize() {
            return dataSource instanceof HikariDataSource hikariDataSource ? hikariDataSource.getMaximumPoolSize() : -1;
        }

        int hikariMinimumIdle() {
            return dataSource instanceof HikariDataSource hikariDataSource ? hikariDataSource.getMinimumIdle() : -1;
        }

        long hikariConnectionTimeoutMs() {
            return dataSource instanceof HikariDataSource hikariDataSource ? hikariDataSource.getConnectionTimeout() : -1L;
        }

        void awaitAuditRows(long expected, int timeoutSeconds) throws InterruptedException {
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(timeoutSeconds);
            while (System.nanoTime() < deadline) {
                if (countAuditRows() >= expected) {
                    return;
                }
                Thread.sleep(50);
            }
        }

        @Override
        public void close() {
            if (auditExecutor != null) {
                auditExecutor.shutdown();
                try {
                    auditExecutor.awaitTermination(5, TimeUnit.SECONDS);
                } catch (InterruptedException interruptedException) {
                    Thread.currentThread().interrupt();
                }
                auditExecutor.shutdownNow();
            }
            if (dataSource instanceof HikariDataSource hikariDataSource) {
                hikariDataSource.close();
            }
            closeQuietly(db);
            deleteQuietly(baseDir);
        }
    }

    private static final class StubSmsService extends SmsService {
        StubSmsService(SilverLinkDataService data) {
            super(null, data, null);
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

    private static final class Report {
        String generatedAt;
        Map<String, Object> environment = new LinkedHashMap<>();
        List<ScenarioReport> scenarios = new ArrayList<>();
        List<String> summary = new ArrayList<>();

        String toJson() {
            StringBuilder builder = new StringBuilder();
            builder.append("{\n");
            builder.append("  \"generatedAt\": \"").append(escape(generatedAt)).append("\",\n");
            builder.append("  \"environment\": ").append(toJsonObject(environment, 2)).append(",\n");
            builder.append("  \"summary\": [\n");
            for (int i = 0; i < summary.size(); i += 1) {
                builder.append("    \"").append(escape(summary.get(i))).append("\"");
                if (i < summary.size() - 1) {
                    builder.append(',');
                }
                builder.append('\n');
            }
            builder.append("  ],\n");
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
            lines.add("# 本机 MariaDB 扫码读链路优化对比");
            lines.add("");
            lines.add("- 生成时间：" + generatedAt);
            lines.add("- 模式：本机嵌入式 MariaDB4j（真实 MariaDB / 真实 JDBC / 真实 SQL / 控制器级读链路）");
            lines.add("- 优化项：异步审计、已验证 session 缓存、详情短缓存、审计日志 SQL 下推");
            lines.add("- JSON 报告：" + jsonFileName);
            lines.add("");
            lines.add("## 摘要");
            lines.add("");
            for (String item : summary) {
                lines.add("- " + item);
            }
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
                if (!scenario.metrics.isEmpty()) {
                    lines.add("- 关键指标：");
                    for (Map.Entry<String, Object> entry : scenario.metrics.entrySet()) {
                        lines.add("  - " + entry.getKey() + ": " + entry.getValue());
                    }
                }
                if (!scenario.notes.isEmpty()) {
                    lines.add("- 说明：");
                    for (String note : scenario.notes) {
                        lines.add("  - " + note);
                    }
                }
                if (!scenario.findings.isEmpty()) {
                    lines.add("- 发现：");
                    for (String finding : scenario.findings) {
                        lines.add("  - " + finding);
                    }
                }
                lines.add("");
            }
            return String.join("\n", lines) + "\n";
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
        List<String> notes = new ArrayList<>();
        List<String> findings = new ArrayList<>();

        String toJson(String indent) {
            StringBuilder builder = new StringBuilder();
            builder.append(indent).append("{\n");
            builder.append(indent).append("  \"name\": \"").append(escape(name)).append("\",\n");
            builder.append(indent).append("  \"totalRequests\": ").append(totalRequests).append(",\n");
            builder.append(indent).append("  \"concurrency\": ").append(concurrency).append(",\n");
            builder.append(indent).append("  \"successCount\": ").append(successCount).append(",\n");
            builder.append(indent).append("  \"failureCount\": ").append(failureCount).append(",\n");
            builder.append(indent).append("  \"successRate\": ").append(successRate).append(",\n");
            builder.append(indent).append("  \"p50Ms\": ").append(p50Ms).append(",\n");
            builder.append(indent).append("  \"p95Ms\": ").append(p95Ms).append(",\n");
            builder.append(indent).append("  \"p99Ms\": ").append(p99Ms).append(",\n");
            builder.append(indent).append("  \"maxMs\": ").append(maxMs).append(",\n");
            builder.append(indent).append("  \"errorBreakdown\": ").append(toJsonObject(errorBreakdown, indent.length() + 2)).append(",\n");
            builder.append(indent).append("  \"metrics\": ").append(toJsonObject(metrics, indent.length() + 2)).append(",\n");
            builder.append(indent).append("  \"notes\": ").append(toJsonArray(notes, indent.length() + 2)).append(",\n");
            builder.append(indent).append("  \"findings\": ").append(toJsonArray(findings, indent.length() + 2)).append('\n');
            builder.append(indent).append('}');
            return builder.toString();
        }
    }

    private static String toJsonObject(Map<?, ?> map, int indent) {
        String pad = " ".repeat(indent);
        String childPad = " ".repeat(indent + 2);
        StringBuilder builder = new StringBuilder();
        builder.append("{");
        if (!map.isEmpty()) {
            builder.append('\n');
            int index = 0;
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                builder.append(childPad)
                        .append("\"").append(escape(String.valueOf(entry.getKey()))).append("\": ")
                        .append(toJsonValue(entry.getValue(), indent + 2));
                if (index < map.size() - 1) {
                    builder.append(',');
                }
                builder.append('\n');
                index += 1;
            }
            builder.append(pad);
        }
        builder.append("}");
        return builder.toString();
    }

    private static String toJsonArray(List<?> values, int indent) {
        String pad = " ".repeat(indent);
        String childPad = " ".repeat(indent + 2);
        StringBuilder builder = new StringBuilder("[");
        if (!values.isEmpty()) {
            builder.append('\n');
            for (int index = 0; index < values.size(); index += 1) {
                builder.append(childPad).append(toJsonValue(values.get(index), indent + 2));
                if (index < values.size() - 1) {
                    builder.append(',');
                }
                builder.append('\n');
            }
            builder.append(pad);
        }
        builder.append(']');
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
        if (value instanceof Map<?, ?> map) {
            return toJsonObject(map, indent);
        }
        if (value instanceof List<?> list) {
            return toJsonArray(list, indent);
        }
        return "\"" + escape(String.valueOf(value)) + "\"";
    }

    private static String escape(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n");
    }
}
