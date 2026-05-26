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
}
