package com.silverlink.smsrelay.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.silverlink.smsrelay.worker.HeartbeatWorker
import java.util.concurrent.TimeUnit

class BootCompletedReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (Intent.ACTION_BOOT_COMPLETED != intent.action) return
        // 开机后恢复心跳定时任务
        scheduleHeartbeat(context)
    }

    private fun scheduleHeartbeat(context: Context) {
        val heartbeatWork = PeriodicWorkRequestBuilder<HeartbeatWorker>(15, TimeUnit.MINUTES)
            .build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            "heartbeat",
            ExistingPeriodicWorkPolicy.KEEP,
            heartbeatWork,
        )
    }
}
