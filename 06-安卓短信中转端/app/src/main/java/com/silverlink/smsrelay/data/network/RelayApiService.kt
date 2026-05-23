package com.silverlink.smsrelay.data.network

import com.silverlink.smsrelay.data.model.InboundSmsPayload
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

class RelayApiService(
    private val client: OkHttpClient,
) {

    fun uploadInboundSms(
        baseUrl: String,
        deviceSecret: String,
        payload: InboundSmsPayload,
    ): Result<Unit> {
        if (baseUrl.isBlank()) {
            return Result.failure(IllegalStateException("Server base url is empty"))
        }

        val bodyJson = JSONObject()
            .put("deviceId", payload.deviceId)
            .put("receiverPhone", payload.receiverPhone)
            .put("senderPhone", payload.senderPhone)
            .put("messageBody", payload.messageBody)
            .put("receivedAt", payload.receivedAt)
            .put("messagePrefix", payload.messagePrefix)

        val request = Request.Builder()
            .url(baseUrl.trimEnd('/') + "/api/sms-relay/inbound")
            .addHeader("X-Relay-Device-Secret", deviceSecret)
            .post(bodyJson.toString().toRequestBody("application/json; charset=utf-8".toMediaType()))
            .build()

        return runCatching {
            client.newCall(request).execute().use { response ->
                check(response.isSuccessful) { "Relay upload failed: ${response.code}" }
            }
        }
    }

    fun sendHeartbeat(baseUrl: String, deviceId: String, deviceSecret: String): Result<Unit> {
        if (baseUrl.isBlank()) {
            return Result.failure(IllegalStateException("Server base url is empty"))
        }

        val bodyJson = JSONObject()
            .put("deviceId", deviceId)
            .put("timestamp", System.currentTimeMillis())

        val request = Request.Builder()
            .url(baseUrl.trimEnd('/') + "/api/sms-relay/heartbeat")
            .addHeader("X-Relay-Device-Secret", deviceSecret)
            .post(bodyJson.toString().toRequestBody("application/json; charset=utf-8".toMediaType()))
            .build()

        return runCatching {
            client.newCall(request).execute().use { response ->
                check(response.isSuccessful) { "Heartbeat failed: ${response.code}" }
            }
        }
    }

    fun fetchDeviceConfig(baseUrl: String, deviceId: String, deviceSecret: String): Result<JSONObject> {
        if (baseUrl.isBlank()) {
            return Result.failure(IllegalStateException("Server base url is empty"))
        }

        val request = Request.Builder()
            .url(baseUrl.trimEnd('/') + "/api/sms-relay/devices/$deviceId/config")
            .addHeader("X-Relay-Device-Secret", deviceSecret)
            .get()
            .build()

        return runCatching {
            client.newCall(request).execute().use { response ->
                check(response.isSuccessful) { "Fetch config failed: ${response.code}" }
                val body = response.body?.string() ?: ""
                JSONObject(body)
            }
        }
    }
}
