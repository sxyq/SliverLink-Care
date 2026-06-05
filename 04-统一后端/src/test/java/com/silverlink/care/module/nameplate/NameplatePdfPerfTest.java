package com.silverlink.care.module.nameplate;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import com.silverlink.care.module.qrcode.QrCodeEntity;
import com.silverlink.care.module.qrcode.QrCodeService;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Queue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class NameplatePdfPerfTest {

    private static final DateTimeFormatter FILE_TS =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH-mm-ss-SSS'Z'")
                    .withZone(ZoneId.of("UTC"));

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void generateLocalNameplatePdfPerformanceReport() throws Exception {
        Report report = new Report();
        report.generatedAt = Instant.now().toString();
        report.environment = Map.of(
                "mode", "local-nameplate-pdf-concurrency",
                "scope", "pdf-generation-long-tail-baseline-not-host-benchmark",
                "renderer", "pdfbox-plus-zxing"
        );

        NameplateService baselineService = createService(false);
        NameplateService optimizedService = createService(true);
        report.scenarios.add(runPreviewScenario("baseline", baselineService));
        report.scenarios.add(runPreviewScenario("optimized", optimizedService));
        report.scenarios.add(runPdfScenario("baseline", baselineService));
        report.scenarios.add(runPdfScenario("optimized", optimizedService));
        ScenarioReport highTierScenario = runHighTierPdfScenario("optimized", optimizedService);
        if (highTierScenario != null) {
            report.scenarios.add(highTierScenario);
        }
        report.summary.add(buildComparisonSummary(
                "preview",
                findScenario(report.scenarios, "nameplate-preview-local-baseline"),
                findScenario(report.scenarios, "nameplate-preview-local-optimized")
        ));
        report.summary.add(buildComparisonSummary(
                "pdf",
                findScenario(report.scenarios, "nameplate-pdf-local-baseline"),
                findScenario(report.scenarios, "nameplate-pdf-local-optimized")
        ));

        writeReport(report);
        assertTrue(report.scenarios.stream().anyMatch(item -> item.name.contains("pdf")));
    }

    private NameplateService createService(boolean optimized) throws Exception {
        SilverLinkDataService data = mock(SilverLinkDataService.class);
        QrCodeService qrCodeService = mock(QrCodeService.class);
        when(data.elderDetail("elder-1", false)).thenReturn(Map.of(
                "name", "李奶奶",
                "age", 78,
                "emergencyContactPhone", "13800000000",
                "archiveNo", "A-001"
        ));
        QrCodeEntity current = new QrCodeEntity();
        current.setQrToken("token-1");
        when(qrCodeService.findCurrentByElder("elder-1")).thenReturn(current);
        when(qrCodeService.buildPublicUrl("token-1")).thenReturn("https://local.test/scan?token=token-1");
        NameplateService service = new NameplateService(data, qrCodeService);
        setField(service, "fontResourceCacheEnabled", optimized);
        setField(service, "previewCacheTtlMs", optimized ? 15_000L : 0L);
        setField(service, "pdfCacheTtlMs", optimized ? 30_000L : 0L);
        setField(service, "qrImageCacheTtlMs", optimized ? 60_000L : 0L);
        return service;
    }

    private ScenarioReport runPreviewScenario(String mode, NameplateService service) throws Exception {
        return runScenario(
                "nameplate-preview-local-" + mode,
                intProperty("nameplate.preview.total", 300),
                intProperty("nameplate.preview.concurrency", 24),
                () -> {
                    service.preview("elder-1", false);
                    return 0;
                }
        );
    }

    private ScenarioReport runPdfScenario(String mode, NameplateService service) throws Exception {
        ScenarioReport report = runScenario(
                "nameplate-pdf-local-" + mode,
                intProperty("nameplate.pdf.total", 96),
                intProperty("nameplate.pdf.concurrency", 12),
                () -> service.generateDemoPdf("elder-1").length
        );
        report.notes.add("这一段关注 PDF 生成的长尾，而不是浏览器下载链路。");
        if ("baseline".equals(mode)) {
            report.notes.add("baseline 关闭 preview/pdf/qr 缓存，并关闭字体资源复用，接近优化前路径。");
        } else {
            report.notes.add("optimized 开启 preview/pdf/qr 短缓存，并复用字体资源。");
        }
        report.findings.add(describeTailBehavior(report));
        return report;
    }

    private ScenarioReport runHighTierPdfScenario(String mode, NameplateService service) throws Exception {
        int totalRequests = intProperty("nameplate.pdf.high.total", 0);
        int concurrency = intProperty("nameplate.pdf.high.concurrency", 0);
        if (totalRequests <= 0 || concurrency <= 0) {
            return null;
        }

        ScenarioReport report = runScenario(
                "nameplate-pdf-local-" + mode + "-high-tier",
                totalRequests,
                concurrency,
                () -> service.generateDemoPdf("elder-1").length
        );
        report.notes.add("这一段是更高分档并发，用来确认 PDF 长尾在更高压力下是否继续放大。");
        report.notes.add("它关注本地 PDF 生成路径本身，不覆盖浏览器下载和网络传输。");
        report.notes.add("当前只保留 optimized 分档，因为这轮目标是验证优化后还能不能继续压住长尾。");
        if (report.p95Ms == 0 && report.p99Ms == 0) {
            report.findings.add("高分档并发下几乎全部命中本地缓存，PDF 生成路径已压到毫秒内。");
        } else if (report.p50Ms > 0 && report.p95Ms >= report.p50Ms * 3) {
            report.findings.add("高分档并发下，PDF 生成长尾继续放大，P95 已达到 P50 的三倍以上。");
        } else {
            report.findings.add("高分档并发下，PDF 生成尾延迟仍未出现灾难性放大。");
        }
        return report;
    }

    private ScenarioReport runScenario(String name, int totalRequests, int concurrency, IntSupplier action) throws Exception {
        Queue<Long> durations = new ConcurrentLinkedQueue<>();
        Queue<Integer> payloadSizes = new ConcurrentLinkedQueue<>();
        ConcurrentHashMap<String, AtomicInteger> errors = new ConcurrentHashMap<>();
        AtomicInteger success = new AtomicInteger();
        AtomicInteger failure = new AtomicInteger();

        runConcurrent(totalRequests, concurrency, () -> {
            long startedAt = System.nanoTime();
            try {
                int payloadSize = action.get();
                payloadSizes.add(payloadSize);
                success.incrementAndGet();
            } catch (Throwable throwable) {
                failure.incrementAndGet();
                errors.computeIfAbsent(
                        throwable.getClass().getSimpleName() + ": " + String.valueOf(throwable.getMessage()),
                        key -> new AtomicInteger()
                ).incrementAndGet();
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
        report.metrics.put("averagePayloadBytes", average(payloadSizes));
        report.metrics.put("maxPayloadBytes", payloadSizes.stream().mapToInt(Integer::intValue).max().orElse(0));
        errors.forEach((key, value) -> report.errorBreakdown.put(key, value.get()));
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
                        break;
                    }
                    action.get();
                }
                return null;
            }));
        }

        ready.await(10, TimeUnit.SECONDS);
        start.countDown();
        for (Future<?> future : futures) {
            future.get(5, TimeUnit.MINUTES);
        }
        pool.shutdownNow();
    }

    private void writeReport(Report report) throws Exception {
        String timestamp = FILE_TS.format(Instant.now());
        Path baseDir = resolveProjectRoot().resolve("06-测试与质量保障").resolve("reports").resolve("performance");
        Files.createDirectories(baseDir);

        Path jsonPath = baseDir.resolve(timestamp + "-nameplate-pdf-performance.json");
        Path mdPath = baseDir.resolve(timestamp + "-nameplate-pdf-performance.md");

        mapper.writerWithDefaultPrettyPrinter().writeValue(jsonPath.toFile(), report);

        StringBuilder md = new StringBuilder();
        md.append("# 名牌 PDF 本地并发与长尾测试\n\n");
        md.append("- 生成时间：").append(report.generatedAt).append('\n');
        md.append("- 模式：本机 PDF 生成优化前后对比\n");
        md.append("- 目标：观察 `NameplateService.generateDemoPdf` 在资源复用和短缓存开启前后的长尾变化，而不是测宿主机跑分\n");
        md.append("- JSON 报告：").append(jsonPath.getFileName()).append("\n\n");

        if (!report.summary.isEmpty()) {
            md.append("## 摘要\n\n");
            for (String summaryLine : report.summary) {
                md.append("- ").append(summaryLine).append('\n');
            }
            md.append('\n');
        }

        for (ScenarioReport scenario : report.scenarios) {
            md.append("## ").append(scenario.name).append("\n\n");
            md.append("- 总请求：").append(scenario.totalRequests).append('\n');
            md.append("- 并发：").append(scenario.concurrency).append('\n');
            md.append("- 成功：").append(scenario.successCount).append('\n');
            md.append("- 失败：").append(scenario.failureCount).append('\n');
            md.append("- 成功率：").append(String.format(Locale.ROOT, "%.2f%%", scenario.successRate)).append('\n');
            md.append("- P50：").append(scenario.p50Ms).append("ms\n");
            md.append("- P95：").append(scenario.p95Ms).append("ms\n");
            md.append("- P99：").append(scenario.p99Ms).append("ms\n");
            md.append("- Max：").append(scenario.maxMs).append("ms\n");
            if (!scenario.metrics.isEmpty()) {
                md.append("- 附加指标：\n");
                for (Map.Entry<String, Object> entry : scenario.metrics.entrySet()) {
                    md.append("  - ").append(entry.getKey()).append(": ").append(entry.getValue()).append('\n');
                }
            }
            if (!scenario.findings.isEmpty()) {
                md.append("- 结论：\n");
                for (String finding : scenario.findings) {
                    md.append("  - ").append(finding).append('\n');
                }
            }
            if (!scenario.notes.isEmpty()) {
                md.append("- 说明：\n");
                for (String note : scenario.notes) {
                    md.append("  - ").append(note).append('\n');
                }
            }
            if (!scenario.errorBreakdown.isEmpty()) {
                md.append("- 错误分布：\n");
                for (Map.Entry<String, Integer> entry : scenario.errorBreakdown.entrySet()) {
                    md.append("  - ").append(entry.getKey()).append(": ").append(entry.getValue()).append('\n');
                }
            }
            md.append('\n');
        }

        Files.writeString(mdPath, md.toString(), StandardCharsets.UTF_8);
    }

    private Path resolveProjectRoot() {
        Path cwd = Paths.get("").toAbsolutePath().normalize();
        if (cwd.getFileName() != null && "04-统一后端".equals(cwd.getFileName().toString())) {
            return cwd.getParent();
        }
        return cwd;
    }

    private long percentile(Queue<Long> durations, int percentile) {
        List<Long> ordered = new ArrayList<>(durations);
        ordered.sort(Comparator.naturalOrder());
        if (ordered.isEmpty()) {
            return 0L;
        }
        int index = (int) Math.ceil((percentile / 100.0d) * ordered.size()) - 1;
        index = Math.min(Math.max(index, 0), ordered.size() - 1);
        return ordered.get(index);
    }

    private ScenarioReport findScenario(List<ScenarioReport> scenarios, String name) {
        return scenarios.stream()
                .filter(item -> name.equals(item.name))
                .findFirst()
                .orElseThrow();
    }

    private String buildComparisonSummary(String label, ScenarioReport baseline, ScenarioReport optimized) {
        return label + ": baseline P95 " + baseline.p95Ms + "ms -> optimized P95 " + optimized.p95Ms + "ms"
                + ", baseline P99 " + baseline.p99Ms + "ms -> optimized P99 " + optimized.p99Ms + "ms";
    }

    private String describeTailBehavior(ScenarioReport report) {
        if (report.p95Ms == 0 && report.p99Ms == 0) {
            return "当前样本几乎全部命中缓存，PDF 路径已经压到毫秒内。";
        }
        if (report.p50Ms == 0) {
            return "当前样本出现了明显缓存命中，尾延迟已经远低于未优化路径。";
        }
        if (report.p95Ms >= report.p50Ms * 2) {
            return "PDF 生成已经出现明显长尾，P95 至少是 P50 的两倍。";
        }
        return "本地 PDF 生成的尾延迟目前仍在可控范围，没有出现极端抖动。";
    }

    private double percent(int value, int total) {
        if (total == 0) {
            return 0d;
        }
        return value * 100d / total;
    }

    private int intProperty(String key, int defaultValue) {
        return Integer.getInteger(key, defaultValue);
    }

    private long average(Queue<Integer> values) {
        if (values.isEmpty()) {
            return 0L;
        }
        long sum = 0L;
        for (Integer value : values) {
            sum += value;
        }
        return Math.round(sum / (double) values.size());
    }

    private void setField(Object target, String fieldName, Object value) throws Exception {
        var field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }

    @FunctionalInterface
    interface ThrowingSupplier<T> {
        T get() throws Exception;
    }

    @FunctionalInterface
    interface IntSupplier {
        int get() throws Exception;
    }

    static class Report {
        public String generatedAt;
        public Map<String, Object> environment = new LinkedHashMap<>();
        public List<String> summary = new ArrayList<>();
        public List<ScenarioReport> scenarios = new ArrayList<>();
    }

    static class ScenarioReport {
        public String name;
        public int totalRequests;
        public int concurrency;
        public int successCount;
        public int failureCount;
        public double successRate;
        public long p50Ms;
        public long p95Ms;
        public long p99Ms;
        public long maxMs;
        public Map<String, Object> metrics = new LinkedHashMap<>();
        public Map<String, Integer> errorBreakdown = new LinkedHashMap<>();
        public List<String> findings = new ArrayList<>();
        public List<String> notes = new ArrayList<>();
    }
}
