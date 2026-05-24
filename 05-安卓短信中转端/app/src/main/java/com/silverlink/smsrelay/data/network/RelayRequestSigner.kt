package com.silverlink.smsrelay.data.network

import java.util.UUID
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

data class RelaySignedRequest(
    val timestamp: String,
    val nonce: String,
    val signature: String,
)

object RelayRequestSigner {

    fun sign(
        method: String,
        path: String,
        payload: String,
        secret: String,
        epochSeconds: Long = System.currentTimeMillis() / 1000,
        nonce: String = UUID.randomUUID().toString(),
    ): RelaySignedRequest {
        val canonical = buildString {
            append(method.uppercase())
            append('\n')
            append(path)
            append('\n')
            append(epochSeconds)
            append('\n')
            append(nonce)
            append('\n')
            append(payload)
        }
        return RelaySignedRequest(
            timestamp = epochSeconds.toString(),
            nonce = nonce,
            signature = hmacSha256Hex(canonical, secret),
        )
    }

    private fun hmacSha256Hex(value: String, secret: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(secret.toByteArray(Charsets.UTF_8), "HmacSHA256"))
        return mac.doFinal(value.toByteArray(Charsets.UTF_8))
            .joinToString("") { byte -> "%02x".format(byte) }
    }
}
