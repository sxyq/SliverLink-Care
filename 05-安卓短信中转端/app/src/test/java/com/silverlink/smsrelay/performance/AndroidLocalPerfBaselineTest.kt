package com.silverlink.smsrelay.performance

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import com.silverlink.smsrelay.data.local.RelayPreferences
import com.silverlink.smsrelay.data.model.InboundSmsPayload
import com.silverlink.smsrelay.data.network.RelayApiService
import com.silverlink.smsrelay.data.network.RelayRequestSigner
import com.silverlink.smsrelay.repository.SmsRelayRepository
import com.silverlink.smsrelay.util.SmsParser
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.json.JSONArray
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.ceil
import kotlin.system.measureNanoTime

@RunWith(RobolectricTestRunner::class)
class AndroidLocalPerfBaselineTest {

    private lateinit var context: Application
    private lateinit var server: MockWebServer
    private lateinit var apiService: RelayApiService
    private lateinit var preferences: RelayPreferences
    private lateinit var repository: SmsRelayRepository

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        context.getSharedPreferences("sms-relay", Application.MODE_PRIVATE).edit().clear().commit()
        context.getSharedPreferences("sms-relay-records", Application.MODE_PRIVATE).edit().clear().commit()

        server = MockWebServer()
        server.start()
        apiService = RelayApiService(OkHttpClient())

        preferences = RelayPreferences(context)
        preferences.saveConfig(
            serverBaseUrl = server.url("/").toString(),
            deviceId = "device-1",
            deviceSecret = "secret-1",
            receiverPhone = "13800000000",
            messagePrefix = "SL",
        )
        repository = SmsRelayRepository(
            context = context,
            relayPreferences = preferences,
            apiService = RelayApiService(OkHttpClient()),
        )
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun generateAndroidLocalPerformanceBaseline() {
        val generatedAt = Instant.now().toString()
        val scenarios = mutableListOf<JSONObject>()

        scenarios += benchmarkMicros(
            name = "sms-parser-parse",
            iterations = 50_000,
        ) {
            SmsParser.parse("SL 123456", "SL")
        }

        scenarios += benchmarkMicros(
            name = "relay-request-signer-sign",
            iterations = 20_000,
        ) {
            RelayRequestSigner.sign(
                method = "POST",
                path = "/api/sms-relay/inbound",
                payload = "device-1\n13800000000\n13900000000\nSL 123456\n1770000000000\nSL",
                secret = "secret-1",
                epochSeconds = 1770000000L,
                nonce = "nonce-fixed",
            )
        }

        repeat(80) {
            server.enqueue(MockResponse().setResponseCode(200).setBody("""{"code":200}"""))
        }
        val uploadPayload = InboundSmsPayload(
            deviceId = "device-1",
            receiverPhone = "13800000000",
            senderPhone = "13900000000",
            messageBody = "SL 123456",
            receivedAt = 1770000000000L,
            messagePrefix = "SL",
        )
        scenarios += benchmarkMillis(
            name = "relay-api-upload-inbound-sms",
            iterations = 80,
        ) {
            apiService.uploadInboundSms(server.url("/").toString(), "secret-1", uploadPayload).getOrThrow()
        }

        repeat(80) {
            server.enqueue(MockResponse().setResponseCode(200).setBody("""{"code":200}"""))
        }
        scenarios += benchmarkMillis(
            name = "relay-api-send-heartbeat",
            iterations = 80,
        ) {
            apiService.sendHeartbeat(server.url("/").toString(), "device-1", "secret-1").getOrThrow()
        }

        repeat(40) {
            server.enqueue(MockResponse().setResponseCode(200).setBody("""{"code":200}"""))
        }
        scenarios += benchmarkMillis(
            name = "sms-relay-repository-upload-inbound-sms",
            iterations = 40,
        ) { index ->
            repository.uploadInboundSms(
                senderPhone = "13900000000",
                messageBody = "SL ${100000 + index}",
                receivedAt = 1770000000000L + index,
            ).getOrThrow()
        }

        val report = JSONObject()
            .put("generatedAt", generatedAt)
            .put("topic", "android-local-performance-baseline")
            .put(
                "environment",
                JSONObject()
                    .put("mode", "local-jvm-robolectric-baseline")
                    .put("scope", "parser-signer-api-repository")
                    .put("network", "mockwebserver-loopback"),
            )
            .put("scenarios", JSONArray(scenarios))

        writeReport(report)

        val hasParser = scenarios.any { it.getString("name") == "sms-parser-parse" }
        val hasUpload = scenarios.any { it.getString("name") == "relay-api-upload-inbound-sms" }
        assertTrue(hasParser && hasUpload)
    }

