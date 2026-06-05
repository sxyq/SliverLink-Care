package com.silverlink.smsrelay.service

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock
import com.silverlink.smsrelay.receiver.HeartbeatAlarmReceiver
import java.util.concurrent.TimeUnit

object HeartbeatAlarmScheduler {

    internal const val ACTION_HEARTBEAT_WAKEUP = "com.silverlink.smsrelay.action.HEARTBEAT_WAKEUP"

    private const val REQUEST_CODE = 1002
    private val DEFAULT_INTERVAL_MS = TimeUnit.MINUTES.toMillis(5)

    fun scheduleNext(context: Context, delayMs: Long = DEFAULT_INTERVAL_MS) {
        val alarmManager = context.getSystemService(AlarmManager::class.java) ?: return
        val triggerAtMillis = SystemClock.elapsedRealtime() + delayMs.coerceAtLeast(TimeUnit.MINUTES.toMillis(1))
        val pendingIntent = pendingIntent(context)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && alarmManager.canScheduleExactAlarms()) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAtMillis, pendingIntent)
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            // Fall back to inexact idle wakeups when exact-alarm special access is unavailable.
            alarmManager.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAtMillis, pendingIntent)
        } else {
            alarmManager.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAtMillis, pendingIntent)
        }
    }

    internal fun pendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, HeartbeatAlarmReceiver::class.java)
            .setAction(ACTION_HEARTBEAT_WAKEUP)
        return PendingIntent.getBroadcast(
            context,
            REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }
}
