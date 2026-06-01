package com.silverlink.smsrelay.repository

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import com.silverlink.smsrelay.data.local.RelayPreferences
import com.silverlink.smsrelay.data.model.UploadStatus
import com.silverlink.smsrelay.data.network.RelayApiService
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class SmsRelayRepositoryTest {

    private lateinit var context: Application
    private lateinit var server: MockWebServer
    private lateinit var preferences: RelayPreferences
    private lateinit var repository: SmsRelayRepository

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        context.getSharedPreferences("sms-relay", Application.MODE_PRIVATE).edit().clear().commit()
        context.getSharedPreferences("sms-relay-records", Application.MODE_PRIVATE).edit().clear().commit()

        server = MockWebServer()
        server.start()

        preferences = RelayPreferences(context)
        preferences.saveConfig(
            serverBaseUrl = server.url("/").toString(),
            deviceId = "device-1",
            deviceSecret = "secret-1",
            receiverPhone = "13800000000",
            messagePrefix = "SL",
        )
        repository = SmsRelayRepository(
            context = context,
            relayPreferences = preferences,
            apiService = RelayApiService(OkHttpClient()),
        )
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun uploadInboundSmsSuccessPersistsUploadedRecordAndStats() {
        server.enqueue(MockResponse().setResponseCode(200).setBody("""{"code":200}"""))

        val result = repository.uploadInboundSms("13900000000", "SL 123456", 1770000000000L)

        assertTrue(result.isSuccess)
        val records = repository.getAllRecords()
        assertEquals(1, records.size)
        assertEquals(UploadStatus.UPLOADED, records.first().status)
        assertEquals(1, repository.getRecordsByStatus(UploadStatus.UPLOADED).size)
        assertEquals(1, repository.getRecentRecords(1).size)
        assertEquals(1, repository.getTodayStats().received)
        assertEquals(1, repository.getTodayStats().uploaded)
        assertEquals(0, repository.getTodayStats().failed)
        assertEquals(0, repository.getTodayStats().pending)
        assertTrue(preferences.getLastSyncTime() != "从未")
    }

    @Test
    fun uploadInboundSmsFailurePersistsFailedRecordAndStats() {
        server.enqueue(MockResponse().setResponseCode(500))

        val result = repository.uploadInboundSms("13900000000", "SL 654321", 1770000000001L)

        assertTrue(result.isFailure)
        val records = repository.getAllRecords()
        assertEquals(1, records.size)
        assertEquals(UploadStatus.FAILED, records.first().status)
        assertTrue((records.first().failReason ?: "").contains("Relay upload failed"))
        assertEquals(1, repository.getRecordsByStatus(UploadStatus.FAILED).size)
        assertEquals(1, repository.getTodayStats().received)
        assertEquals(0, repository.getTodayStats().uploaded)
        assertEquals(1, repository.getTodayStats().failed)
        assertEquals(0, repository.getTodayStats().pending)
    }

    @Test
    fun buildInboxRecoveryAdvisoryReturnsExpiryHintForOldRecoveredSms() {
        val oldReceivedAt = System.currentTimeMillis() - 6 * 60 * 1000
        val advisory = SmsRelayRepository.buildInboxRecoveryAdvisory(System.currentTimeMillis(), oldReceivedAt)

        assertNotNull(advisory)
        assertTrue(advisory!!.contains("可能已过期"))
    }

    @Test
    fun buildInboxRecoveryAdvisorySkipsHintForFreshRecoveredSms() {
        val freshReceivedAt = System.currentTimeMillis() - 60 * 1000
        val advisory = SmsRelayRepository.buildInboxRecoveryAdvisory(System.currentTimeMillis(), freshReceivedAt)

        assertNull(advisory)
    }

    @Test
    fun uploadInboundSmsPersistsAdvisoryMessageWhenProvided() {
        server.enqueue(MockResponse().setResponseCode(200).setBody("""{"code":200}"""))

        val result = repository.uploadInboundSms(
            senderPhone = "13900000000",
            messageBody = "SL OLD123",
            receivedAt = 1770000000002L,
            advisoryMessage = "这条验证码可能已过期",
        )

        assertTrue(result.isSuccess)
        val record = repository.getAllRecords().first()
        assertEquals(UploadStatus.UPLOADED, record.status)
        assertEquals("这条验证码可能已过期", record.advisoryMessage)
    }
}
