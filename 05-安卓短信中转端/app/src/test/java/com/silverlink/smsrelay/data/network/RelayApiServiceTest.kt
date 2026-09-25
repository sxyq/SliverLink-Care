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
    fun submitsEnrollmentAndReadsStatusUsingApplicantToken() {
        server.enqueue(MockResponse().setResponseCode(200).setBody(
            """{"code":200,"data":{"requestId":"request-1","status":"PENDING"}}""",
        ))
        server.enqueue(MockResponse().setResponseCode(200).setBody(
            """{"code":200,"data":{"requestId":"request-1","status":"APPROVED","deviceId":"relay-1"}}""",
        ))

        val submitted = service.submitEnrollmentRequest(
            baseUrl = server.url("/").toString(),
            requestId = "request-1",
            requestToken = "request-token",
            deviceSecret = "device-secret",
            deviceName = "值守手机",
            receiverPhone = "13800000000",
            messagePrefix = "SL",
        )
        assertTrue(submitted.isSuccess)
        assertEquals("PENDING", submitted.getOrThrow().status)
        val submitRequest = server.takeRequest()
        assertEquals("POST", submitRequest.method)
        assertEquals("/api/sms-relay/enrollment-requests", submitRequest.path)
        assertEquals("request-token", submitRequest.getHeader("X-Relay-Enrollment-Token"))
        assertTrue(submitRequest.body.readUtf8().contains("\"deviceSecret\":\"device-secret\""))

        val status = service.fetchEnrollmentStatus(server.url("/").toString(), "request-1", "request-token")
        assertTrue(status.isSuccess)
        assertEquals("relay-1", status.getOrThrow().deviceId)
        val statusRequest = server.takeRequest()
        assertEquals("GET", statusRequest.method)
        assertEquals("/api/sms-relay/enrollment-requests/request-1", statusRequest.path)
        assertEquals("request-token", statusRequest.getHeader("X-Relay-Enrollment-Token"))
    }

    @Test
    fun blocksPublicHttpRelayUrls() {
        assertTrue(service.sendHeartbeat("http://example.com", "device-1", "secret-1").isFailure)
        assertEquals(0, server.requestCount)
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

    @Test
    fun exposesForbiddenResponsesAsRevokedDeviceFailures() {
        server.enqueue(MockResponse().setResponseCode(403))

        val error = service.sendHeartbeat(server.url("/").toString(), "device-1", "secret")
            .exceptionOrNull()

        assertTrue(error is RelayHttpException)
        assertEquals(403, (error as RelayHttpException).statusCode)
        assertTrue(error.isRelayDeviceRevoked())
    }
}
