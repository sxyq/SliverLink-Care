package com.silverlink.smsrelay

import android.Manifest
import androidx.fragment.app.Fragment
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class MainActivityTest {

    @After
    fun tearDown() {
        MainActivity.resetTestHooks()
    }

    @Test
    fun onCreateStartsRelayServiceAndKeepsOverviewByDefault() {
        var startedImmediateHeartbeat: Boolean? = null
        MainActivity.serviceStarter = { _, immediate -> startedImmediateHeartbeat = immediate }
        MainActivity.smsPermissionChecker = { true }

        val activity = Robolectric.buildActivity(MainActivity::class.java).setup().get()

        assertEquals(false, startedImmediateHeartbeat)
        assertNotNull(activity.supportFragmentManager.findFragmentByTag("overview"))
        assertTrue(activity.supportFragmentManager.findFragmentByTag("records")?.isHidden == true)
        assertTrue(activity.supportFragmentManager.findFragmentByTag("settings")?.isHidden == true)
    }

    @Test
    fun onCreateRequestsPermissionsWhenMissing() {
        var requested: Array<String>? = null
        MainActivity.serviceStarter = { _, _ -> }
        MainActivity.smsPermissionChecker = { false }
        MainActivity.permissionRequester = { _, permissions -> requested = permissions }

        Robolectric.buildActivity(MainActivity::class.java).setup().get()

        assertEquals(
            listOf(Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_SMS),
            requested?.toList(),
        )
    }

    @Test
    fun bottomNavigationSwitchesVisibleFragment() {
        MainActivity.serviceStarter = { _, _ -> }
        MainActivity.smsPermissionChecker = { true }

        val activity = Robolectric.buildActivity(MainActivity::class.java).setup().get()
        val settings = activity.supportFragmentManager.findFragmentByTag("settings") as Fragment
        val method = MainActivity::class.java.getDeclaredMethod("switchFragment", Fragment::class.java)
        method.isAccessible = true
        method.invoke(activity, settings)
        activity.supportFragmentManager.executePendingTransactions()

        assertTrue(activity.supportFragmentManager.findFragmentByTag("overview")?.isHidden == true)
        assertTrue(activity.supportFragmentManager.findFragmentByTag("settings")?.isHidden == false)
    }
}
