package com.silverlink.smsrelay.data.model

data class InboundSmsPayload(
    val deviceId: String,
    val receiverPhone: String,
    val senderPhone: String,
    val messageBody: String,
    val receivedAt: Long,
    val messagePrefix: String,
)
