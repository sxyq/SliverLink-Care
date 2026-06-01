package com.silverlink.smsrelay.ui.records

import android.app.Application
import android.view.View
import androidx.fragment.app.FragmentActivity
import androidx.recyclerview.widget.RecyclerView
import androidx.test.core.app.ApplicationProvider
import com.google.android.material.chip.ChipGroup
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
class RecordsFragmentTest {

    private lateinit var application: Application
    private lateinit var repository: SmsRelayRepository

    @Before
    fun setUp() {
        application = ApplicationProvider.getApplicationContext()
        application.getSharedPreferences("sms-relay", Application.MODE_PRIVATE).edit().clear().commit()
        application.getSharedPreferences("sms-relay-records", Application.MODE_PRIVATE).edit().clear().commit()
        repository = SmsRelayRepository(application, RelayPreferences(application))
        RecordsFragment.repositoryFactory = { repository }
    }

    @After
    fun tearDown() {
        RecordsFragment.resetTestHooks()
    }

    @Test
    fun showsAllRecordsAndFiltersByStatus() {
        saveRecords(
            listOf(
                SmsRecord("1", "10086", "上传成功", 1710000000000L, UploadStatus.UPLOADED),
                SmsRecord("2", "10010", "等待处理", 1710000001000L, UploadStatus.PENDING, advisoryMessage = "这条验证码可能已过期"),
                SmsRecord("3", "10000", "上传失败", 1710000002000L, UploadStatus.FAILED),
            ),
        )

        val fragment = RecordsFragment()
        val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
        activity.supportFragmentManager.beginTransaction().add(android.R.id.content, fragment).commitNow()
        val view = fragment.requireView()
        val recyclerView = view.findViewById<RecyclerView>(R.id.recordsList)
        val chipGroup = view.findViewById<ChipGroup>(R.id.filterChipGroup)

        assertEquals(4, chipGroup.childCount)
        assertEquals(3, recyclerView.adapter!!.itemCount)

        (chipGroup.getChildAt(1) as com.google.android.material.chip.Chip).performClick()

        assertEquals(1, recyclerView.adapter!!.itemCount)
        assertEquals(android.view.View.GONE, view.findViewById<android.view.View>(R.id.emptyState).visibility)
    }

    @Test
    fun showsAdvisoryMessageWhenRecordHasRecoveryHint() {
        saveRecords(
            listOf(
                SmsRecord(
                    "1",
                    "10086",
                    "SL OLD123",
                    1710000000000L,
                    UploadStatus.UPLOADED,
                    advisoryMessage = "这条验证码可能已过期",
                ),
            ),
        )

        val fragment = RecordsFragment()
        val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
        activity.supportFragmentManager.beginTransaction().add(android.R.id.content, fragment).commitNow()
        val recyclerView = fragment.requireView().findViewById<RecyclerView>(R.id.recordsList)
        recyclerView.measure(
            View.MeasureSpec.makeMeasureSpec(1080, View.MeasureSpec.EXACTLY),
            View.MeasureSpec.makeMeasureSpec(2400, View.MeasureSpec.AT_MOST),
        )
        recyclerView.layout(0, 0, 1080, 2400)
        val holder = recyclerView.findViewHolderForAdapterPosition(0)!!
        val advisory = holder.itemView.findViewById<android.widget.TextView>(R.id.recordAdvisory)

        assertEquals(android.view.View.VISIBLE, advisory.visibility)
        assertTrue(advisory.text.toString().contains("可能已过期"))
    }

    @Test
    fun showsEmptyStateWhenRepositoryHasNoRecords() {
        val fragment = RecordsFragment()
        val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
        activity.supportFragmentManager.beginTransaction().add(android.R.id.content, fragment).commitNow()
        val view = fragment.requireView()

        assertEquals(android.view.View.VISIBLE, view.findViewById<android.view.View>(R.id.emptyState).visibility)
        assertEquals(android.view.View.GONE, view.findViewById<RecyclerView>(R.id.recordsList).visibility)
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
