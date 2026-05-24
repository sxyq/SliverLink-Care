package com.silverlink.smsrelay.util

import com.silverlink.smsrelay.data.local.RelayConfig
import org.json.JSONObject

data class RemoteRelayConfig(
    val serverBaseUrl: String,
    val deviceId: String,
    val receiverPhone: String,
    val messagePrefix: String,
)

object RelayConfigSyncResolver {

    private const val PLACEHOLDER_SERVER_URL = "api.silverlink.example.com"
    private const val PLACEHOLDER_RECEIVER_PHONE = "13800001111"

    fun fromJson(remote: JSONObject): RemoteRelayConfig {
        return RemoteRelayConfig(
            serverBaseUrl = remote.optString("serverUrl", "").trim(),
            deviceId = remote.optString("deviceId", "").trim(),
            receiverPhone = remote.optString("receiverPhone", "").trim(),
            messagePrefix = remote.optString("messagePrefix", "").trim(),
        )
    }

    fun merge(local: RelayConfig, remote: RemoteRelayConfig): RelayConfig {
        return RelayConfig(
            serverBaseUrl = chooseServerUrl(local.serverBaseUrl, remote.serverBaseUrl),
            deviceId = remote.deviceId.ifBlank { local.deviceId },
            deviceSecret = local.deviceSecret,
            receiverPhone = chooseReceiverPhone(local.receiverPhone, remote.receiverPhone),
            messagePrefix = remote.messagePrefix.ifBlank { local.messagePrefix },
        )
    }

    private fun chooseServerUrl(localValue: String, remoteValue: String): String {
        if (remoteValue.isBlank()) return localValue
        if (remoteValue.contains(PLACEHOLDER_SERVER_URL, ignoreCase = true)) return localValue
        return remoteValue
    }

    private fun chooseReceiverPhone(localValue: String, remoteValue: String): String {
        if (remoteValue.isBlank()) return localValue
        if (remoteValue == PLACEHOLDER_RECEIVER_PHONE) return localValue
        return remoteValue
    }
}
