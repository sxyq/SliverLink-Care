package com.silverlink.smsrelay.data.local

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.text.SimpleDateFormat
import java.util.Locale

@RunWith(RobolectricTestRunner::class)
class RelayPreferencesTest {

    private lateinit var context: Application
    private lateinit var preferences: RelayPreferences

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        context.getSharedPreferences("sms-relay", Application.MODE_PRIVATE).edit().clear().commit()
        preferences = RelayPreferences(context)
    }

    @Test
    fun savesConfigStateAndTimestamps() {
        preferences.saveConfig(
            serverBaseUrl = "http://sxyq27.online/silverlink-api",
            deviceId = "device-1",
            deviceSecret = "secret-1",
            receiverPhone = "13800000000",
            messagePrefix = "",
        )
        preferences.saveServiceState(true, "运行中")
        preferences.saveLastSyncTime(1770000000000L)
        preferences.saveLastHeartbeat(1770000100000L)
        preferences.saveUptimeStart(System.currentTimeMillis() - 90 * 60 * 1000L)

        val config = preferences.readConfig()
        assertEquals("http://sxyq27.online/silverlink-api", config.serverBaseUrl)
        assertEquals("device-1", config.deviceId)
        assertEquals("SL", config.messagePrefix)
        assertTrue(preferences.getLastSyncTime().contains("2026"))
        assertTrue(preferences.getLastHeartbeat().contains("2026"))
        assertEquals(true, preferences.readServiceState().running)
        assertEquals("运行中", preferences.readServiceState().statusText)
        assertTrue(preferences.getUptime().contains("时"))
    }

    @Test
    fun todayStatsResetWhenDateChanges() {
        preferences.saveTodayStats(received = 3, uploaded = 2, failed = 1, pending = 4)
        assertEquals(TodayStats(3, 2, 1, 4), preferences.readTodayStats())

        val yesterday = "1999-01-01"
        context.getSharedPreferences("sms-relay", Application.MODE_PRIVATE)
            .edit()
            .putString("stats_date", yesterday)
            .commit()

        assertNotEquals(
            SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(java.util.Date(yesterday.hashCode().toLong())),
            context.getSharedPreferences("sms-relay", Application.MODE_PRIVATE).getString("stats_date", ""),
        )
        assertEquals(TodayStats(0, 0, 0, 0), preferences.readTodayStats())
    }

    @Test
    fun keepsLocalDevelopmentServerUrlsUntouched() {
        preferences.saveConfig(
            serverBaseUrl = "http://10.0.2.2:8080",
            deviceId = "device-1",
            deviceSecret = "secret-1",
            receiverPhone = "13800000000",
            messagePrefix = "SL",
        )

        assertEquals("http://10.0.2.2:8080", preferences.readConfig().serverBaseUrl)
    }

    @Test
    fun returnsDefaultsForUnsetValues() {
        assertEquals("", preferences.readConfig().serverBaseUrl)
        assertEquals("从未", preferences.getLastSyncTime())
        assertEquals("从未", preferences.getLastHeartbeat())
        assertEquals("未知", preferences.getUptime())
        assertEquals(false, preferences.readServiceState().running)
        assertEquals("未启动", preferences.readServiceState().statusText)
        assertEquals(TodayStats(0, 0, 0, 0), preferences.readTodayStats())
    }
}
