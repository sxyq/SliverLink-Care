package com.silverlink.smsrelay.worker

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import androidx.work.testing.TestListenableWorkerBuilder
import com.silverlink.smsrelay.data.local.RelayPreferences
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class HeartbeatWorkerTest {

    private lateinit var context: Application
    private lateinit var preferences: RelayPreferences

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        context.getSharedPreferences("sms-relay", Application.MODE_PRIVATE).edit().clear().commit()
        preferences = RelayPreferences(context)
    }

    @Test
    fun doWorkReturnsSuccessWhenServerBaseUrlIsBlank() = runBlocking {
        preferences.saveConfig(
            serverBaseUrl = "",
            deviceId = "device-1",
            deviceSecret = "secret-1",
            receiverPhone = "13800000000",
            messagePrefix = "SL",
        )

        val worker = TestListenableWorkerBuilder<HeartbeatWorker>(context).build()
        assertEquals(androidx.work.ListenableWorker.Result.success(), worker.doWork())
    }
}
