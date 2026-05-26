package com.silverlink.smsrelay.data.network

import org.junit.Assert.assertNotNull
import org.junit.Test

class ApiClientFactoryTest {

    @Test
    fun createReturnsConfiguredClient() {
        val client = ApiClientFactory.create()
        assertNotNull(client)
        assertEquals(10_000, client.connectTimeoutMillis)
        assertEquals(10_000, client.readTimeoutMillis)
        assertEquals(10_000, client.writeTimeoutMillis)
    }

    private fun assertEquals(expected: Int, actual: Int) {
        org.junit.Assert.assertEquals(expected.toLong(), actual.toLong())
    }
}
