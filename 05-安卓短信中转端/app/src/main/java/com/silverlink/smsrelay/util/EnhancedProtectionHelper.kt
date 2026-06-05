package com.silverlink.smsrelay.util

import android.content.ActivityNotFoundException
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings

object EnhancedProtectionHelper {

    fun openNonRootEnhancedProtection(context: Context): Boolean {
        return NonRootKeepAliveHelper.enableAggressiveProtection(context)
    }

    fun openVendorProtectionSettings(context: Context): Boolean {
        val packageName = context.packageName
        val packageLabel = context.applicationInfo.loadLabel(context.packageManager).toString()

        val intents = listOf(
            Intent().setComponent(
                ComponentName(
                    "com.miui.powerkeeper",
                    "com.miui.powerkeeper.ui.HiddenAppsConfigActivity",
                ),
            ).putExtra("package_name", packageName)
                .putExtra("package_label", packageLabel)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            Intent().setComponent(
                ComponentName(
                    "com.miui.securitycenter",
                    "com.miui.permcenter.autostart.AutoStartManagementActivity",
                ),
            ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                .setData(Uri.parse("package:$packageName"))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        )

        return intents.any { launchSafely(context, it) }
    }

    fun protectionSummary(context: Context): String {
        val nonRootSummary = NonRootKeepAliveHelper.statusSummary(context)
        val rootForceEnabled = RootProtectionHelper.isForceProtectionEnabled(context)
        val rootSummary = when {
            rootForceEnabled -> "root 强保护已开启"
            RootProtectionHelper.isRootAvailable() -> "root 可用"
            else -> "root 不可用"
        }
        return "$nonRootSummary / $rootSummary"
    }

    private fun launchSafely(context: Context, intent: Intent): Boolean {
        return try {
            context.startActivity(intent)
            true
        } catch (_: ActivityNotFoundException) {
            false
        } catch (_: SecurityException) {
            false
        }
    }
}
