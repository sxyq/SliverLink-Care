package com.silverlink.care.module.qrcode;

public class QrCodeEntity {
    private String id;
    private String qrId;
    private String elderId;
    private String archiveNo;
    private String elderName;
    private Integer elderAge;
    private String elderPhone;
    private String qrToken;
    private String qrTokenHash;
    private String status;
    private String keyId;
    private String createdAt;
    private String disabledAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getQrId() { return qrId; }
    public void setQrId(String qrId) { this.qrId = qrId; }
    public String getElderId() { return elderId; }
    public void setElderId(String elderId) { this.elderId = elderId; }
    public String getArchiveNo() { return archiveNo; }
    public void setArchiveNo(String archiveNo) { this.archiveNo = archiveNo; }
    public String getElderName() { return elderName; }
    public void setElderName(String elderName) { this.elderName = elderName; }
    public Integer getElderAge() { return elderAge; }
    public void setElderAge(Integer elderAge) { this.elderAge = elderAge; }
    public String getElderPhone() { return elderPhone; }
    public void setElderPhone(String elderPhone) { this.elderPhone = elderPhone; }
    public String getQrToken() { return qrToken; }
    public void setQrToken(String qrToken) { this.qrToken = qrToken; }
    public String getQrTokenHash() { return qrTokenHash; }
    public void setQrTokenHash(String qrTokenHash) { this.qrTokenHash = qrTokenHash; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getKeyId() { return keyId; }
    public void setKeyId(String keyId) { this.keyId = keyId; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
    public String getDisabledAt() { return disabledAt; }
    public void setDisabledAt(String disabledAt) { this.disabledAt = disabledAt; }
}
