package com.silverlink.smsrelay.data.local

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.silverlink.smsrelay.util.RelayServerUrlNormalizer
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class RelayConfig(
    val serverBaseUrl: String,
    val deviceId: String,
    val deviceSecret: String,
    val receiverPhone: String,
    val messagePrefix: String,
)

data class TodayStats(
    val received: Int,
    val uploaded: Int,
    val failed: Int,
    val pending: Int,
)

data class RelayServiceState(
    val running: Boolean,
    val statusText: String,
)

class RelayPreferences(context: Context) {

    private val legacyPrefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
    private val prefs = createPreferences(context)

    fun readConfig(): RelayConfig {
        val storedServerBaseUrl = readStoredString(KEY_SERVER_BASE_URL)
        val storedDeviceId = readStoredString(KEY_DEVICE_ID)
        val storedDeviceSecret = readStoredString(KEY_DEVICE_SECRET)
        val storedReceiverPhone = readStoredString(KEY_RECEIVER_PHONE)
        val storedMessagePrefix = readStoredString(KEY_MESSAGE_PREFIX, DEFAULT_PREFIX).ifBlank { DEFAULT_PREFIX }
        val normalizedServerBaseUrl = RelayServerUrlNormalizer.normalize(storedServerBaseUrl)
        val shouldMigrate =
            normalizedServerBaseUrl != storedServerBaseUrl ||
                prefs.getString(KEY_SERVER_BASE_URL, null).isNullOrBlank() && normalizedServerBaseUrl.isNotBlank() ||
                prefs.getString(KEY_DEVICE_ID, null).isNullOrBlank() && storedDeviceId.isNotBlank() ||
                prefs.getString(KEY_DEVICE_SECRET, null).isNullOrBlank() && storedDeviceSecret.isNotBlank() ||
                prefs.getString(KEY_RECEIVER_PHONE, null).isNullOrBlank() && storedReceiverPhone.isNotBlank() ||
                prefs.getString(KEY_MESSAGE_PREFIX, null).isNullOrBlank() && storedMessagePrefix.isNotBlank()
        if (shouldMigrate) {
            saveConfig(
                serverBaseUrl = normalizedServerBaseUrl,
                deviceId = storedDeviceId,
                deviceSecret = storedDeviceSecret,
                receiverPhone = storedReceiverPhone,
                messagePrefix = storedMessagePrefix,
            )
        }
        return RelayConfig(
            serverBaseUrl = normalizedServerBaseUrl,
            deviceId = storedDeviceId,
            deviceSecret = storedDeviceSecret,
            receiverPhone = storedReceiverPhone,
            messagePrefix = storedMessagePrefix,
        )
    }

    fun saveConfig(
        serverBaseUrl: String,
        deviceId: String,
        deviceSecret: String,
        receiverPhone: String,
        messagePrefix: String,
    ) {
        prefs.edit()
            .putString(KEY_SERVER_BASE_URL, RelayServerUrlNormalizer.normalize(serverBaseUrl))
            .putString(KEY_DEVICE_ID, deviceId)
            .putString(KEY_DEVICE_SECRET, deviceSecret)
            .putString(KEY_RECEIVER_PHONE, receiverPhone)
            .putString(KEY_MESSAGE_PREFIX, messagePrefix.ifBlank { DEFAULT_PREFIX })
            .apply()
    }

    fun saveLastSyncTime(timestamp: Long) {
        prefs.edit().putLong(KEY_LAST_SYNC, timestamp).apply()
    }

    fun getLastSyncTime(): String {
        val ts = prefs.getLong(KEY_LAST_SYNC, 0)
        return if (ts > 0) formatDateTime(ts) else "从未"
    }

    fun saveLastHeartbeat(timestamp: Long) {
        prefs.edit().putLong(KEY_LAST_HEARTBEAT, timestamp).apply()
    }

    fun getLastHeartbeat(): String {
        val ts = prefs.getLong(KEY_LAST_HEARTBEAT, 0)
        return if (ts > 0) formatDateTime(ts) else "从未"
    }

    fun saveLastInboxScan(timestamp: Long) {
        prefs.edit().putLong(KEY_LAST_INBOX_SCAN, timestamp).apply()
    }

    fun getLastInboxScanTimestamp(): Long {
        return prefs.getLong(KEY_LAST_INBOX_SCAN, 0L)
    }

