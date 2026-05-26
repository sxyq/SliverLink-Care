package com.silverlink.smsrelay.data.network

import com.silverlink.smsrelay.data.model.InboundSmsPayload
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class RelayApiServiceTest {

    private lateinit var server: MockWebServer
    private lateinit var service: RelayApiService

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        service = RelayApiService(OkHttpClient())
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun uploadInboundSmsBuildsSignedPostRequest() {
        server.enqueue(MockResponse().setResponseCode(200).setBody("""{"code":200}"""))

        val result = service.uploadInboundSms(
            baseUrl = server.url("/").toString(),
            deviceSecret = "secret-1",
            payload = InboundSmsPayload(
                deviceId = "device-1",
                receiverPhone = "13800000000",
                senderPhone = "13900000000",
                messageBody = "SL 123456",
                receivedAt = 1770000000000L,
                messagePrefix = "SL",
            ),
        )

        assertTrue(result.isSuccess)
        val request = server.takeRequest()
        assertEquals("/api/sms-relay/inbound", request.path)
        assertEquals("POST", request.method)
        assertEquals("secret-1", request.getHeader("X-Relay-Device-Secret"))
        assertFalse(request.getHeader("X-Relay-Signature").isNullOrBlank())
        assertTrue(request.body.readUtf8().contains("\"senderPhone\":\"13900000000\""))
    }

    @Test
    fun heartbeatAndConfigRequestsUseExpectedPaths() {
        server.enqueue(MockResponse().setResponseCode(200).setBody("""{"code":200}"""))
        server.enqueue(MockResponse().setResponseCode(200).setBody("""{"data":{"deviceId":"device-1","messagePrefix":"SL"}}"""))

        assertTrue(service.sendHeartbeat(server.url("/").toString(), "device-1", "secret-1").isSuccess)
        assertEquals("/api/sms-relay/heartbeat", server.takeRequest().path)

        val config = service.fetchDeviceConfig(server.url("/").toString(), "device-1", "secret-1")
        assertTrue(config.isSuccess)
        assertEquals("device-1", config.getOrThrow().getString("deviceId"))
        assertEquals("/api/sms-relay/devices/device-1/config", server.takeRequest().path)
    }

    @Test
    fun returnsFailureForBlankBaseUrlAndUnsuccessfulResponses() {
        assertTrue(service.uploadInboundSms("", "secret", InboundSmsPayload("", "", "", "", 0, "SL")).isFailure)
        assertTrue(service.sendHeartbeat("", "device-1", "secret").isFailure)
        assertTrue(service.fetchDeviceConfig("", "device-1", "secret").isFailure)

        server.enqueue(MockResponse().setResponseCode(500))
        val result = service.sendHeartbeat(server.url("/").toString(), "device-1", "secret")
        assertTrue(result.isFailure)
    }
}
