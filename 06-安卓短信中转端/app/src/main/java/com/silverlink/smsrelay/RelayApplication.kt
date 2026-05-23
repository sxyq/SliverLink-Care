package com.silverlink.smsrelay

import android.app.Application
import androidx.work.Configuration
import androidx.work.WorkManager

class RelayApplication : Application(), Configuration.Provider {

    override fun onCreate() {
        super.onCreate()
        WorkManager.initialize(this, workManagerConfiguration)
    }

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setMinimumLoggingLevel(android.util.Log.INFO)
            .build()
}
