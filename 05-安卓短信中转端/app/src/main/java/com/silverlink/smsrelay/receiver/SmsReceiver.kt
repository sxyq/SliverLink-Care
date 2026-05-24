package com.silverlink.smsrelay.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import androidx.work.BackoffPolicy
import androidx.work.Data
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.silverlink.smsrelay.data.local.RelayPreferences
import com.silverlink.smsrelay.service.RelayServiceLauncher
import com.silverlink.smsrelay.util.SmsParser
import com.silverlink.smsrelay.worker.InboundSmsUploadWorker

class SmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages.isEmpty()) return

        val body = messages.joinToString(separator = "") { it.messageBody.orEmpty() }
        val sender = messages.firstOrNull()?.originatingAddress.orEmpty()
        val receivedAt = messages.firstOrNull()?.timestampMillis ?: System.currentTimeMillis()
        val config = RelayPreferences(context).readConfig()
        val parsed = SmsParser.parse(body, config.messagePrefix)

        if (!parsed.matched) {
            return
        }

        runCatching {
            RelayServiceLauncher.uploadSms(context, sender, parsed.rawBody, receivedAt)
        }.onFailure {
            val inputData = Data.Builder()
                .putString(InboundSmsUploadWorker.KEY_SENDER_PHONE, sender)
                .putString(InboundSmsUploadWorker.KEY_MESSAGE_BODY, parsed.rawBody)
                .putLong(InboundSmsUploadWorker.KEY_RECEIVED_AT, receivedAt)
                .build()

            val work = OneTimeWorkRequestBuilder<InboundSmsUploadWorker>()
                .setInputData(inputData)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, java.util.concurrent.TimeUnit.SECONDS)
                .build()

            WorkManager.getInstance(context).enqueue(work)
        }
    }
}
