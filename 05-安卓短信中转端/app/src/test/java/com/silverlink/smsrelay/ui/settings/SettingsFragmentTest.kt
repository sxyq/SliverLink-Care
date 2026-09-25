package com.silverlink.smsrelay.ui.settings

import android.app.Application
import android.content.Context
import android.os.Looper
import android.view.View
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
import org.robolectric.shadows.ShadowDialog
import org.robolectric.shadows.ShadowToast
import org.robolectric.Shadows.shadowOf

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
    fun syncButtonShowsFailureWhenConfigIsBlank() {
        val fragment = SettingsFragment()
        val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
        activity.supportFragmentManager.beginTransaction().add(android.R.id.content, fragment).commitNow()

        fragment.requireView().findViewById<android.view.View>(R.id.btnSyncConfig).performClick()

        assertEquals(application.getString(R.string.config_sync_failed), ShadowToast.getTextOfLatestToast())
        assertTrue(fragment.requireView().findViewById<android.view.View>(R.id.btnSyncConfig).isEnabled)
    }

    @Test
    fun newInstallShowsEnrollmentActionInsteadOfManualDeviceCredentials() {
        val fragment = SettingsFragment()
        val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
        activity.supportFragmentManager.beginTransaction().add(android.R.id.content, fragment).commitNow()

        assertEquals(View.VISIBLE, fragment.requireView().findViewById<View>(R.id.btnApplyEnrollment).visibility)
        assertEquals(View.GONE, fragment.requireView().findViewById<View>(R.id.inputLayoutDeviceId).visibility)
        assertEquals(View.GONE, fragment.requireView().findViewById<View>(R.id.inputLayoutDeviceSecret).visibility)
        assertEquals(View.VISIBLE, fragment.requireView().findViewById<View>(R.id.inputLayoutDeviceName).visibility)
        assertEquals(View.VISIBLE, fragment.requireView().findViewById<View>(R.id.inputLayoutServerUrl).visibility)
        assertEquals(View.VISIBLE, fragment.requireView().findViewById<View>(R.id.inputLayoutReceiverPhone).visibility)
        assertEquals(View.VISIBLE, fragment.requireView().findViewById<View>(R.id.inputLayoutPrefixRule).visibility)
    }

    @Test
    fun pendingEnrollmentOnlyOffersStatusRefresh() {
        preferences.updateEnrollmentStatus("PENDING")
        val fragment = SettingsFragment()
        val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
        activity.supportFragmentManager.beginTransaction().add(android.R.id.content, fragment).commitNow()

        assertEquals(View.GONE, fragment.requireView().findViewById<View>(R.id.btnApplyEnrollment).visibility)
        assertEquals(View.VISIBLE, fragment.requireView().findViewById<View>(R.id.btnRefreshEnrollment).visibility)
        assertEquals(View.GONE, fragment.requireView().findViewById<View>(R.id.btnSyncConfig).visibility)
        assertEquals(View.GONE, fragment.requireView().findViewById<View>(R.id.btnResetEnrollment).visibility)
        assertEquals(false, fragment.requireView().findViewById<View>(R.id.inputDeviceName).isEnabled)
        assertEquals(false, fragment.requireView().findViewById<View>(R.id.inputServerUrl).isEnabled)
        assertEquals(false, fragment.requireView().findViewById<View>(R.id.inputReceiverPhone).isEnabled)
        assertEquals(false, fragment.requireView().findViewById<View>(R.id.inputPrefixRule).isEnabled)
    }

    @Test
    fun approvedDeviceShowsReadOnlyMaskedCredentialsAndUnifiedActions() {
        preferences.saveConfig(
            serverBaseUrl = "https://sxyq27.online/silverlink-api",
            deviceId = "approved-device",
            deviceSecret = "top-secret",
            receiverPhone = "13800000000",
            messagePrefix = "SL",
        )
        preferences.updateEnrollmentStatus("ACTIVE")
        val fragment = SettingsFragment()
        val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
        activity.supportFragmentManager.beginTransaction().add(android.R.id.content, fragment).commitNow()

        val deviceId = fragment.requireView()
            .findViewById<com.google.android.material.textfield.TextInputEditText>(R.id.inputDeviceId)
        val secret = fragment.requireView()
            .findViewById<com.google.android.material.textfield.TextInputEditText>(R.id.inputDeviceSecret)
        assertEquals("approved-device", deviceId.text.toString())
        assertEquals("••••••••••••", secret.text.toString())
        assertEquals(false, deviceId.isEnabled)
        assertEquals(false, secret.isEnabled)
        assertEquals(false, fragment.requireView().findViewById<View>(R.id.inputServerUrl).isEnabled)
        assertEquals(false, fragment.requireView().findViewById<View>(R.id.inputReceiverPhone).isEnabled)
        assertEquals(false, fragment.requireView().findViewById<View>(R.id.inputPrefixRule).isEnabled)
        assertEquals(View.VISIBLE, fragment.requireView().findViewById<View>(R.id.btnSyncConfig).visibility)
        assertEquals(View.VISIBLE, fragment.requireView().findViewById<View>(R.id.btnResetEnrollment).visibility)
        assertEquals(View.GONE, fragment.requireView().findViewById<View>(R.id.btnApplyEnrollment).visibility)
        assertEquals(View.GONE, fragment.requireView().findViewById<View>(R.id.btnRefreshEnrollment).visibility)
    }

    @Test
    fun showingSettingsRefreshesHeartbeatStatusWrittenWhileHidden() {
        preferences.saveConfig(
            serverBaseUrl = "https://sxyq27.online/silverlink-api",
            deviceId = "approved-device",
            deviceSecret = "top-secret",
            receiverPhone = "13800000000",
            messagePrefix = "SL",
        )
        preferences.updateEnrollmentStatus("ACTIVE")
        preferences.saveServiceState(true, application.getString(R.string.relay_service_running))
        val fragment = SettingsFragment()
        val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
        activity.supportFragmentManager.beginTransaction().add(android.R.id.content, fragment).commitNow()

        fragment.onHiddenChanged(true)
        preferences.saveServiceState(true, application.getString(R.string.relay_service_online))
        fragment.onHiddenChanged(false)

        val deviceStatus = fragment.requireView().findViewById<View>(R.id.rowDeviceStatus)
            .findViewById<android.widget.TextView>(R.id.configRowValue).text.toString()
        assertEquals(application.getString(R.string.device_online), deviceStatus)
    }

    @Test
    fun revokedDeviceIsOfflineAndOnlyOffersNewEnrollment() {
        preferences.saveConfig(
            serverBaseUrl = "https://sxyq27.online/silverlink-api",
            deviceId = "revoked-device",
            deviceSecret = "old-secret",
            receiverPhone = "13800000000",
            messagePrefix = "SL",
        )
        preferences.markDeviceRevoked()
        preferences.saveServiceState(false, application.getString(R.string.relay_service_revoked))
        val fragment = SettingsFragment()
        val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
        activity.supportFragmentManager.beginTransaction().add(android.R.id.content, fragment).commitNow()

        assertEquals(View.GONE, fragment.requireView().findViewById<View>(R.id.btnSyncConfig).visibility)
        assertEquals(View.VISIBLE, fragment.requireView().findViewById<View>(R.id.btnResetEnrollment).visibility)
        assertEquals(
            application.getString(R.string.enrollment_revoked),
            fragment.requireView().findViewById<android.widget.TextView>(R.id.textEnrollmentStatus).text.toString(),
        )
        val deviceStatus = fragment.requireView().findViewById<View>(R.id.rowDeviceStatus)
            .findViewById<android.widget.TextView>(R.id.configRowValue).text.toString()
        assertEquals(application.getString(R.string.device_offline), deviceStatus)
    }

    @Test
    fun registeredDeviceCanStartOverWithoutRemovingLocalSmsRecords() {
        preferences.saveConfig(
            serverBaseUrl = "https://sxyq27.online/silverlink-api",
            deviceId = "relay-old-device",
            deviceSecret = "old-secret",
            receiverPhone = "15212343755",
            messagePrefix = "SL",
        )
        preferences.updateEnrollmentStatus("ACTIVE")
        application.getSharedPreferences("sms-relay-records", Context.MODE_PRIVATE)
            .edit().putString("records_json", "local-records").commit()
        SettingsFragment.serviceStopper = {}
        val fragment = SettingsFragment()
        val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
        activity.supportFragmentManager.beginTransaction().add(android.R.id.content, fragment).commitNow()

        assertEquals(View.VISIBLE, fragment.requireView().findViewById<View>(R.id.btnResetEnrollment).visibility)
        fragment.requireView().findViewById<View>(R.id.btnResetEnrollment).performClick()
        val dialog = ShadowDialog.getLatestDialog() as androidx.appcompat.app.AlertDialog
        dialog.getButton(android.content.DialogInterface.BUTTON_POSITIVE).performClick()
        shadowOf(Looper.getMainLooper()).idle()

        val config = preferences.readConfig()
        assertEquals("", config.deviceId)
        assertEquals("", config.deviceSecret)
        assertEquals("15212343755", config.receiverPhone)
        assertEquals(View.VISIBLE, fragment.requireView().findViewById<View>(R.id.btnApplyEnrollment).visibility)
        assertEquals("local-records", application.getSharedPreferences("sms-relay-records", Context.MODE_PRIVATE)
            .getString("records_json", ""))
    }

    @Test
    fun enrollmentRejectsMissingPhoneWithoutStartingService() {
        var serviceStarted = false
        SettingsFragment.serviceStarter = { _, _ -> serviceStarted = true }
        val fragment = SettingsFragment()
        val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
        activity.supportFragmentManager.beginTransaction().add(android.R.id.content, fragment).commitNow()
        fragment.requireView().findViewById<com.google.android.material.textfield.TextInputEditText>(R.id.inputDeviceName)
            .setText("值守手机")
        fragment.requireView().findViewById<com.google.android.material.textfield.TextInputEditText>(R.id.inputServerUrl)
            .setText("https://api.example.com")

        fragment.requireView().findViewById<View>(R.id.btnApplyEnrollment).performClick()

        assertEquals(application.getString(R.string.enrollment_phone_required), ShadowToast.getTextOfLatestToast())
        assertEquals(false, serviceStarted)
    }

    @Test
    fun enrollmentRejectsLocalHttpServerBecauseBackendRequiresHttps() {
        val fragment = SettingsFragment()
        val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
        activity.supportFragmentManager.beginTransaction().add(android.R.id.content, fragment).commitNow()
        fragment.requireView().findViewById<com.google.android.material.textfield.TextInputEditText>(R.id.inputDeviceName)
            .setText("值守手机")
        fragment.requireView().findViewById<com.google.android.material.textfield.TextInputEditText>(R.id.inputReceiverPhone)
            .setText("13800000000")
        fragment.requireView().findViewById<com.google.android.material.textfield.TextInputEditText>(R.id.inputServerUrl)
            .setText("http://localhost:8080")

        fragment.requireView().findViewById<View>(R.id.btnApplyEnrollment).performClick()

        assertEquals(application.getString(R.string.enrollment_server_https_required), ShadowToast.getTextOfLatestToast())
    }

    @Test
    fun enrollmentRejectsPrefixLongerThanBackendLimit() {
        val fragment = SettingsFragment()
        val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
        activity.supportFragmentManager.beginTransaction().add(android.R.id.content, fragment).commitNow()
        fragment.requireView().findViewById<com.google.android.material.textfield.TextInputEditText>(R.id.inputDeviceName)
            .setText("值守手机")
        fragment.requireView().findViewById<com.google.android.material.textfield.TextInputEditText>(R.id.inputReceiverPhone)
            .setText("13800000000")
        fragment.requireView().findViewById<com.google.android.material.textfield.TextInputEditText>(R.id.inputServerUrl)
            .setText("https://api.example.com")
        fragment.requireView().findViewById<com.google.android.material.textfield.TextInputEditText>(R.id.inputPrefixRule)
            .setText("X".repeat(33))

        fragment.requireView().findViewById<View>(R.id.btnApplyEnrollment).performClick()

        assertEquals(application.getString(R.string.enrollment_prefix_invalid), ShadowToast.getTextOfLatestToast())
    }
}