    private fun benchmarkMicros(name: String, iterations: Int, action: () -> Unit): JSONObject {
        val samples = ArrayList<Long>(iterations)
        repeat(iterations) {
            val elapsed = measureNanoTime(action)
            samples += elapsed / 1_000
        }
        return buildScenario(name, iterations, "us", samples)
    }

    private fun benchmarkMillis(name: String, iterations: Int, action: (Int) -> Unit): JSONObject {
        val samples = ArrayList<Long>(iterations)
        repeat(iterations) { index ->
            val elapsed = measureNanoTime { action(index) }
            samples += elapsed / 1_000_000
        }
        return buildScenario(name, iterations, "ms", samples)
    }

    private fun buildScenario(name: String, iterations: Int, unit: String, samples: List<Long>): JSONObject {
        val sorted = samples.sorted()
        return JSONObject()
            .put("name", name)
            .put("iterations", iterations)
            .put("unit", unit)
            .put("avg", samples.average())
            .put("p50", percentile(sorted, 50))
            .put("p95", percentile(sorted, 95))
            .put("p99", percentile(sorted, 99))
            .put("max", sorted.lastOrNull() ?: 0)
    }

    private fun percentile(sorted: List<Long>, pct: Int): Long {
        if (sorted.isEmpty()) return 0
        val index = ceil((pct / 100.0) * sorted.size).toInt() - 1
        return sorted[index.coerceIn(0, sorted.lastIndex)]
    }

    private fun writeReport(report: JSONObject) {
        val cwd = Paths.get("").toAbsolutePath()
        val root = when (cwd.fileName?.toString()) {
            "app" -> cwd.parent.parent
            "05-安卓短信中转端" -> cwd.parent
            else -> cwd
        }
        val outDir = root.resolve("06-测试与质量保障/reports/performance")
        Files.createDirectories(outDir)

        val stamp = FILE_TS.format(Instant.now())
        val jsonPath = outDir.resolve("${stamp}-android-local-performance-baseline.json")
        val mdPath = outDir.resolve("${stamp}-android-local-performance-baseline.md")

        Files.write(jsonPath, report.toString(2).toByteArray())
        Files.write(mdPath, toMarkdown(report, jsonPath.fileName.toString()).toByteArray())
    }

    private fun toMarkdown(report: JSONObject, jsonName: String): String {
        val lines = mutableListOf(
            "# Android 本地性能基线",
            "",
            "- 生成时间：${report.getString("generatedAt")}",
            "- 模式：Robolectric + MockWebServer 本地 JVM 基线",
            "- JSON 报告：$jsonName",
            "",
        )

        val scenarios = report.getJSONArray("scenarios")
        for (index in 0 until scenarios.length()) {
            val item = scenarios.getJSONObject(index)
            lines += "## ${item.getString("name")}"
            lines += ""
            lines += "- iterations：${item.getInt("iterations")}"
            lines += "- unit：${item.getString("unit")}"
            lines += "- avg：${"%.2f".format(Locale.ROOT, item.getDouble("avg"))} ${item.getString("unit")}"
            lines += "- P50：${item.getLong("p50")} ${item.getString("unit")}"
            lines += "- P95：${item.getLong("p95")} ${item.getString("unit")}"
            lines += "- P99：${item.getLong("p99")} ${item.getString("unit")}"
            lines += "- Max：${item.getLong("max")} ${item.getString("unit")}"
            lines += ""
        }

        lines += "## 说明"
        lines += ""
        lines += "- 这轮是 Android 本地逻辑性能基线，不是设备端真机 profiling。"
        lines += "- `RelayApiService` 和 `SmsRelayRepository` 使用本机 `MockWebServer` 回环请求，因此重点看代码路径相对开销，不代表公网网络时延。"
        return lines.joinToString("\n") + "\n"
    }

    companion object {
        private val FILE_TS: DateTimeFormatter =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH-mm-ss-SSS'Z'")
                .withZone(ZoneId.of("UTC"))
    }
}
