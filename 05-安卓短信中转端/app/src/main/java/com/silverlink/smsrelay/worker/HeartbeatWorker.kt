package com.silverlink.smsrelay.worker

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.silverlink.smsrelay.data.local.RelayPreferences
import com.silverlink.smsrelay.data.network.ApiClientFactory
import com.silverlink.smsrelay.data.network.RelayApiService

class HeartbeatWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    private val relayPreferences = RelayPreferences(appContext)
    private val apiService = RelayApiService(ApiClientFactory.create())

    override suspend fun doWork(): Result {
        val config = relayPreferences.readConfig()
        if (config.serverBaseUrl.isBlank()) {
            Log.w(TAG, "HeartbeatWorker skipped: empty server base url")
            return Result.success()
        }

        val result = apiService.sendHeartbeat(config.serverBaseUrl, config.deviceId, config.deviceSecret)
        result.onSuccess {
            relayPreferences.saveLastHeartbeat(System.currentTimeMillis())
            Log.i(TAG, "HeartbeatWorker success for device=${config.deviceId}")
        }.onFailure {
            Log.w(TAG, "HeartbeatWorker failed for device=${config.deviceId}: ${it.message}")
        }
        return if (result.isSuccess) Result.success() else Result.retry()
    }

    companion object {
        private const val TAG = "SmsRelayHeartbeat"
    }
}
