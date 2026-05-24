package com.silverlink.smsrelay.data.network

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test

class RelayRequestSignerTest {

    @Test
    fun `creates stable signature for same canonical input`() {
        val first = RelayRequestSigner.sign(
            method = "POST",
            path = "/api/sms-relay/inbound",
            payload = "relay-01\n13800001111\n13900002222\nSL 123456\n1710000000\nSL",
            secret = "secret-001",
            epochSeconds = 1710000000,
            nonce = "nonce-1",
        )
        val second = RelayRequestSigner.sign(
            method = "POST",
            path = "/api/sms-relay/inbound",
            payload = "relay-01\n13800001111\n13900002222\nSL 123456\n1710000000\nSL",
            secret = "secret-001",
            epochSeconds = 1710000000,
            nonce = "nonce-1",
        )

        assertEquals(first.signature, second.signature)
        assertEquals("1710000000", first.timestamp)
        assertEquals("nonce-1", first.nonce)
    }

    @Test
    fun `changes signature when payload changes`() {
        val first = RelayRequestSigner.sign(
            method = "POST",
            path = "/api/sms-relay/inbound",
            payload = "relay-01\n13800001111\n13900002222\nSL 123456\n1710000000\nSL",
            secret = "secret-001",
            epochSeconds = 1710000000,
            nonce = "nonce-1",
        )
        val second = RelayRequestSigner.sign(
            method = "POST",
            path = "/api/sms-relay/inbound",
            payload = "relay-01\n13800001111\n13900002222\nSL 654321\n1710000000\nSL",
            secret = "secret-001",
            epochSeconds = 1710000000,
            nonce = "nonce-1",
        )

        assertNotEquals(first.signature, second.signature)
    }
}