    fun saveUptimeStart(timestamp: Long) {
        prefs.edit().putLong(KEY_UPTIME_START, timestamp).apply()
    }

    fun getUptime(): String {
        val start = prefs.getLong(KEY_UPTIME_START, 0)
        if (start == 0L) return "未知"
        val elapsed = System.currentTimeMillis() - start
        val hours = elapsed / 3600000
        val minutes = (elapsed % 3600000) / 60000
        return "${hours}时${minutes}分"
    }

    fun saveServiceState(running: Boolean, statusText: String) {
        prefs.edit()
            .putBoolean(KEY_SERVICE_RUNNING, running)
            .putString(KEY_SERVICE_STATUS_TEXT, statusText)
            .apply()
    }

    fun readServiceState(): RelayServiceState {
        return RelayServiceState(
            running = prefs.getBoolean(KEY_SERVICE_RUNNING, false),
            statusText = prefs.getString(KEY_SERVICE_STATUS_TEXT, "未启动") ?: "未启动",
        )
    }

    fun saveMediaKeepAliveEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_MEDIA_KEEPALIVE_ENABLED, enabled).apply()
    }

    fun isMediaKeepAliveEnabled(): Boolean {
        return prefs.getBoolean(KEY_MEDIA_KEEPALIVE_ENABLED, false)
    }

    fun saveTodayStats(received: Int, uploaded: Int, failed: Int, pending: Int) {
        val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        prefs.edit()
            .putString(KEY_STATS_DATE, today)
            .putInt(KEY_STATS_RECEIVED, received)
            .putInt(KEY_STATS_UPLOADED, uploaded)
            .putInt(KEY_STATS_FAILED, failed)
            .putInt(KEY_STATS_PENDING, pending)
            .apply()
    }

    fun readTodayStats(): TodayStats {
        val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        val savedDate = prefs.getString(KEY_STATS_DATE, "") ?: ""
        return if (savedDate == today) {
            TodayStats(
                received = prefs.getInt(KEY_STATS_RECEIVED, 0),
                uploaded = prefs.getInt(KEY_STATS_UPLOADED, 0),
                failed = prefs.getInt(KEY_STATS_FAILED, 0),
                pending = prefs.getInt(KEY_STATS_PENDING, 0),
            )
        } else {
            TodayStats(0, 0, 0, 0)
        }
    }

    private fun formatDateTime(timestamp: Long): String {
        return SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault()).format(Date(timestamp))
    }

    private fun readStoredString(key: String, defaultValue: String = ""): String {
        val primary = prefs.getString(key, null)
        if (!primary.isNullOrBlank()) {
            return primary
        }
        return legacyPrefs.getString(key, defaultValue) ?: defaultValue
    }

    companion object {
        private const val PREF_NAME = "sms-relay"
        private const val KEY_SERVER_BASE_URL = "server_base_url"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_DEVICE_SECRET = "device_secret"
        private const val KEY_RECEIVER_PHONE = "receiver_phone"
        private const val KEY_MESSAGE_PREFIX = "message_prefix"
        private const val DEFAULT_PREFIX = "SL"
        private const val KEY_LAST_SYNC = "last_sync"
        private const val KEY_LAST_HEARTBEAT = "last_heartbeat"
        private const val KEY_LAST_INBOX_SCAN = "last_inbox_scan"
        private const val KEY_UPTIME_START = "uptime_start"
        private const val KEY_SERVICE_RUNNING = "service_running"
        private const val KEY_SERVICE_STATUS_TEXT = "service_status_text"
        private const val KEY_MEDIA_KEEPALIVE_ENABLED = "media_keepalive_enabled"
        private const val KEY_STATS_DATE = "stats_date"
        private const val KEY_STATS_RECEIVED = "stats_received"
        private const val KEY_STATS_UPLOADED = "stats_uploaded"
        private const val KEY_STATS_FAILED = "stats_failed"
        private const val KEY_STATS_PENDING = "stats_pending"

        private fun createPreferences(context: Context): SharedPreferences {
            return runCatching {
                val masterKey = MasterKey.Builder(context)
                    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                    .build()
                EncryptedSharedPreferences.create(
                    context,
                    PREF_NAME,
                    masterKey,
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
                )
            }.getOrElse {
                context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
            }
        }
    }
}
