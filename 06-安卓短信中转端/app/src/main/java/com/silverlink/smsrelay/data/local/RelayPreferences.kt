package com.silverlink.smsrelay.data.local

import android.content.Context
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

class RelayPreferences(context: Context) {

    private val prefs = context.getSharedPreferences("sms-relay", Context.MODE_PRIVATE)

    fun readConfig(): RelayConfig {
        return RelayConfig(
            serverBaseUrl = prefs.getString(KEY_SERVER_BASE_URL, "") ?: "",
            deviceId = prefs.getString(KEY_DEVICE_ID, "") ?: "",
            deviceSecret = prefs.getString(KEY_DEVICE_SECRET, "") ?: "",
            receiverPhone = prefs.getString(KEY_RECEIVER_PHONE, "") ?: "",
            messagePrefix = prefs.getString(KEY_MESSAGE_PREFIX, DEFAULT_PREFIX) ?: DEFAULT_PREFIX,
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
            .putString(KEY_SERVER_BASE_URL, serverBaseUrl)
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

    companion object {
        private const val KEY_SERVER_BASE_URL = "server_base_url"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_DEVICE_SECRET = "device_secret"
        private const val KEY_RECEIVER_PHONE = "receiver_phone"
        private const val KEY_MESSAGE_PREFIX = "message_prefix"
        private const val DEFAULT_PREFIX = "SL"
        private const val KEY_LAST_SYNC = "last_sync"
        private const val KEY_LAST_HEARTBEAT = "last_heartbeat"
        private const val KEY_UPTIME_START = "uptime_start"
        private const val KEY_STATS_DATE = "stats_date"
        private const val KEY_STATS_RECEIVED = "stats_received"
        private const val KEY_STATS_UPLOADED = "stats_uploaded"
        private const val KEY_STATS_FAILED = "stats_failed"
        private const val KEY_STATS_PENDING = "stats_pending"
    }
}
