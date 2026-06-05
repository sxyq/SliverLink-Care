package com.silverlink.smsrelay.service

import android.app.AlarmManager
import android.app.Application
import android.os.SystemClock
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf

@RunWith(RobolectricTestRunner::class)
class HeartbeatAlarmSchedulerTest {

    @Test
    fun scheduleNextRegistersAllowWhileIdleWakeupAlarm() {
        val context = ApplicationProvider.getApplicationContext<Application>()
        val alarmManager = context.getSystemService(AlarmManager::class.java)

        HeartbeatAlarmScheduler.scheduleNext(context)

        val scheduled = shadowOf(alarmManager).nextScheduledAlarm
        requireNotNull(scheduled)
        assertEquals(AlarmManager.ELAPSED_REALTIME_WAKEUP, scheduled.type)
        assertTrue(scheduled.isAllowWhileIdle)
        assertEquals(HeartbeatAlarmScheduler.ACTION_HEARTBEAT_WAKEUP, shadowOf(scheduled.operation).savedIntent.action)
        assertTrue(scheduled.triggerAtTime >= SystemClock.elapsedRealtime())
    }
}
