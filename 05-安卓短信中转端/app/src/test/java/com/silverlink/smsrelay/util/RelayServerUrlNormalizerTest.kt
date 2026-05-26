package com.silverlink.smsrelay.util

import org.junit.Assert.assertEquals
import org.junit.Test

class RelayServerUrlNormalizerTest {

    @Test
    fun upgradesExternalHttpUrlsToHttps() {
        assertEquals(
            "https://sxyq27.online/silverlink-api",
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
            "https://sxyq27.online/silverlink-api",
            RelayServerUrlNormalizer.normalize("https://sxyq27.online/silverlink-api"),
        )
        assertEquals(
            "not-a-url",
            RelayServerUrlNormalizer.normalize("not-a-url"),
        )
    }
}
