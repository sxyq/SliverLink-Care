package com.silverlink.smsrelay.util

import java.net.URI

object RelayServerUrlNormalizer {

    fun normalize(value: String): String {
        val trimmed = value.trim()
        if (trimmed.isBlank()) return ""

        val uri = runCatching { URI(trimmed) }.getOrNull() ?: return trimmed
        val scheme = uri.scheme?.lowercase() ?: return trimmed
        val host = uri.host?.lowercase() ?: return trimmed

        if (scheme != "http") return trimmed
        if (isLocalHost(host) || isPrivateIpv4(host)) return trimmed

        return URI(
            "https",
            uri.userInfo,
            uri.host,
            uri.port,
            uri.path,
            uri.query,
            uri.fragment,
        ).toString()
    }

    private fun isLocalHost(host: String): Boolean {
        return host == "localhost" || host == "127.0.0.1" || host == "::1" || host.endsWith(".local")
    }

    private fun isPrivateIpv4(host: String): Boolean {
        val parts = host.split('.')
        if (parts.size != 4) return false
        val octets = parts.map { it.toIntOrNull() ?: return false }

        return when {
            octets[0] == 10 -> true
            octets[0] == 192 && octets[1] == 168 -> true
            octets[0] == 172 && octets[1] in 16..31 -> true
            else -> false
        }
    }
}
