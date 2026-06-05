package com.silverlink.smsrelay.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.database.ContentObserver
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.provider.Telephony
import android.util.Log
import androidx.core.app.NotificationCompat
import com.silverlink.smsrelay.MainActivity
import com.silverlink.smsrelay.R
import com.silverlink.smsrelay.data.local.RelayPreferences
import com.silverlink.smsrelay.data.network.ApiClientFactory
import com.silverlink.smsrelay.data.network.RelayApiService
import com.silverlink.smsrelay.repository.SmsRelayRepository
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.util.concurrent.TimeUnit

class RelayForegroundService : Service() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val relayPreferences by lazy { preferencesFactory?.invoke(applicationContext) ?: RelayPreferences(applicationContext) }
    private val relayRepository by lazy { repositoryFactory?.invoke(applicationContext) ?: SmsRelayRepository(applicationContext) }
    private val relayApiService by lazy { apiServiceFactory?.invoke() ?: RelayApiService(ApiClientFactory.create()) }
    private val mediaKeepAliveController by lazy { MediaKeepAliveController(applicationContext) }

    private var heartbeatJob: Job? = null
    private val inboxSyncMutex = Mutex()
    private var inboxObserver: ContentObserver? = null
    private var lastInboxSyncTriggerAt: Long = 0L

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "RelayForegroundService.onCreate")
        ensureNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification(getString(R.string.relay_service_running)))
        relayPreferences.saveServiceState(true, getString(R.string.relay_service_running))
        syncMediaKeepAliveMode()
        registerInboxObserver()
        HeartbeatAlarmScheduler.scheduleNext(this)
        ensureHeartbeatLoop()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.i(TAG, "RelayForegroundService.onStartCommand action=${intent?.action} startId=$startId")
        when (intent?.action) {
            RelayServiceLauncher.ACTION_UPLOAD_SMS -> handleSmsUpload(
                senderPhone = intent.getStringExtra(RelayServiceLauncher.EXTRA_SENDER_PHONE).orEmpty(),
                messageBody = intent.getStringExtra(RelayServiceLauncher.EXTRA_MESSAGE_BODY).orEmpty(),
                receivedAt = intent.getLongExtra(RelayServiceLauncher.EXTRA_RECEIVED_AT, System.currentTimeMillis()),
            )

            RelayServiceLauncher.ACTION_TRIGGER_HEARTBEAT -> triggerHeartbeat()
            RelayServiceLauncher.ACTION_SET_MEDIA_KEEPALIVE -> {
                relayPreferences.saveMediaKeepAliveEnabled(
                    intent.getBooleanExtra(RelayServiceLauncher.EXTRA_MEDIA_KEEPALIVE_ENABLED, false),
                )
                syncMediaKeepAliveMode()
                updateNotification(getString(R.string.relay_service_running))
            }
            RelayServiceLauncher.ACTION_START,
            null -> {
                syncMediaKeepAliveMode()
                syncInboxFallback("service-start")
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
        heartbeatJob = serviceScope.launch(ioDispatcher ?: Dispatchers.IO) {
            while (isActive) {
                // Doze can defer coroutine timers for a long time, so this loop is paired
                // with an allow-while-idle alarm that nudges the same heartbeat path awake.
                withWakeLock("heartbeat-loop", TimeUnit.SECONDS.toMillis(30)) {
                    Log.d(TAG, "Heartbeat loop tick")
                    syncInboxFallbackLocked("heartbeat-loop")
                    sendHeartbeat()
                }
                delay(TimeUnit.MINUTES.toMillis(15))
            }
        }
    }

    private fun triggerHeartbeat() {
        serviceScope.launch(ioDispatcher ?: Dispatchers.IO) {
            withWakeLock("heartbeat", TimeUnit.SECONDS.toMillis(30)) {
                Log.i(TAG, "Triggering foreground heartbeat")
                syncInboxFallbackLocked("trigger-heartbeat")
                sendHeartbeat()
            }
        }
    }

    private suspend fun sendHeartbeat() {
        val config = relayPreferences.readConfig()
        if (config.serverBaseUrl.isBlank() || config.deviceId.isBlank() || config.deviceSecret.isBlank()) {
            updateNotification(getString(R.string.relay_service_waiting_config))
            relayPreferences.saveServiceState(true, getString(R.string.relay_service_waiting_config))
            HeartbeatAlarmScheduler.scheduleNext(this)
            return
        }

        try {
            val result = relayApiService.sendHeartbeat(config.serverBaseUrl, config.deviceId, config.deviceSecret)
            result.onSuccess {
                relayPreferences.saveLastHeartbeat(System.currentTimeMillis())
                updateNotification(getString(R.string.relay_service_online))
                relayPreferences.saveServiceState(true, getString(R.string.relay_service_online))
                Log.i(TAG, "Foreground heartbeat success for device=${config.deviceId}")
            }.onFailure {
                updateNotification(getString(R.string.relay_service_retrying))
                relayPreferences.saveServiceState(true, getString(R.string.relay_service_retrying))
                Log.w(TAG, "Foreground heartbeat failed for device=${config.deviceId}: ${it.message}")
            }
        } finally {
            HeartbeatAlarmScheduler.scheduleNext(this)
        }
    }

    private fun handleSmsUpload(senderPhone: String, messageBody: String, receivedAt: Long) {
        if (senderPhone.isBlank() || messageBody.isBlank()) return
        serviceScope.launch(ioDispatcher ?: Dispatchers.IO) {
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

    private fun syncInboxFallback(reason: String) {
        serviceScope.launch(ioDispatcher ?: Dispatchers.IO) {
            withWakeLock("inbox-sync", TimeUnit.SECONDS.toMillis(60)) {
                syncInboxFallbackLocked(reason)
            }
        }
    }

    private suspend fun syncInboxFallbackLocked(reason: String) {
        inboxSyncMutex.withLock {
            relayRepository.syncMissedVerificationSmsFromInbox()
                .onSuccess { count ->
                    if (count > 0) {
                        Log.i(TAG, "Inbox fallback synced $count verification SMS messages; reason=$reason")
                    }
                }.onFailure {
                    Log.w(TAG, "Inbox fallback sync failed; reason=$reason error=${it.message}")
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
            .setContentText(
                if (relayPreferences.isMediaKeepAliveEnabled()) {
                    getString(R.string.relay_service_media_keepalive, contentText)
                } else {
                    contentText
                },
            )
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
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
        Log.w(TAG, "RelayForegroundService.onDestroy")
        inboxObserver?.let { contentResolver.unregisterContentObserver(it) }
        inboxObserver = null
        mediaKeepAliveController.stop()
        relayPreferences.saveServiceState(false, getString(R.string.relay_service_stopped))
        serviceScope.cancel()
    }

    private fun syncMediaKeepAliveMode() {
        if (relayPreferences.isMediaKeepAliveEnabled()) {
            mediaKeepAliveController.start()
        } else {
            mediaKeepAliveController.stop()
        }
    }

    private fun registerInboxObserver() {
        if (inboxObserver != null) return
        inboxObserver = object : ContentObserver(Handler(Looper.getMainLooper())) {
            override fun onChange(selfChange: Boolean) {
                onChange(selfChange, null)
            }

            override fun onChange(selfChange: Boolean, uri: android.net.Uri?) {
                if (shouldThrottleInboxSync()) {
                    return
                }
                Log.i(TAG, "SMS inbox content changed; scheduling fallback sync uri=$uri")
                syncInboxFallback("sms-inbox-change")
            }
        }
        contentResolver.registerContentObserver(Telephony.Sms.Inbox.CONTENT_URI, true, inboxObserver!!)
    }

    private fun shouldThrottleInboxSync(): Boolean {
        val now = System.currentTimeMillis()
        if (now - lastInboxSyncTriggerAt < TimeUnit.SECONDS.toMillis(2)) {
            return true
        }
        lastInboxSyncTriggerAt = now
        return false
    }

    override fun onBind(intent: Intent?) = null

    companion object {
        private const val TAG = "SmsRelayHeartbeat"
        private const val NOTIFICATION_ID = 1001
        private const val NOTIFICATION_CHANNEL_ID = "relay_foreground"

        internal var preferencesFactory: ((android.content.Context) -> RelayPreferences)? = null
        internal var repositoryFactory: ((android.content.Context) -> SmsRelayRepository)? = null
        internal var apiServiceFactory: (() -> RelayApiService)? = null
        internal var ioDispatcher: CoroutineDispatcher? = null

        internal fun resetTestHooks() {
            preferencesFactory = null
            repositoryFactory = null
            apiServiceFactory = null
            ioDispatcher = null
        }
    }
}
