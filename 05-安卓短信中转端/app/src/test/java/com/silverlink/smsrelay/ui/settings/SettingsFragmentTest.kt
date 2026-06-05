package com.silverlink.smsrelay.ui.settings

import android.app.Application
import androidx.fragment.app.FragmentActivity
import androidx.test.core.app.ApplicationProvider
import com.silverlink.smsrelay.R
import com.silverlink.smsrelay.data.local.RelayPreferences
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.shadows.ShadowToast

@RunWith(RobolectricTestRunner::class)
class SettingsFragmentTest {

    private lateinit var application: Application
    private lateinit var preferences: RelayPreferences

    @Before
    fun setUp() {
        application = ApplicationProvider.getApplicationContext()
        application.getSharedPreferences("sms-relay", Application.MODE_PRIVATE).edit().clear().commit()
        preferences = RelayPreferences(application)
        SettingsFragment.preferencesFactory = { preferences }
    }

    @After
    fun tearDown() {
        SettingsFragment.resetTestHooks()
    }

    @Test
    fun saveButtonPersistsConfigAndStartsService() {
        var startedImmediateHeartbeat: Boolean? = null
        SettingsFragment.serviceStarter = { _, immediate -> startedImmediateHeartbeat = immediate }
        val fragment = SettingsFragment()
        val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
        activity.supportFragmentManager.beginTransaction().add(android.R.id.content, fragment).commitNow()

        fragment.requireView().findViewById<android.view.View>(R.id.btnSaveConfig).also {
            fragment.requireView().findViewById<com.google.android.material.textfield.TextInputEditText>(R.id.inputServerUrl)
                .setText("http://sxyq27.online/silverlink-api")
            fragment.requireView().findViewById<com.google.android.material.textfield.TextInputEditText>(R.id.inputDeviceId)
                .setText("device-a")
            fragment.requireView().findViewById<com.google.android.material.textfield.TextInputEditText>(R.id.inputDeviceSecret)
                .setText("secret-a")
            fragment.requireView().findViewById<com.google.android.material.textfield.TextInputEditText>(R.id.inputReceiverPhone)
                .setText("13800000000")
            fragment.requireView().findViewById<com.google.android.material.textfield.TextInputEditText>(R.id.inputPrefixRule)
                .setText("")
            it.performClick()
        }

        val config = preferences.readConfig()
        assertEquals("https://sxyq27.online/silverlink-api", config.serverBaseUrl)
        assertEquals("device-a", config.deviceId)
        assertEquals("secret-a", config.deviceSecret)
        assertEquals("13800000000", config.receiverPhone)
        assertEquals("SL", config.messagePrefix)
        assertEquals(true, startedImmediateHeartbeat)
        assertEquals(application.getString(R.string.config_saved), ShadowToast.getTextOfLatestToast())
    }

    @Test
    fun syncButtonShowsFailureWhenConfigIsBlank() {
        val fragment = SettingsFragment()
        val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
        activity.supportFragmentManager.beginTransaction().add(android.R.id.content, fragment).commitNow()

        fragment.requireView().findViewById<android.view.View>(R.id.btnSyncConfig).performClick()

        assertEquals(application.getString(R.string.config_sync_failed), ShadowToast.getTextOfLatestToast())
        assertTrue(fragment.requireView().findViewById<android.view.View>(R.id.btnSyncConfig).isEnabled)
    }
}
