package com.silverlink.smsrelay.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.silverlink.smsrelay.data.local.RelayPreferences
import com.silverlink.smsrelay.service.RelayServiceLauncher

class BootCompletedReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (Intent.ACTION_BOOT_COMPLETED != intent.action) return
        if (!RelayPreferences(context).isDeviceActive()) return
        RelayServiceLauncher.start(context, immediateHeartbeat = true)
    }
}
