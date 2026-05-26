package com.silverlink.smsrelay.util

import android.Manifest
import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf

@RunWith(RobolectricTestRunner::class)
class SmsPermissionHelperTest {

    @Test
    fun exposesReceiveAndReadSmsPermissions() {
        assertArrayEquals(
            arrayOf(Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_SMS),
            SmsPermissionHelper.smsPermissions,
        )
    }

    @Test
    fun detectsGrantedAndMissingSmsPermissions() {
        val context = ApplicationProvider.getApplicationContext<Context>()

        assertFalse(SmsPermissionHelper.hasSmsPermissions(context))

        shadowOf(context.applicationContext as android.app.Application).grantPermissions(Manifest.permission.RECEIVE_SMS)
        assertFalse(SmsPermissionHelper.hasSmsPermissions(context))

        shadowOf(context.applicationContext as android.app.Application).grantPermissions(Manifest.permission.READ_SMS)
        assertTrue(SmsPermissionHelper.hasSmsPermissions(context))
    }
}
