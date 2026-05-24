package com.silverlink.smsrelay.data.model

data class DeviceStatus(
    val isOnline: Boolean,
    val lastHeartbeat: Long?,
    val lastSync: Long?,
    val uptimeStart: Long,
)
