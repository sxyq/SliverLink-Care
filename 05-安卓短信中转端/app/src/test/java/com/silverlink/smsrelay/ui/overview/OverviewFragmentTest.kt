package com.silverlink.smsrelay.ui.overview

import android.app.Application
import androidx.fragment.app.FragmentActivity
import androidx.recyclerview.widget.RecyclerView
import androidx.test.core.app.ApplicationProvider
import com.silverlink.smsrelay.R
import com.silverlink.smsrelay.data.local.RelayPreferences
import com.silverlink.smsrelay.data.model.SmsRecord
import com.silverlink.smsrelay.data.model.UploadStatus
import com.silverlink.smsrelay.repository.SmsRelayRepository
import org.json.JSONArray
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class OverviewFragmentTest {

    private lateinit var application: Application
    private lateinit var preferences: RelayPreferences
    private lateinit var repository: SmsRelayRepository

    @Before
    fun setUp() {
        application = ApplicationProvider.getApplicationContext()
        application.getSharedPreferences("sms-relay", Application.MODE_PRIVATE).edit().clear().commit()
        application.getSharedPreferences("sms-relay-records", Application.MODE_PRIVATE).edit().clear().commit()
        preferences = RelayPreferences(application)
        repository = SmsRelayRepository(application, preferences)
        OverviewFragment.preferencesFactory = { preferences }
        OverviewFragment.repositoryFactory = { repository }
    }

    @After
    fun tearDown() {
        OverviewFragment.resetTestHooks()
    }

    @Test
    fun showsConfiguredStatusAndRecentSmsList() {
        preferences.saveConfig("https://sxyq27.online/silverlink-api", "device-a", "secret", "13800000000", "SL")
        preferences.saveServiceState(true, "运行中")
        preferences.saveTodayStats(3, 2, 1, 4)
        saveRecords(
            listOf(
                SmsRecord("1", "10086", "验证码 1234", 1710000000000L, UploadStatus.UPLOADED),
                SmsRecord(
                    "2",
                    "10010",
                    "提醒消息",
                    1710000001000L,
                    UploadStatus.UPLOADED,
                    advisoryMessage = "这条验证码可能已过期",
                ),
            ),
        )

        val fragment = OverviewFragment()
        val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
        activity.supportFragmentManager.beginTransaction().add(android.R.id.content, fragment).commitNow()
        val view = fragment.requireView()

        assertEquals(application.getString(R.string.device_online), view.findViewById<android.widget.TextView>(R.id.deviceStatusText).text.toString())
        assertEquals("运行中", view.findViewById<android.widget.TextView>(R.id.serviceStatusText).text.toString())
        assertEquals("13800000000", view.findViewById<android.widget.TextView>(R.id.configRowValue).text.toString())
        assertEquals(android.view.View.VISIBLE, view.findViewById<RecyclerView>(R.id.recentSmsList).visibility)
        assertTrue(view.findViewById<RecyclerView>(R.id.recentSmsList).adapter!!.itemCount == 2)
        assertTrue(view.findViewById<android.widget.TextView>(R.id.recentSmsAdvisory).text.toString().contains("可能已过期"))
    }

    @Test
    fun showsEmptyStateWhenNoRecentSmsExists() {
        val fragment = OverviewFragment()
        val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
        activity.supportFragmentManager.beginTransaction().add(android.R.id.content, fragment).commitNow()
        val view = fragment.requireView()

        assertEquals(android.view.View.VISIBLE, view.findViewById<android.widget.TextView>(R.id.emptyRecentSms).visibility)
        assertEquals(android.view.View.GONE, view.findViewById<RecyclerView>(R.id.recentSmsList).visibility)
    }

    private fun saveRecords(records: List<SmsRecord>) {
        val array = JSONArray()
        records.forEach { record ->
            val obj = JSONObject()
                .put("id", record.id)
                .put("senderPhone", record.senderPhone)
                .put("messageBody", record.messageBody)
                .put("receivedAt", record.receivedAt)
                .put("status", record.status.name)
            record.advisoryMessage?.let { advisory -> obj.put("advisoryMessage", advisory) }
            array.put(obj)
        }
        application.getSharedPreferences("sms-relay-records", Application.MODE_PRIVATE)
            .edit()
            .putString("records_json", array.toString())
            .commit()
    }
}
