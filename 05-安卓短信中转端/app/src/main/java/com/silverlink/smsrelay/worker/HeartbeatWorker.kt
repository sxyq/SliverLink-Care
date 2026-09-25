package com.silverlink.smsrelay.worker

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.silverlink.smsrelay.data.local.RelayPreferences
import com.silverlink.smsrelay.data.network.ApiClientFactory
import com.silverlink.smsrelay.data.network.RelayApiService
import com.silverlink.smsrelay.data.network.isRelayDeviceRevoked
import com.silverlink.smsrelay.service.RelayServiceLauncher

class HeartbeatWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    private val relayPreferences = RelayPreferences(appContext)
    private val apiService = RelayApiService(ApiClientFactory.create())

    override suspend fun doWork(): Result {
        val config = relayPreferences.readConfig()
        if (!relayPreferences.isDeviceActive() || config.serverBaseUrl.isBlank()) {
            Log.w(TAG, "HeartbeatWorker skipped: relay device is not active")
            return Result.success()
        }

        val result = apiService.sendHeartbeat(config.serverBaseUrl, config.deviceId, config.deviceSecret)
        result.onSuccess {
            relayPreferences.saveLastHeartbeat(System.currentTimeMillis())
            Log.i(TAG, "HeartbeatWorker success for device=${config.deviceId}")
        }.onFailure {
            if (it.isRelayDeviceRevoked()) {
                RelayServiceLauncher.markDeviceRevoked(applicationContext)
                Log.w(TAG, "HeartbeatWorker stopped because device was revoked: device=${config.deviceId}")
                return Result.success()
            }
            Log.w(TAG, "HeartbeatWorker failed for device=${config.deviceId}: ${it.message}")
        }
        return if (result.isSuccess) Result.success() else Result.retry()
    }

    companion object {
        private const val TAG = "SmsRelayHeartbeat"
    }
}
