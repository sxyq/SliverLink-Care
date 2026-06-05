package com.silverlink.smsrelay.service

import android.app.Application
import android.content.Intent
import androidx.test.core.app.ApplicationProvider
import com.silverlink.smsrelay.R
import com.silverlink.smsrelay.data.local.RelayPreferences
import com.silverlink.smsrelay.data.network.RelayApiService
import com.silverlink.smsrelay.repository.SmsRelayRepository
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Protocol
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf

@RunWith(RobolectricTestRunner::class)
class RelayForegroundServiceTest {

    private lateinit var application: Application
    private lateinit var preferences: RelayPreferences

    @Before
    fun setUp() {
        application = ApplicationProvider.getApplicationContext()
        application.getSharedPreferences("sms-relay", Application.MODE_PRIVATE).edit().clear().commit()
        application.getSharedPreferences("sms-relay-records", Application.MODE_PRIVATE).edit().clear().commit()
        preferences = RelayPreferences(application)
        RelayForegroundService.preferencesFactory = { preferences }
        RelayForegroundService.ioDispatcher = UnconfinedTestDispatcher()
    }

    @After
    fun tearDown() {
        RelayForegroundService.resetTestHooks()
    }

    @Test
    fun onCreateMarksServiceRunningAndCreatesNotification() {
        val service = Robolectric.buildService(RelayForegroundService::class.java).create().get()

        val state = preferences.readServiceState()
        assertEquals(true, state.running)
        assertEquals(application.getString(R.string.relay_service_waiting_config), state.statusText)
        assertEquals(1, shadowOf(service.getSystemService(android.app.NotificationManager::class.java)).allNotifications.size)
    }

    @Test
    fun immediateHeartbeatWithBlankConfigKeepsWaitingState() {
        val service = Robolectric.buildService(RelayForegroundService::class.java).create().get()

        service.onStartCommand(
            Intent(application, RelayForegroundService::class.java)
                .setAction(RelayServiceLauncher.ACTION_START)
                .putExtra(RelayServiceLauncher.EXTRA_IMMEDIATE_HEARTBEAT, true),
            0,
            1,
        )

        assertEquals(application.getString(R.string.relay_service_waiting_config), preferences.readServiceState().statusText)
    }

    @Test
    fun uploadSmsSuccessMarksServiceOnline() {
        preferences.saveConfig("https://relay.example.com", "device-a", "secret", "13800000000", "SL")
        RelayForegroundService.repositoryFactory = {
            SmsRelayRepository(
                it,
                preferences,
                successApiService(),
            )
        }
        val service = Robolectric.buildService(RelayForegroundService::class.java).create().get()

        service.onStartCommand(
            Intent(application, RelayForegroundService::class.java)
                .setAction(RelayServiceLauncher.ACTION_UPLOAD_SMS)
                .putExtra(RelayServiceLauncher.EXTRA_SENDER_PHONE, "10086")
                .putExtra(RelayServiceLauncher.EXTRA_MESSAGE_BODY, "验证码 1234")
                .putExtra(RelayServiceLauncher.EXTRA_RECEIVED_AT, 1710000000000L),
            0,
            1,
        )

        assertEquals(application.getString(R.string.relay_service_online), preferences.readServiceState().statusText)
    }

    @Test
    fun uploadSmsFailureMarksServiceRetrying() {
        preferences.saveConfig("https://relay.example.com", "device-a", "secret", "13800000000", "SL")
        RelayForegroundService.repositoryFactory = {
            SmsRelayRepository(
                it,
                preferences,
                failureApiService(),
            )
        }
        val service = Robolectric.buildService(RelayForegroundService::class.java).create().get()

        service.onStartCommand(
            Intent(application, RelayForegroundService::class.java)
                .setAction(RelayServiceLauncher.ACTION_UPLOAD_SMS)
                .putExtra(RelayServiceLauncher.EXTRA_SENDER_PHONE, "10086")
                .putExtra(RelayServiceLauncher.EXTRA_MESSAGE_BODY, "验证码 1234")
                .putExtra(RelayServiceLauncher.EXTRA_RECEIVED_AT, 1710000000000L),
            0,
            1,
        )

        assertEquals(application.getString(R.string.relay_service_retrying), preferences.readServiceState().statusText)
    }

    private fun successApiService(): RelayApiService = RelayApiService(fakeClient(200))

    private fun failureApiService(): RelayApiService = RelayApiService(fakeClient(500))

    private fun fakeClient(code: Int): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor { chain ->
                Response.Builder()
                    .request(chain.request())
                    .protocol(Protocol.HTTP_1_1)
                    .code(code)
                    .message(if (code in 200..299) "OK" else "ERROR")
                    .body("{}".toResponseBody("application/json".toMediaType()))
                    .build()
            }
            .build()
    }
}
