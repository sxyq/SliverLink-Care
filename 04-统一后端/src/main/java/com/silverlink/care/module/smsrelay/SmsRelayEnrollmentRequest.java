package com.silverlink.care.module.smsrelay;

public class SmsRelayEnrollmentRequest {
    private String requestId;
    private String deviceName;
    private String receiverPhone;
    private String serverUrl;
    private String messagePrefix;
    private String deviceSecret;

    public String getRequestId() { return requestId; }
    public void setRequestId(String requestId) { this.requestId = requestId; }
    public String getDeviceName() { return deviceName; }
    public void setDeviceName(String deviceName) { this.deviceName = deviceName; }
    public String getReceiverPhone() { return receiverPhone; }
    public void setReceiverPhone(String receiverPhone) { this.receiverPhone = receiverPhone; }
    public String getServerUrl() { return serverUrl; }
    public void setServerUrl(String serverUrl) { this.serverUrl = serverUrl; }
    public String getMessagePrefix() { return messagePrefix; }
    public void setMessagePrefix(String messagePrefix) { this.messagePrefix = messagePrefix; }
    public String getDeviceSecret() { return deviceSecret; }
    public void setDeviceSecret(String deviceSecret) { this.deviceSecret = deviceSecret; }
}
