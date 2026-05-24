package com.silverlink.smsrelay.worker

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

object HeartbeatScheduler {

    private const val PERIODIC_WORK_NAME = "heartbeat"
    private const val IMMEDIATE_WORK_NAME = "heartbeat-initial"

    fun schedule(context: Context, enqueueImmediate: Boolean) {
        val workManager = WorkManager.getInstance(context)
        val periodicWork = PeriodicWorkRequestBuilder<HeartbeatWorker>(15, TimeUnit.MINUTES)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()

        workManager.enqueueUniquePeriodicWork(
            PERIODIC_WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            periodicWork,
        )

        if (enqueueImmediate) {
            val immediateWork = OneTimeWorkRequestBuilder<HeartbeatWorker>()
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.SECONDS)
                .build()
            workManager.enqueueUniqueWork(
                IMMEDIATE_WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                immediateWork,
            )
        }
    }
}
