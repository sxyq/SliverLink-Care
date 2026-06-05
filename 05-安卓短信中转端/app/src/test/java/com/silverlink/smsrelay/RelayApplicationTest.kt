package com.silverlink.smsrelay

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import com.silverlink.smsrelay.data.local.RelayPreferences
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class RelayApplicationTest {

    @Test
    fun onCreateStoresUptimeStartAndExposesWorkManagerConfig() {
        val application = ApplicationProvider.getApplicationContext<RelayApplication>()
        application.getSharedPreferences("sms-relay", Application.MODE_PRIVATE).edit().clear().commit()
        application.onCreate()
        val uptime = RelayPreferences(application).getUptime()

        assertTrue(uptime.contains("时") || uptime.contains("分"))
        assertEquals(android.util.Log.INFO, application.workManagerConfiguration.minimumLoggingLevel)
    }
}
