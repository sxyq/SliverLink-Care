package com.silverlink.smsrelay.data.network

import android.util.Log
import com.silverlink.smsrelay.data.model.InboundSmsPayload
import com.silverlink.smsrelay.util.RelayServerUrlNormalizer
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.net.URI

data class RelayEnrollmentStatus(
    val requestId: String,
    val status: String,
    val deviceId: String,
    val reviewReason: String,
    val expiresAt: String,
)

class RelayHttpException(
    val statusCode: Int,
    message: String,
) : IllegalStateException(message)

fun Throwable.isRelayDeviceRevoked(): Boolean = this is RelayHttpException && statusCode == 403

class RelayApiService(
    private val client: OkHttpClient,
) {

    fun uploadInboundSms(
        baseUrl: String,
        deviceSecret: String,
        payload: InboundSmsPayload,
    ): Result<Unit> {
        val normalizedBaseUrl = secureBaseUrl(baseUrl).getOrElse { return Result.failure(it) }
        Log.i(TAG, "uploadInboundSms baseUrl=$baseUrl normalizedBaseUrl=$normalizedBaseUrl")
        if (normalizedBaseUrl.isBlank()) {
            return Result.failure(IllegalStateException("Server base url is empty"))
        }

        val bodyJson = JSONObject()
            .put("deviceId", payload.deviceId)
            .put("receiverPhone", payload.receiverPhone)
            .put("senderPhone", payload.senderPhone)
            .put("messageBody", payload.messageBody)
            .put("receivedAt", payload.receivedAt)
            .put("messagePrefix", payload.messagePrefix)
            .put("clientRecordId", payload.clientRecordId)
        val path = "/api/sms-relay/inbound"
        val signaturePayload = mutableListOf(
            payload.deviceId,
            payload.receiverPhone,
            payload.senderPhone,
            payload.messageBody,
            payload.receivedAt.toString(),
            payload.messagePrefix,
        )
        if (payload.clientRecordId.isNotBlank()) {
            signaturePayload += payload.clientRecordId
        }
        val signed = RelayRequestSigner.sign(
            method = "POST",
            path = path,
            payload = signaturePayload.joinToString("\n"),
            secret = deviceSecret,
        )

        val request = Request.Builder()
            .url(normalizedBaseUrl.trimEnd('/') + path)
            .addHeader("X-Relay-Device-Secret", deviceSecret)
            .addHeader("X-Relay-Timestamp", signed.timestamp)
            .addHeader("X-Relay-Nonce", signed.nonce)
            .addHeader("X-Relay-Signature", signed.signature)
            .post(bodyJson.toString().toRequestBody("application/json; charset=utf-8".toMediaType()))
            .build()

        return runCatching {
            client.newCall(request).execute().use { response ->
                response.requireSuccessful("Relay upload failed")
            }
        }
    }

    fun sendHeartbeat(baseUrl: String, deviceId: String, deviceSecret: String): Result<Unit> {
        val normalizedBaseUrl = secureBaseUrl(baseUrl).getOrElse { return Result.failure(it) }
        Log.i(TAG, "sendHeartbeat baseUrl=$baseUrl normalizedBaseUrl=$normalizedBaseUrl deviceId=$deviceId")
        if (normalizedBaseUrl.isBlank()) {
            return Result.failure(IllegalStateException("Server base url is empty"))
        }

        val bodyJson = JSONObject()
            .put("deviceId", deviceId)
            .put("timestamp", System.currentTimeMillis())
        val path = "/api/sms-relay/heartbeat"
        val signed = RelayRequestSigner.sign(
            method = "POST",
            path = path,
            payload = "$deviceId\n${bodyJson.getLong("timestamp")}",
            secret = deviceSecret,
        )

        val request = Request.Builder()
            .url(normalizedBaseUrl.trimEnd('/') + path)
            .addHeader("X-Relay-Device-Secret", deviceSecret)
            .addHeader("X-Relay-Timestamp", signed.timestamp)
            .addHeader("X-Relay-Nonce", signed.nonce)
            .addHeader("X-Relay-Signature", signed.signature)
            .post(bodyJson.toString().toRequestBody("application/json; charset=utf-8".toMediaType()))
            .build()

        return runCatching {
            client.newCall(request).execute().use { response ->
                response.requireSuccessful("Heartbeat failed")
            }
        }
    }

    fun fetchDeviceConfig(baseUrl: String, deviceId: String, deviceSecret: String): Result<JSONObject> {
        val normalizedBaseUrl = secureBaseUrl(baseUrl).getOrElse { return Result.failure(it) }
        Log.i(TAG, "fetchDeviceConfig baseUrl=$baseUrl normalizedBaseUrl=$normalizedBaseUrl deviceId=$deviceId")
        if (normalizedBaseUrl.isBlank()) {
            return Result.failure(IllegalStateException("Server base url is empty"))
        }
        val path = "/api/sms-relay/devices/$deviceId/config"
        val signed = RelayRequestSigner.sign(
            method = "GET",
            path = path,
            payload = deviceId,
            secret = deviceSecret,
        )

        val request = Request.Builder()
            .url(normalizedBaseUrl.trimEnd('/') + path)
            .addHeader("X-Relay-Device-Secret", deviceSecret)
            .addHeader("X-Relay-Timestamp", signed.timestamp)
            .addHeader("X-Relay-Nonce", signed.nonce)
            .addHeader("X-Relay-Signature", signed.signature)
            .get()
            .build()

        return runCatching {
            client.newCall(request).execute().use { response ->
                response.requireSuccessful("Fetch config failed")
                val body = response.body?.string() ?: ""
                val json = JSONObject(body)
                json.optJSONObject("data") ?: json
            }
        }
    }

    fun submitEnrollmentRequest(
        baseUrl: String,
        requestId: String,
        requestToken: String,
        deviceSecret: String,
        deviceName: String,
        receiverPhone: String,
        messagePrefix: String,
    ): Result<RelayEnrollmentStatus> {
        val normalizedBaseUrl = secureBaseUrl(baseUrl).getOrElse { return Result.failure(it) }
        if (requestId.isBlank() || requestToken.isBlank() || deviceSecret.isBlank()) {
            return Result.failure(IllegalArgumentException("申请凭据不完整"))
        }
        val bodyJson = JSONObject()
            .put("requestId", requestId)
            .put("deviceName", deviceName)
            .put("receiverPhone", receiverPhone)
            .put("serverUrl", normalizedBaseUrl)
            .put("messagePrefix", messagePrefix)
            .put("deviceSecret", deviceSecret)
        val request = Request.Builder()
            .url(normalizedBaseUrl.trimEnd('/') + "/api/sms-relay/enrollment-requests")
            .addHeader("X-Relay-Enrollment-Token", requestToken)
            .post(bodyJson.toString().toRequestBody("application/json; charset=utf-8".toMediaType()))
            .build()
        return runCatching {
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) error("申请提交失败：${response.code}")
                parseEnrollmentStatus(response.body?.string().orEmpty())
            }
        }
    }

    fun fetchEnrollmentStatus(baseUrl: String, requestId: String, requestToken: String): Result<RelayEnrollmentStatus> {
        val normalizedBaseUrl = secureBaseUrl(baseUrl).getOrElse { return Result.failure(it) }
        if (requestId.isBlank() || requestToken.isBlank()) {
            return Result.failure(IllegalArgumentException("申请凭据不完整"))
        }
        val request = Request.Builder()
            .url(normalizedBaseUrl.trimEnd('/') + "/api/sms-relay/enrollment-requests/$requestId")
            .addHeader("X-Relay-Enrollment-Token", requestToken)
            .get()
            .build()
        return runCatching {
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) error("申请状态获取失败：${response.code}")
                parseEnrollmentStatus(response.body?.string().orEmpty())
            }
        }
    }

    private fun secureBaseUrl(baseUrl: String): Result<String> = runCatching {
        val normalized = RelayServerUrlNormalizer.normalize(baseUrl)
        require(normalized.isNotBlank()) { "服务器地址不能为空" }
        val uri = URI.create(normalized)
        val scheme = uri.scheme?.lowercase()
        val host = uri.host?.lowercase()
        val localHttpHost = host in setOf("localhost", "127.0.0.1", "::1", "10.0.2.2")
        require(scheme == "https" || (scheme == "http" && localHttpHost)) {
            "服务器地址必须使用 HTTPS"
        }
        require(host != null && uri.rawUserInfo == null && uri.rawQuery == null && uri.rawFragment == null) {
            "服务器地址格式不正确"
        }
        normalized.trimEnd('/')
    }

    private fun parseEnrollmentStatus(body: String): RelayEnrollmentStatus {
        val root = JSONObject(body)
        val code = root.optInt("code", 200)
        if (code >= 400) {
            error(root.optString("message", "申请状态获取失败"))
        }
        val data = root.optJSONObject("data") ?: root
        return RelayEnrollmentStatus(
            requestId = data.optString("requestId"),
            status = data.optString("status"),
            deviceId = data.optString("deviceId"),
            reviewReason = data.optString("reviewReason"),
            expiresAt = data.optString("expiresAt"),
        )
    }

    private fun okhttp3.Response.requireSuccessful(message: String) {
        if (!isSuccessful) {
            throw RelayHttpException(code, "$message: $code")
        }
    }

    companion object {
        private const val TAG = "SmsRelayApi"
    }
}
