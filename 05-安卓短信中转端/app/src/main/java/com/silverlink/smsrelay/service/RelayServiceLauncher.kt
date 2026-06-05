package com.silverlink.smsrelay.service

import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import com.silverlink.smsrelay.R
import com.silverlink.smsrelay.data.local.RelayPreferences
import com.silverlink.smsrelay.worker.HeartbeatScheduler

object RelayServiceLauncher {

    const val ACTION_START = "com.silverlink.smsrelay.action.START"
    const val ACTION_UPLOAD_SMS = "com.silverlink.smsrelay.action.UPLOAD_SMS"
    const val ACTION_TRIGGER_HEARTBEAT = "com.silverlink.smsrelay.action.TRIGGER_HEARTBEAT"
    const val ACTION_SET_MEDIA_KEEPALIVE = "com.silverlink.smsrelay.action.SET_MEDIA_KEEPALIVE"

    const val EXTRA_IMMEDIATE_HEARTBEAT = "extra_immediate_heartbeat"
    const val EXTRA_SENDER_PHONE = "extra_sender_phone"
    const val EXTRA_MESSAGE_BODY = "extra_message_body"
    const val EXTRA_RECEIVED_AT = "extra_received_at"
    const val EXTRA_MEDIA_KEEPALIVE_ENABLED = "extra_media_keepalive_enabled"

    fun start(context: Context, immediateHeartbeat: Boolean = false) {
        RelayPreferences(context).saveServiceState(true, context.getString(R.string.relay_service_running))
        HeartbeatScheduler.schedule(context, enqueueImmediate = immediateHeartbeat)
        val intent = Intent(context, RelayForegroundService::class.java)
            .setAction(ACTION_START)
            .putExtra(EXTRA_IMMEDIATE_HEARTBEAT, immediateHeartbeat)
        ContextCompat.startForegroundService(context, intent)
    }

    fun ensureRunning(context: Context) {
        RelayPreferences(context).saveServiceState(true, context.getString(R.string.relay_service_running))
        val intent = Intent(context, RelayForegroundService::class.java)
            .setAction(ACTION_START)
            .putExtra(EXTRA_IMMEDIATE_HEARTBEAT, false)
        dispatchToService(context, intent)
    }

    fun triggerHeartbeat(context: Context) {
        RelayPreferences(context).saveServiceState(true, context.getString(R.string.relay_service_running))
        val intent = Intent(context, RelayForegroundService::class.java)
            .setAction(ACTION_TRIGGER_HEARTBEAT)
        dispatchToService(context, intent)
    }

    fun setMediaKeepAlive(context: Context, enabled: Boolean) {
        val intent = Intent(context, RelayForegroundService::class.java)
            .setAction(ACTION_SET_MEDIA_KEEPALIVE)
            .putExtra(EXTRA_MEDIA_KEEPALIVE_ENABLED, enabled)
        dispatchToService(context, intent)
    }

    fun uploadSms(context: Context, senderPhone: String, messageBody: String, receivedAt: Long) {
        RelayPreferences(context).saveServiceState(true, context.getString(R.string.relay_service_uploading))
        val intent = Intent(context, RelayForegroundService::class.java)
            .setAction(ACTION_UPLOAD_SMS)
            .putExtra(EXTRA_SENDER_PHONE, senderPhone)
            .putExtra(EXTRA_MESSAGE_BODY, messageBody)
            .putExtra(EXTRA_RECEIVED_AT, receivedAt)
        dispatchToService(context, intent)
    }

    private fun dispatchToService(context: Context, intent: Intent) {
        HeartbeatScheduler.schedule(context, enqueueImmediate = false)
        if (RelayPreferences(context).readServiceState().running) {
            try {
                context.startService(intent)
                return
            } catch (_: IllegalStateException) {
                // Fall through and try a foreground start if the process is gone.
            } catch (_: SecurityException) {
                // Fall through to the foreground path when background starts are blocked.
            }
        }
        ContextCompat.startForegroundService(context, intent)
    }
}
