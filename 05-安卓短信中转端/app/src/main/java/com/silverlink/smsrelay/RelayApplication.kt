package com.silverlink.smsrelay

import android.app.Application
import androidx.work.Configuration
import com.silverlink.smsrelay.data.local.RelayPreferences

class RelayApplication : Application(), Configuration.Provider {

    override fun onCreate() {
        super.onCreate()
        RelayPreferences(this).saveUptimeStart(System.currentTimeMillis())
    }

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setMinimumLoggingLevel(android.util.Log.INFO)
            .build()
}
