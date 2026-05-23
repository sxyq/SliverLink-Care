package com.silverlink.care.module.smsrelay;

public class InboundSmsRequest {
    private String deviceId;
    private String receiverPhone;
    private String senderPhone;
    private String messageBody;
    private Long receivedAt;
    private String messagePrefix;

    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }
    public String getReceiverPhone() { return receiverPhone; }
    public void setReceiverPhone(String receiverPhone) { this.receiverPhone = receiverPhone; }
    public String getSenderPhone() { return senderPhone; }
    public void setSenderPhone(String senderPhone) { this.senderPhone = senderPhone; }
    public String getMessageBody() { return messageBody; }
    public void setMessageBody(String messageBody) { this.messageBody = messageBody; }
    public Long getReceivedAt() { return receivedAt; }
    public void setReceivedAt(Long receivedAt) { this.receivedAt = receivedAt; }
    public String getMessagePrefix() { return messagePrefix; }
    public void setMessagePrefix(String messagePrefix) { this.messagePrefix = messagePrefix; }
}
