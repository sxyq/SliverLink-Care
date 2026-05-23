package com.silverlink.smsrelay.repository

import android.content.Context
import com.silverlink.smsrelay.data.local.RelayPreferences
import com.silverlink.smsrelay.data.local.TodayStats
import com.silverlink.smsrelay.data.model.InboundSmsPayload
import com.silverlink.smsrelay.data.model.SmsRecord
import com.silverlink.smsrelay.data.model.UploadStatus
import com.silverlink.smsrelay.data.network.ApiClientFactory
import com.silverlink.smsrelay.data.network.RelayApiService
import org.json.JSONArray
import org.json.JSONObject

class SmsRelayRepository(
    context: Context,
    private val relayPreferences: RelayPreferences = RelayPreferences(context),
    private val apiService: RelayApiService = RelayApiService(ApiClientFactory.create()),
) {

    private val prefs = context.getSharedPreferences("sms-relay-records", Context.MODE_PRIVATE)

    fun uploadInboundSms(senderPhone: String, messageBody: String, receivedAt: Long): Result<Unit> {
        val config = relayPreferences.readConfig()
        val recordId = "sms-${System.currentTimeMillis()}"

        // 保存为PENDING状态
        saveRecord(SmsRecord(recordId, senderPhone, messageBody, receivedAt, UploadStatus.PENDING))
        incrementStatsReceived()

        val payload = InboundSmsPayload(
            deviceId = config.deviceId,
            receiverPhone = config.receiverPhone,
            senderPhone = senderPhone,
            messageBody = messageBody,
            receivedAt = receivedAt,
            messagePrefix = config.messagePrefix,
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

    private fun saveRecord(record: SmsRecord) {
        val records = getAllRecords().toMutableList()
        records.add(record)
        saveAllRecords(records)
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
        records.forEach { record ->
            val obj = JSONObject()
            obj.put("id", record.id)
            obj.put("senderPhone", record.senderPhone)
            obj.put("messageBody", record.messageBody)
            obj.put("receivedAt", record.receivedAt)
            obj.put("status", record.status.name)
            record.uploadedAt?.let { obj.put("uploadedAt", it) }
            record.failReason?.let { obj.put("failReason", it) }
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
    }
}
