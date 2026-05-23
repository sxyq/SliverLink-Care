package com.silverlink.care.module.smsrelay;

public class HeartbeatRequest {
    private String deviceId;
    private Long timestamp;

    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }
    public Long getTimestamp() { return timestamp; }
    public void setTimestamp(Long timestamp) { this.timestamp = timestamp; }
}
