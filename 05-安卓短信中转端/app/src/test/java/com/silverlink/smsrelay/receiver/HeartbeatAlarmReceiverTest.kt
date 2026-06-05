package com.silverlink.smsrelay.receiver

import android.app.Application
import android.content.Intent
import androidx.test.core.app.ApplicationProvider
import com.silverlink.smsrelay.service.HeartbeatAlarmScheduler
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf

@RunWith(RobolectricTestRunner::class)
class HeartbeatAlarmReceiverTest {

    private lateinit var context: Application
    private val receiver = HeartbeatAlarmReceiver()

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
    }

    @After
    fun tearDown() {
        HeartbeatAlarmReceiver.resetTestHooks()
    }

    @Test
    fun ignoresOtherActions() {
        receiver.onReceive(context, Intent("custom.action.TEST"))

        assertNull(shadowOf(context).nextStartedService)
    }

    @Test
    fun triggersHeartbeatOverrideForWakeupAction() {
        var called = false
        HeartbeatAlarmReceiver.heartbeatOverride = {
            called = true
        }

        receiver.onReceive(context, Intent(HeartbeatAlarmScheduler.ACTION_HEARTBEAT_WAKEUP))

        assertTrue(called)
        assertNull(shadowOf(context).nextStartedService)
    }
}
