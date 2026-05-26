package com.silverlink.smsrelay.receiver

import android.app.Application
import android.content.Intent
import androidx.test.core.app.ApplicationProvider
import com.silverlink.smsrelay.data.local.RelayPreferences
import com.silverlink.smsrelay.service.RelayForegroundService
import com.silverlink.smsrelay.service.RelayServiceLauncher
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf

@RunWith(RobolectricTestRunner::class)
class BootCompletedReceiverTest {

    private lateinit var context: Application
    private val receiver = BootCompletedReceiver()

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        context.getSharedPreferences("sms-relay", Application.MODE_PRIVATE).edit().clear().commit()
    }

    @Test
    fun ignoresNonBootAction() {
        receiver.onReceive(context, Intent("custom.action.TEST"))

        assertNull(shadowOf(context).nextStartedService)
        assertEquals(false, RelayPreferences(context).readServiceState().running)
    }

    @Test
    fun startsForegroundServiceOnBootCompleted() {
        receiver.onReceive(context, Intent(Intent.ACTION_BOOT_COMPLETED))

        val started = shadowOf(context).nextStartedService
        assertEquals(RelayForegroundService::class.java.name, started.component?.className)
        assertEquals(RelayServiceLauncher.ACTION_START, started.action)
        assertTrue(started.getBooleanExtra(RelayServiceLauncher.EXTRA_IMMEDIATE_HEARTBEAT, false))
        assertTrue(RelayPreferences(context).readServiceState().running)
    }
}
