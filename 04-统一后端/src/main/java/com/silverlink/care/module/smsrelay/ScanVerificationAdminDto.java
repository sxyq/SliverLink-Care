package com.silverlink.care.module.smsrelay;

public class ScanVerificationAdminDto {

    private String sessionId;
    private String elderId;
    private String target;
    private String relayDeviceId;
    private String receiverPhone;
    private String messageBody;
    private String status;
    private String expiresAt;
    private boolean verified;
    private String verifiedAt;
    private String senderPhoneMasked;
    private String createdAt;

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getElderId() {
        return elderId;
    }

    public void setElderId(String elderId) {
        this.elderId = elderId;
    }

    public String getTarget() {
        return target;
    }

    public void setTarget(String target) {
        this.target = target;
    }

    public String getReceiverPhone() {
        return receiverPhone;
    }

    public String getRelayDeviceId() {
        return relayDeviceId;
    }

    public void setRelayDeviceId(String relayDeviceId) {
        this.relayDeviceId = relayDeviceId;
    }

    public void setReceiverPhone(String receiverPhone) {
        this.receiverPhone = receiverPhone;
    }

    public String getMessageBody() {
        return messageBody;
    }

    public void setMessageBody(String messageBody) {
        this.messageBody = messageBody;
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

    public boolean isVerified() {
        return verified;
    }

    public void setVerified(boolean verified) {
        this.verified = verified;
    }

    public String getVerifiedAt() {
        return verifiedAt;
    }

    public void setVerifiedAt(String verifiedAt) {
        this.verifiedAt = verifiedAt;
    }

    public String getSenderPhoneMasked() {
        return senderPhoneMasked;
    }

    public void setSenderPhoneMasked(String senderPhoneMasked) {
        this.senderPhoneMasked = senderPhoneMasked;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
}
