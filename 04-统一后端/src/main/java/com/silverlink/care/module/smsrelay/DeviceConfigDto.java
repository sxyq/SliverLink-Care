package com.silverlink.care.module.smsrelay;

public class DeviceConfigDto {
    private String deviceId;
    private String receiverPhone;
    private String serverUrl;
    private String messagePrefix;
    private String status;
    private String lastHeartbeat;

    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }
    public String getReceiverPhone() { return receiverPhone; }
    public void setReceiverPhone(String receiverPhone) { this.receiverPhone = receiverPhone; }
    public String getServerUrl() { return serverUrl; }
    public void setServerUrl(String serverUrl) { this.serverUrl = serverUrl; }
    public String getMessagePrefix() { return messagePrefix; }
    public void setMessagePrefix(String messagePrefix) { this.messagePrefix = messagePrefix; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getLastHeartbeat() { return lastHeartbeat; }
    public void setLastHeartbeat(String lastHeartbeat) { this.lastHeartbeat = lastHeartbeat; }
}
