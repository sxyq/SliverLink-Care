package com.silverlink.smsrelay.util

import org.junit.Assert.assertEquals
import org.junit.Test

class RelayServerUrlNormalizerTest {

    @Test
    fun keepsExternalHttpUrlsUnchanged() {
        assertEquals(
            "http://sxyq27.online/silverlink-api",
            RelayServerUrlNormalizer.normalize("http://sxyq27.online/silverlink-api"),
        )
    }

    @Test
    fun keepsLocalDevelopmentUrlsOnHttp() {
        assertEquals(
            "http://192.168.1.10:8080/api",
            RelayServerUrlNormalizer.normalize("http://192.168.1.10:8080/api"),
        )
        assertEquals(
            "http://localhost:8080",
            RelayServerUrlNormalizer.normalize("http://localhost:8080"),
        )
    }

    @Test
    fun keepsHttpsAndMalformedValuesAsIs() {
        assertEquals(
            "http://sxyq27.online/silverlink-api",
            RelayServerUrlNormalizer.normalize("https://sxyq27.online/silverlink-api"),
        )
        assertEquals(
            "http://sxyq27.online/silverlink-api",
            RelayServerUrlNormalizer.normalize("sxyq27.online/silverlink-api"),
        )
        assertEquals(
            "https://example.com/api",
            RelayServerUrlNormalizer.normalize("https://example.com/api"),
        )
        assertEquals(
            "https://not-a-url",
            RelayServerUrlNormalizer.normalize("not-a-url"),
        )
    }
}
