package com.silverlink.smsrelay.repository

import android.content.Context
import android.provider.Telephony
import android.util.Log
import com.silverlink.smsrelay.data.local.RelayPreferences
import com.silverlink.smsrelay.data.local.TodayStats
import com.silverlink.smsrelay.data.model.InboundSmsPayload
import com.silverlink.smsrelay.data.model.SmsRecord
import com.silverlink.smsrelay.data.model.UploadStatus
import com.silverlink.smsrelay.data.network.ApiClientFactory
import com.silverlink.smsrelay.data.network.RelayApiService
import com.silverlink.smsrelay.util.SmsParser
import com.silverlink.smsrelay.util.SmsPermissionHelper
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest
import java.util.concurrent.TimeUnit

class SmsRelayRepository(
    private val context: Context,
    private val relayPreferences: RelayPreferences = RelayPreferences(context),
    private val apiService: RelayApiService = RelayApiService(ApiClientFactory.create()),
) {

    private val prefs = context.getSharedPreferences("sms-relay-records", Context.MODE_PRIVATE)

    fun uploadInboundSms(senderPhone: String, messageBody: String, receivedAt: Long): Result<Unit> {
        return uploadInboundSms(senderPhone, messageBody, receivedAt, advisoryMessage = null)
    }

    fun uploadInboundSms(
        senderPhone: String,
        messageBody: String,
        receivedAt: Long,
        advisoryMessage: String? = null,
    ): Result<Unit> {
        val config = relayPreferences.readConfig()
        val recordId = stableRecordId(senderPhone, messageBody, receivedAt)

        // 保存为PENDING状态
        val isNewRecord = saveRecord(
            SmsRecord(
                id = recordId,
                senderPhone = senderPhone,
                messageBody = messageBody,
                receivedAt = receivedAt,
                status = UploadStatus.PENDING,
                advisoryMessage = advisoryMessage,
            ),
        )
        if (isNewRecord) {
            incrementStatsReceived()
        }

        val payload = InboundSmsPayload(
            deviceId = config.deviceId,
            receiverPhone = config.receiverPhone,
            senderPhone = senderPhone,
            messageBody = messageBody,
            receivedAt = receivedAt,
            messagePrefix = config.messagePrefix,
            clientRecordId = recordId,
        )

        val result = apiService.uploadInboundSms(
            baseUrl = config.serverBaseUrl,
            deviceSecret = config.deviceSecret,
            payload = payload,
        )

        result.onSuccess {
            updateRecordStatus(recordId, UploadStatus.UPLOADED)
            relayPreferences.saveLastSyncTime(System.currentTimeMillis())
            incrementStatsUploaded()
        }.onFailure {
            updateRecordStatus(recordId, UploadStatus.FAILED, it.message)
            incrementStatsFailed()
        }

        return result
    }

    fun getAllRecords(): List<SmsRecord> {
        val json = prefs.getString(KEY_RECORDS, "[]") ?: "[]"
        val array = JSONArray(json)
        return (0 until array.length()).map { i ->
            val obj = array.getJSONObject(i)
            SmsRecord(
                id = obj.getString("id"),
                senderPhone = obj.getString("senderPhone"),
                messageBody = obj.getString("messageBody"),
                receivedAt = obj.getLong("receivedAt"),
                status = UploadStatus.valueOf(obj.getString("status")),
                uploadedAt = obj.optLong("uploadedAt", 0).let { if (it == 0L) null else it },
                failReason = obj.optString("failReason", ""),
                advisoryMessage = obj.optString("advisoryMessage", "").ifBlank { null },
            )
        }.sortedByDescending { it.receivedAt }
    }

    fun getRecordsByStatus(status: UploadStatus): List<SmsRecord> {
        return getAllRecords().filter { it.status == status }
    }

    fun getRecentRecords(limit: Int): List<SmsRecord> {
        return getAllRecords().take(limit)
    }

    fun getTodayStats(): TodayStats {
        return relayPreferences.readTodayStats()
    }

    fun syncMissedVerificationSmsFromInbox(): Result<Int> {
        if (!SmsPermissionHelper.hasSmsPermissions(context)) {
            Log.w(TAG, "Inbox sync skipped: SMS permissions missing")
            return Result.failure(IllegalStateException("SMS permissions missing"))
        }

        val config = relayPreferences.readConfig()
        val existingFingerprints = getAllRecords()
            .asSequence()
            .filter { it.status != UploadStatus.FAILED }
            .map(::fingerprintOf)
            .toMutableSet()
        val lastScanTimestamp = relayPreferences.getLastInboxScanTimestamp()
        val now = System.currentTimeMillis()
        val queryStartTimestamp = maxOf(
            0L,
            if (lastScanTimestamp > 0L) {
                lastScanTimestamp - INBOX_SCAN_OVERLAP_MS
            } else {
                now - INITIAL_INBOX_LOOKBACK_MS
            },
        )

        val projection = arrayOf(
            Telephony.Sms._ID,
            Telephony.Sms.ADDRESS,
            Telephony.Sms.BODY,
            Telephony.Sms.DATE,
        )
        val selection = "${Telephony.Sms.DATE} >= ?"
        val selectionArgs = arrayOf(queryStartTimestamp.toString())
        val sortOrder = "${Telephony.Sms.DATE} DESC LIMIT $INBOX_SCAN_LIMIT"

        var newestTimestamp = lastScanTimestamp
        var uploadedCount = 0

        context.contentResolver.query(
            Telephony.Sms.Inbox.CONTENT_URI,
            projection,
            selection,
            selectionArgs,
            sortOrder,
        )?.use { cursor ->
            val addressIndex = cursor.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
            val bodyIndex = cursor.getColumnIndexOrThrow(Telephony.Sms.BODY)
            val dateIndex = cursor.getColumnIndexOrThrow(Telephony.Sms.DATE)

            while (cursor.moveToNext()) {
                val senderPhone = cursor.getString(addressIndex).orEmpty()
                val messageBody = cursor.getString(bodyIndex).orEmpty()
                val receivedAt = cursor.getLong(dateIndex)
                newestTimestamp = maxOf(newestTimestamp, receivedAt)

                val parsed = SmsParser.parse(messageBody, config.messagePrefix)
                if (!parsed.matched) {
                    continue
                }

                val fingerprint = fingerprintOf(
                    senderPhone = senderPhone,
                    messageBody = parsed.rawBody,
                    receivedAt = receivedAt,
                )
                if (!existingFingerprints.add(fingerprint)) {
                    continue
                }

                val uploadResult = uploadInboundSms(
                    senderPhone = senderPhone,
                    messageBody = parsed.rawBody,
                    receivedAt = receivedAt,
                    advisoryMessage = buildInboxRecoveryAdvisory(now = now, receivedAt = receivedAt),
                )
                uploadResult.onSuccess {
                    uploadedCount += 1
                }
            }
        }

        relayPreferences.saveLastInboxScan(maxOf(newestTimestamp, now))
        if (uploadedCount > 0) {
            Log.i(TAG, "Inbox sync uploaded $uploadedCount missed verification SMS messages")
        }
        return Result.success(uploadedCount)
    }

    private fun saveRecord(record: SmsRecord): Boolean {
        val records = getAllRecords().toMutableList()
        val isNewRecord = records.none { it.id == record.id }
        records.removeAll { it.id == record.id }
        records.add(record)
        saveAllRecords(records)
        return isNewRecord
    }

    private fun updateRecordStatus(id: String, status: UploadStatus, failReason: String? = null) {
        val records = getAllRecords().toMutableList()
        val index = records.indexOfFirst { it.id == id }
        if (index >= 0) {
            records[index] = records[index].copy(
                status = status,
                uploadedAt = if (status == UploadStatus.UPLOADED) System.currentTimeMillis() else null,
                failReason = failReason,
            )
            saveAllRecords(records)
        }
    }

    private fun saveAllRecords(records: List<SmsRecord>) {
        val array = JSONArray()
        records
            .sortedByDescending { it.receivedAt }
            .take(MAX_STORED_RECORDS)
            .forEach { record ->
            val obj = JSONObject()
            obj.put("id", record.id)
            obj.put("senderPhone", record.senderPhone)
            obj.put("messageBody", record.messageBody)
            obj.put("receivedAt", record.receivedAt)
            obj.put("status", record.status.name)
            record.uploadedAt?.let { obj.put("uploadedAt", it) }
            record.failReason?.let { obj.put("failReason", it) }
            record.advisoryMessage?.let { obj.put("advisoryMessage", it) }
            array.put(obj)
        }
        prefs.edit().putString(KEY_RECORDS, array.toString()).apply()
    }

    private fun incrementStatsReceived() {
        val stats = relayPreferences.readTodayStats()
        relayPreferences.saveTodayStats(stats.received + 1, stats.uploaded, stats.failed, stats.pending + 1)
    }

    private fun incrementStatsUploaded() {
        val stats = relayPreferences.readTodayStats()
        relayPreferences.saveTodayStats(stats.received, stats.uploaded + 1, stats.failed, stats.pending - 1)
    }

    private fun incrementStatsFailed() {
        val stats = relayPreferences.readTodayStats()
        relayPreferences.saveTodayStats(stats.received, stats.uploaded, stats.failed + 1, stats.pending - 1)
    }

    companion object {
        private const val KEY_RECORDS = "records_json"
        private const val TAG = "SmsRelayInboxSync"
        private const val INBOX_SCAN_LIMIT = 30
        private const val MAX_STORED_RECORDS = 500
        private val INITIAL_INBOX_LOOKBACK_MS = TimeUnit.HOURS.toMillis(12)
        private val INBOX_SCAN_OVERLAP_MS = TimeUnit.MINUTES.toMillis(10)
        private val VERIFICATION_SESSION_TTL_MS = TimeUnit.MINUTES.toMillis(5)

        private fun stableRecordId(senderPhone: String, messageBody: String, receivedAt: Long): String {
            val input = "$receivedAt|$senderPhone|$messageBody"
            val digest = MessageDigest.getInstance("SHA-256").digest(input.toByteArray())
            val hex = digest.joinToString("") { byte -> "%02x".format(byte) }
            return "sms-${hex.take(32)}"
        }

        private fun fingerprintOf(record: SmsRecord): String {
            return fingerprintOf(record.senderPhone, record.messageBody, record.receivedAt)
        }

        private fun fingerprintOf(senderPhone: String, messageBody: String, receivedAt: Long): String {
            return "$receivedAt|$senderPhone|$messageBody"
        }

        internal fun buildInboxRecoveryAdvisory(now: Long, receivedAt: Long): String? {
            val ageMs = now - receivedAt
            if (ageMs < VERIFICATION_SESSION_TTL_MS) {
                return null
            }
            val ageMinutes = TimeUnit.MILLISECONDS.toMinutes(ageMs).coerceAtLeast(1)
            return "这条验证码是从收件箱补扫上传的，已晚于收到后约${ageMinutes}分钟，验证会话可能已过期，请重新发起一次验证码。"
        }
    }
}
