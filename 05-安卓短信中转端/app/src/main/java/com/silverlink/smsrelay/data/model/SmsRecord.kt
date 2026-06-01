package com.silverlink.smsrelay.data.model

data class SmsRecord(
    val id: String,
    val senderPhone: String,
    val messageBody: String,
    val receivedAt: Long,
    val status: UploadStatus,
    val uploadedAt: Long? = null,
    val failReason: String? = null,
    val advisoryMessage: String? = null,
)
