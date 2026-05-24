package com.silverlink.smsrelay.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.silverlink.smsrelay.repository.SmsRelayRepository

class InboundSmsUploadWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    private val repository = SmsRelayRepository(appContext)

    override suspend fun doWork(): Result {
        val senderPhone = inputData.getString(KEY_SENDER_PHONE).orEmpty()
        val messageBody = inputData.getString(KEY_MESSAGE_BODY).orEmpty()
        val receivedAt = inputData.getLong(KEY_RECEIVED_AT, System.currentTimeMillis())

        if (senderPhone.isBlank() || messageBody.isBlank()) {
            return Result.failure()
        }

        return repository.uploadInboundSms(senderPhone, messageBody, receivedAt)
            .fold(
                onSuccess = { Result.success() },
                onFailure = { Result.retry() },
            )
    }

    companion object {
        const val KEY_SENDER_PHONE = "sender_phone"
        const val KEY_MESSAGE_BODY = "message_body"
        const val KEY_RECEIVED_AT = "received_at"
    }
}
