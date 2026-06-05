package com.silverlink.smsrelay.util

import android.app.AlarmManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import androidx.core.net.toUri

object NonRootKeepAliveHelper {

    private const val PREFS_NAME = "sms-relay"
    private const val KEY_NON_ROOT_PROTECTION_GUIDED = "non_root_protection_guided"

    fun enableAggressiveProtection(context: Context): Boolean {
        var opened = false

        if (!BatteryOptimizationHelper.isIgnoringBatteryOptimizations(context)) {
            opened = BatteryOptimizationHelper.requestIgnoreBatteryOptimizations(context) || opened
        }

        if (!canScheduleExactAlarms(context)) {
            opened = requestExactAlarmPermission(context) || opened
        }

        opened = EnhancedProtectionHelper.openVendorProtectionSettings(context) || opened

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            opened = openNotificationSettings(context) || opened
        }

        if (opened || isAggressiveProtectionReady(context)) {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putBoolean(KEY_NON_ROOT_PROTECTION_GUIDED, true)
                .apply()
        }
        return opened
    }

    fun canScheduleExactAlarms(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        val alarmManager = context.getSystemService(AlarmManager::class.java) ?: return false
        return alarmManager.canScheduleExactAlarms()
    }

    fun isAggressiveProtectionReady(context: Context): Boolean {
        return BatteryOptimizationHelper.isIgnoringBatteryOptimizations(context) &&
            canScheduleExactAlarms(context)
    }

    fun wasProtectionGuided(context: Context): Boolean {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getBoolean(KEY_NON_ROOT_PROTECTION_GUIDED, false)
    }

    fun statusSummary(context: Context): String {
        val batteryReady = BatteryOptimizationHelper.isIgnoringBatteryOptimizations(context)
        val exactAlarmReady = canScheduleExactAlarms(context)
        val vendorGuided = wasProtectionGuided(context)
        return buildString {
            append(if (batteryReady) "电池白名单已开启" else "电池白名单未开启")
            append(" / ")
            append(if (exactAlarmReady) "精确闹钟已开启" else "精确闹钟未开启")
            append(" / ")
            append(if (vendorGuided) "厂商后台已引导" else "厂商后台未引导")
        }
    }

    private fun requestExactAlarmPermission(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return false
        val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
            .setData("package:${context.packageName}".toUri())
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        return launchSafely(context, intent)
    }

    private fun openNotificationSettings(context: Context): Boolean {
        val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
            .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        return launchSafely(context, intent)
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
