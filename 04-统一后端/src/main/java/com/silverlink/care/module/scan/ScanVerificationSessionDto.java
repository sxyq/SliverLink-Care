package com.silverlink.care.module.scan;

public class ScanVerificationSessionDto {
    private String sessionId;
    private String receiverPhone;
    private String receiverPhoneMasked;
    private String messageBody;
    private String messagePrefix;
    private String status;
    private String expiresAt;

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getReceiverPhone() {
        return receiverPhone;
    }

    public void setReceiverPhone(String receiverPhone) {
        this.receiverPhone = receiverPhone;
    }

    public String getReceiverPhoneMasked() {
        return receiverPhoneMasked;
    }

    public void setReceiverPhoneMasked(String receiverPhoneMasked) {
        this.receiverPhoneMasked = receiverPhoneMasked;
    }

    public String getMessageBody() {
        return messageBody;
    }

    public void setMessageBody(String messageBody) {
        this.messageBody = messageBody;
    }

    public String getMessagePrefix() {
        return messagePrefix;
    }

    public void setMessagePrefix(String messagePrefix) {
        this.messagePrefix = messagePrefix;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(String expiresAt) {
        this.expiresAt = expiresAt;
    }
}
