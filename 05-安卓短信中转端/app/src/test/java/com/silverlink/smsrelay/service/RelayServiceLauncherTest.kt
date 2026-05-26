package com.silverlink.smsrelay.service

import android.app.Application
import android.content.Intent
import androidx.test.core.app.ApplicationProvider
import com.silverlink.smsrelay.data.local.RelayPreferences
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf

@RunWith(RobolectricTestRunner::class)
class RelayServiceLauncherTest {

    @Test
    fun startMarksServiceRunningAndStartsForegroundIntent() {
        val context = ApplicationProvider.getApplicationContext<Application>()

        RelayServiceLauncher.start(context, immediateHeartbeat = true)

        val started = shadowOf(context).nextStartedService
        assertEquals(RelayForegroundService::class.java.name, started.component?.className)
        assertEquals(RelayServiceLauncher.ACTION_START, started.action)
        assertTrue(started.getBooleanExtra(RelayServiceLauncher.EXTRA_IMMEDIATE_HEARTBEAT, false))
        assertTrue(RelayPreferences(context).readServiceState().running)
    }

    @Test
    fun triggerHeartbeatStartsHeartbeatAction() {
        val context = ApplicationProvider.getApplicationContext<Application>()

        RelayServiceLauncher.triggerHeartbeat(context)

        assertEquals(RelayServiceLauncher.ACTION_TRIGGER_HEARTBEAT, shadowOf(context).nextStartedService.action)
    }

    @Test
    fun uploadSmsIncludesInboundPayloadExtras() {
        val context = ApplicationProvider.getApplicationContext<Application>()

        RelayServiceLauncher.uploadSms(
            context = context,
            senderPhone = "13812345678",
            messageBody = "SL 123456",
            receivedAt = 1770000000000L,
        )

        val started: Intent = shadowOf(context).nextStartedService
        assertEquals(RelayServiceLauncher.ACTION_UPLOAD_SMS, started.action)
        assertEquals("13812345678", started.getStringExtra(RelayServiceLauncher.EXTRA_SENDER_PHONE))
        assertEquals("SL 123456", started.getStringExtra(RelayServiceLauncher.EXTRA_MESSAGE_BODY))
        assertEquals(1770000000000L, started.getLongExtra(RelayServiceLauncher.EXTRA_RECEIVED_AT, 0L))
        assertTrue(RelayPreferences(context).readServiceState().running)
    }
}
