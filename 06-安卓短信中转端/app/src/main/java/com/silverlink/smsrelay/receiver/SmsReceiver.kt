package com.silverlink.smsrelay.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import androidx.work.Data
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.silverlink.smsrelay.worker.InboundSmsUploadWorker

class SmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages.isEmpty()) return

        val body = messages.joinToString(separator = "") { it.messageBody.orEmpty() }
        val sender = messages.firstOrNull()?.originatingAddress.orEmpty()
        val receivedAt = messages.firstOrNull()?.timestampMillis ?: System.currentTimeMillis()

        val inputData = Data.Builder()
            .putString(InboundSmsUploadWorker.KEY_SENDER_PHONE, sender)
            .putString(InboundSmsUploadWorker.KEY_MESSAGE_BODY, body)
            .putLong(InboundSmsUploadWorker.KEY_RECEIVED_AT, receivedAt)
            .build()

        val work = OneTimeWorkRequestBuilder<InboundSmsUploadWorker>()
            .setInputData(inputData)
            .build()

        WorkManager.getInstance(context).enqueue(work)
    }
}
