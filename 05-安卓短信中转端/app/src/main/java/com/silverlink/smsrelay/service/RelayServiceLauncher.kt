package com.silverlink.smsrelay.service

import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import com.silverlink.smsrelay.R
import com.silverlink.smsrelay.data.local.RelayPreferences

object RelayServiceLauncher {

    const val ACTION_START = "com.silverlink.smsrelay.action.START"
    const val ACTION_UPLOAD_SMS = "com.silverlink.smsrelay.action.UPLOAD_SMS"
    const val ACTION_TRIGGER_HEARTBEAT = "com.silverlink.smsrelay.action.TRIGGER_HEARTBEAT"

    const val EXTRA_IMMEDIATE_HEARTBEAT = "extra_immediate_heartbeat"
    const val EXTRA_SENDER_PHONE = "extra_sender_phone"
    const val EXTRA_MESSAGE_BODY = "extra_message_body"
    const val EXTRA_RECEIVED_AT = "extra_received_at"

    fun start(context: Context, immediateHeartbeat: Boolean = false) {
        RelayPreferences(context).saveServiceState(true, context.getString(R.string.relay_service_running))
        val intent = Intent(context, RelayForegroundService::class.java)
            .setAction(ACTION_START)
            .putExtra(EXTRA_IMMEDIATE_HEARTBEAT, immediateHeartbeat)
        ContextCompat.startForegroundService(context, intent)
    }

    fun triggerHeartbeat(context: Context) {
        RelayPreferences(context).saveServiceState(true, context.getString(R.string.relay_service_running))
        val intent = Intent(context, RelayForegroundService::class.java)
            .setAction(ACTION_TRIGGER_HEARTBEAT)
        ContextCompat.startForegroundService(context, intent)
    }

    fun uploadSms(context: Context, senderPhone: String, messageBody: String, receivedAt: Long) {
        RelayPreferences(context).saveServiceState(true, context.getString(R.string.relay_service_uploading))
        val intent = Intent(context, RelayForegroundService::class.java)
            .setAction(ACTION_UPLOAD_SMS)
            .putExtra(EXTRA_SENDER_PHONE, senderPhone)
            .putExtra(EXTRA_MESSAGE_BODY, messageBody)
            .putExtra(EXTRA_RECEIVED_AT, receivedAt)
        ContextCompat.startForegroundService(context, intent)
    }
}
