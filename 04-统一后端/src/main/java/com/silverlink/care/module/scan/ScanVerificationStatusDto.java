package com.silverlink.care.module.scan;

public class ScanVerificationStatusDto {
    private String sessionId;
    private String elderId;
    private String status;
    private boolean verified;
    private String verifiedAt;
    private String senderPhoneMasked;

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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
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
}
