package com.silverlink.smsrelay.worker

import android.content.Context
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
        if (config.serverBaseUrl.isBlank()) return Result.success()

        val result = apiService.sendHeartbeat(config.serverBaseUrl, config.deviceId, config.deviceSecret)
        result.onSuccess {
            relayPreferences.saveLastHeartbeat(System.currentTimeMillis())
        }
        return if (result.isSuccess) Result.success() else Result.retry()
    }
}
