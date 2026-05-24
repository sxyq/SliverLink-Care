package com.silverlink.smsrelay.data.model

data class ParsedVerificationMessage(
    val matched: Boolean,
    val prefix: String,
    val code: String?,
    val rawBody: String,
)
