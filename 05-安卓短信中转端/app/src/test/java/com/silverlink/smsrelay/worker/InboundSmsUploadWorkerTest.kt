package com.silverlink.smsrelay.worker

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import androidx.work.Data
import androidx.work.testing.TestListenableWorkerBuilder
import com.silverlink.smsrelay.data.local.RelayPreferences
import kotlinx.coroutines.runBlocking
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class InboundSmsUploadWorkerTest {

    private lateinit var context: Application
    private lateinit var server: MockWebServer
    private lateinit var preferences: RelayPreferences

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
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun doWorkReturnsFailureWhenSenderPhoneIsBlank() = runBlocking {
        val worker = TestListenableWorkerBuilder<InboundSmsUploadWorker>(context)
            .setInputData(Data.Builder()
                .putString(InboundSmsUploadWorker.KEY_SENDER_PHONE, "")
                .putString(InboundSmsUploadWorker.KEY_MESSAGE_BODY, "SL ABCD")
                .putLong(InboundSmsUploadWorker.KEY_RECEIVED_AT, 1000L)
                .build())
            .build()
        assertEquals(androidx.work.ListenableWorker.Result.failure(), worker.doWork())
    }

    @Test
    fun doWorkReturnsFailureWhenMessageBodyIsBlank() = runBlocking {
        val worker = TestListenableWorkerBuilder<InboundSmsUploadWorker>(context)
            .setInputData(Data.Builder()
                .putString(InboundSmsUploadWorker.KEY_SENDER_PHONE, "13800001111")
                .putString(InboundSmsUploadWorker.KEY_MESSAGE_BODY, "")
                .putLong(InboundSmsUploadWorker.KEY_RECEIVED_AT, 1000L)
                .build())
            .build()
        assertEquals(androidx.work.ListenableWorker.Result.failure(), worker.doWork())
    }

    @Test
    fun doWorkReturnsSuccessOnSuccessfulUpload() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(200).setBody("""{"code":200}"""))

        val worker = TestListenableWorkerBuilder<InboundSmsUploadWorker>(context)
            .setInputData(Data.Builder()
                .putString(InboundSmsUploadWorker.KEY_SENDER_PHONE, "13800001111")
                .putString(InboundSmsUploadWorker.KEY_MESSAGE_BODY, "SL ABCD")
                .putLong(InboundSmsUploadWorker.KEY_RECEIVED_AT, 1000L)
                .build())
            .build()
        assertEquals(androidx.work.ListenableWorker.Result.success(), worker.doWork())
    }

    @Test
    fun doWorkReturnsRetryOnFailedUpload() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(500))

        val worker = TestListenableWorkerBuilder<InboundSmsUploadWorker>(context)
            .setInputData(Data.Builder()
                .putString(InboundSmsUploadWorker.KEY_SENDER_PHONE, "13800001111")
                .putString(InboundSmsUploadWorker.KEY_MESSAGE_BODY, "SL ABCD")
                .putLong(InboundSmsUploadWorker.KEY_RECEIVED_AT, 1000L)
                .build())
            .build()
        assertEquals(androidx.work.ListenableWorker.Result.retry(), worker.doWork())
    }
}
