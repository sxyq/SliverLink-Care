package com.silverlink.smsrelay.util

import java.net.URI

object RelayServerUrlNormalizer {

    private const val LEGACY_RELAY_HTTP_PREFIX = "http://sxyq27.online/silverlink-api"
    private const val LEGACY_RELAY_HTTPS_PREFIX = "https://sxyq27.online/silverlink-api"
    private const val LEGACY_RELAY_BARE_PREFIX = "sxyq27.online/silverlink-api"

    fun normalize(value: String): String {
        val trimmed = value.trim()
        if (trimmed.isBlank()) return ""
        if (trimmed.startsWith(LEGACY_RELAY_HTTPS_PREFIX, ignoreCase = true)) {
            return LEGACY_RELAY_HTTP_PREFIX + trimmed.removePrefix(LEGACY_RELAY_HTTPS_PREFIX)
        }
        if (trimmed.startsWith(LEGACY_RELAY_BARE_PREFIX, ignoreCase = true)) {
            return LEGACY_RELAY_HTTP_PREFIX + trimmed.removePrefix(LEGACY_RELAY_BARE_PREFIX)
        }

        val candidate = if (trimmed.contains("://")) trimmed else "https://$trimmed"
        return runCatching { URI(candidate) }
            .map { it.toString() }
            .getOrElse { candidate }
    }
}
