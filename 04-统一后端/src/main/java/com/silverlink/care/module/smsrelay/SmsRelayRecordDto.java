package com.silverlink.care.module.smsrelay;

public class SmsRelayRecordDto {
    private String id;
    private String deviceId;
    private String receiverPhone;
    private String senderPhone;
    private String messageBody;
    private Long receivedAt;
    private String messagePrefix;
    private Long uploadedAt;
    private String status;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
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
    public Long getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(Long uploadedAt) { this.uploadedAt = uploadedAt; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
