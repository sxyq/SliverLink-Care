package com.silverlink.smsrelay.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import com.silverlink.smsrelay.MainActivity
import com.silverlink.smsrelay.R
import com.silverlink.smsrelay.data.local.RelayPreferences
import com.silverlink.smsrelay.data.network.ApiClientFactory
import com.silverlink.smsrelay.data.network.RelayApiService
import com.silverlink.smsrelay.repository.SmsRelayRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.util.concurrent.TimeUnit

class RelayForegroundService : Service() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val relayPreferences by lazy { RelayPreferences(applicationContext) }
    private val relayRepository by lazy { SmsRelayRepository(applicationContext) }
    private val relayApiService by lazy { RelayApiService(ApiClientFactory.create()) }

    private var heartbeatJob: Job? = null

    override fun onCreate() {
        super.onCreate()
        ensureNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification(getString(R.string.relay_service_running)))
        relayPreferences.saveServiceState(true, getString(R.string.relay_service_running))
        ensureHeartbeatLoop()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            RelayServiceLauncher.ACTION_UPLOAD_SMS -> handleSmsUpload(
                senderPhone = intent.getStringExtra(RelayServiceLauncher.EXTRA_SENDER_PHONE).orEmpty(),
                messageBody = intent.getStringExtra(RelayServiceLauncher.EXTRA_MESSAGE_BODY).orEmpty(),
                receivedAt = intent.getLongExtra(RelayServiceLauncher.EXTRA_RECEIVED_AT, System.currentTimeMillis()),
            )

            RelayServiceLauncher.ACTION_TRIGGER_HEARTBEAT -> triggerHeartbeat()
            RelayServiceLauncher.ACTION_START,
            null -> {
                if (intent?.getBooleanExtra(RelayServiceLauncher.EXTRA_IMMEDIATE_HEARTBEAT, false) == true) {
                    triggerHeartbeat()
                } else {
                    updateNotification(getString(R.string.relay_service_running))
                    relayPreferences.saveServiceState(true, getString(R.string.relay_service_running))
                }
            }
        }
        return START_STICKY
    }

    private fun ensureHeartbeatLoop() {
        if (heartbeatJob?.isActive == true) return
        heartbeatJob = serviceScope.launch(Dispatchers.IO) {
            while (isActive) {
                withWakeLock("heartbeat-loop", TimeUnit.SECONDS.toMillis(30)) {
                    sendHeartbeat()
                }
                delay(TimeUnit.MINUTES.toMillis(15))
            }
        }
    }

    private fun triggerHeartbeat() {
        serviceScope.launch(Dispatchers.IO) {
            withWakeLock("heartbeat", TimeUnit.SECONDS.toMillis(30)) {
                sendHeartbeat()
            }
        }
    }

    private suspend fun sendHeartbeat() {
        val config = relayPreferences.readConfig()
        if (config.serverBaseUrl.isBlank() || config.deviceId.isBlank() || config.deviceSecret.isBlank()) {
            updateNotification(getString(R.string.relay_service_waiting_config))
            relayPreferences.saveServiceState(true, getString(R.string.relay_service_waiting_config))
            return
        }

        val result = relayApiService.sendHeartbeat(config.serverBaseUrl, config.deviceId, config.deviceSecret)
        result.onSuccess {
            relayPreferences.saveLastHeartbeat(System.currentTimeMillis())
            updateNotification(getString(R.string.relay_service_online))
            relayPreferences.saveServiceState(true, getString(R.string.relay_service_online))
        }.onFailure {
            updateNotification(getString(R.string.relay_service_retrying))
            relayPreferences.saveServiceState(true, getString(R.string.relay_service_retrying))
        }
    }

    private fun handleSmsUpload(senderPhone: String, messageBody: String, receivedAt: Long) {
        if (senderPhone.isBlank() || messageBody.isBlank()) return
        serviceScope.launch(Dispatchers.IO) {
            withWakeLock("sms-upload", TimeUnit.SECONDS.toMillis(60)) {
                updateNotification(getString(R.string.relay_service_uploading))
                relayPreferences.saveServiceState(true, getString(R.string.relay_service_uploading))
                val result = relayRepository.uploadInboundSms(senderPhone, messageBody, receivedAt)
                result.onSuccess {
                    updateNotification(getString(R.string.relay_service_online))
                    relayPreferences.saveServiceState(true, getString(R.string.relay_service_online))
                }.onFailure {
                    updateNotification(getString(R.string.relay_service_retrying))
                    relayPreferences.saveServiceState(true, getString(R.string.relay_service_retrying))
                }
            }
        }
    }

    private suspend fun <T> withWakeLock(tagSuffix: String, timeoutMs: Long, block: suspend () -> T): T {
        val powerManager = getSystemService(PowerManager::class.java)
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

    private fun buildNotification(contentText: String): Notification {
        val launchIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(getString(R.string.relay_service_title))
            .setContentText(contentText)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(pendingIntent)
            .build()
    }

    private fun updateNotification(contentText: String) {
        val notificationManager = getSystemService(NotificationManager::class.java)
        notificationManager.notify(NOTIFICATION_ID, buildNotification(contentText))
    }

    private fun ensureNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val notificationManager = getSystemService(NotificationManager::class.java)
        val channel = NotificationChannel(
            NOTIFICATION_CHANNEL_ID,
            getString(R.string.relay_service_channel_name),
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = getString(R.string.relay_service_channel_desc)
        }
        notificationManager.createNotificationChannel(channel)
    }

    override fun onDestroy() {
        super.onDestroy()
        relayPreferences.saveServiceState(false, getString(R.string.relay_service_stopped))
        serviceScope.cancel()
    }

    override fun onBind(intent: Intent?) = null

    companion object {
        private const val NOTIFICATION_ID = 1001
        private const val NOTIFICATION_CHANNEL_ID = "relay_foreground"
    }
}
