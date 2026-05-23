package com.silverlink.smsrelay.util

import com.silverlink.smsrelay.data.model.ParsedVerificationMessage

object SmsParser {

    fun parse(body: String, prefix: String): ParsedVerificationMessage {
        val trimmed = body.trim()
        val expectedPrefix = prefix.trim().ifBlank { "SL" }
        val regex = Regex("^${Regex.escape(expectedPrefix)}\\s+(\\d{4,8})$")
        val match = regex.find(trimmed)
        return ParsedVerificationMessage(
            matched = match != null,
            prefix = expectedPrefix,
            code = match?.groupValues?.getOrNull(1),
            rawBody = body,
        )
    }
}
