package com.silverlink.smsrelay.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.PowerManager
import android.util.Log
import com.silverlink.smsrelay.R
import com.silverlink.smsrelay.data.local.RelayPreferences
import com.silverlink.smsrelay.data.network.ApiClientFactory
import com.silverlink.smsrelay.data.network.RelayApiService
import com.silverlink.smsrelay.service.HeartbeatAlarmScheduler
import com.silverlink.smsrelay.service.RelayServiceLauncher
import com.silverlink.smsrelay.worker.HeartbeatScheduler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.concurrent.TimeUnit

class HeartbeatAlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != HeartbeatAlarmScheduler.ACTION_HEARTBEAT_WAKEUP) return
        Log.i(TAG, "Alarm received; action=${intent.action}")
        heartbeatOverride?.let {
            it(context)
            return
        }

        val appContext = context.applicationContext
        RelayServiceLauncher.ensureRunning(appContext)
        HeartbeatScheduler.schedule(appContext, enqueueImmediate = true)
        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val success = performHeartbeat(appContext)
                if (!success) {
                    Log.w(TAG, "Alarm heartbeat failed; triggering foreground retry path")
                    RelayServiceLauncher.triggerHeartbeat(appContext)
                }
            } finally {
                pendingResult.finish()
            }
        }
    }

    private suspend fun performHeartbeat(context: Context): Boolean {
        val preferences = RelayPreferences(context)
        val config = preferences.readConfig()

        if (config.serverBaseUrl.isBlank() || config.deviceId.isBlank() || config.deviceSecret.isBlank()) {
            preferences.saveServiceState(true, context.getString(R.string.relay_service_waiting_config))
            HeartbeatAlarmScheduler.scheduleNext(context)
            Log.w(TAG, "Alarm heartbeat skipped: missing relay config")
            return false
        }

        var success = false
        withWakeLock(context, "heartbeat-alarm", TimeUnit.SECONDS.toMillis(30)) {
            val apiService = RelayApiService(ApiClientFactory.create())
            val result = apiService.sendHeartbeat(config.serverBaseUrl, config.deviceId, config.deviceSecret)
            result.onSuccess {
                success = true
                preferences.saveLastHeartbeat(System.currentTimeMillis())
                preferences.saveServiceState(true, context.getString(R.string.relay_service_online))
                Log.i(TAG, "Alarm heartbeat success for device=${config.deviceId}")
            }.onFailure {
                preferences.saveServiceState(true, context.getString(R.string.relay_service_retrying))
                Log.w(TAG, "Alarm heartbeat failed for device=${config.deviceId}: ${it.message}")
            }
        }

        HeartbeatAlarmScheduler.scheduleNext(context)
        return success
    }

    private suspend fun <T> withWakeLock(context: Context, tagSuffix: String, timeoutMs: Long, block: suspend () -> T): T {
        val powerManager = context.getSystemService(PowerManager::class.java)
        val wakeLock = powerManager?.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "silverlink:smsrelay:$tagSuffix")
        wakeLock?.acquire(timeoutMs)
        return try {
            block()
        } finally {
            if (wakeLock?.isHeld == true) {
                wakeLock.release()
            }
        }
    }

    companion object {
        private const val TAG = "SmsRelayHeartbeat"
        internal var heartbeatOverride: ((Context) -> Unit)? = null

        internal fun resetTestHooks() {
            heartbeatOverride = null
        }
    }
}
