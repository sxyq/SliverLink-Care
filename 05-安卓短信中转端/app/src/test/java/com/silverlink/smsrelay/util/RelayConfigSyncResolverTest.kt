package com.silverlink.smsrelay.util

import com.silverlink.smsrelay.data.local.RelayConfig
import org.junit.Assert.assertEquals
import org.junit.Test

class RelayConfigSyncResolverTest {

    @Test
    fun `keeps local values when remote returns placeholders`() {
        val local = RelayConfig(
            serverBaseUrl = "http://sxyq27.online/silverlink-api",
            deviceId = "relay-android-01",
            deviceSecret = "secret-001",
            receiverPhone = "15223493755",
            messagePrefix = "SL",
        )
        val remote = RemoteRelayConfig(
            deviceId = "relay-android-01",
            serverBaseUrl = "https://api.silverlink.example.com",
            receiverPhone = "13800001111",
            messagePrefix = "SL",
        )

        val merged = RelayConfigSyncResolver.merge(local, remote)

        assertEquals(local.serverBaseUrl, merged.serverBaseUrl)
        assertEquals(local.receiverPhone, merged.receiverPhone)
        assertEquals(local.deviceId, merged.deviceId)
        assertEquals(local.deviceSecret, merged.deviceSecret)
        assertEquals(local.messagePrefix, merged.messagePrefix)
    }

    @Test
    fun `applies remote values when they are usable`() {
        val local = RelayConfig(
            serverBaseUrl = "http://localhost:8080",
            deviceId = "relay-android-01",
            deviceSecret = "secret-001",
            receiverPhone = "15223493755",
            messagePrefix = "SL",
        )
        val remote = RemoteRelayConfig(
            deviceId = "relay-android-02",
            serverBaseUrl = "http://sxyq27.online/silverlink-api",
            receiverPhone = "19912345678",
            messagePrefix = "CODE",
        )

        val merged = RelayConfigSyncResolver.merge(local, remote)

        assertEquals("https://sxyq27.online/silverlink-api", merged.serverBaseUrl)
        assertEquals("relay-android-02", merged.deviceId)
        assertEquals("secret-001", merged.deviceSecret)
        assertEquals("19912345678", merged.receiverPhone)
        assertEquals("CODE", merged.messagePrefix)
    }
}
