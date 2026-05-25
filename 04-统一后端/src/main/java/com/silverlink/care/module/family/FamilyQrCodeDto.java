package com.silverlink.care.module.family;

public class FamilyQrCodeDto {
    private String token;
    private String status;
    private String createdAt;
    private String pdfUrl;
    private String disableReviewStatus;
    private String disableReviewId;
    private String reviewMessage;

    public FamilyQrCodeDto() {}

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
    public String getPdfUrl() { return pdfUrl; }
    public void setPdfUrl(String pdfUrl) { this.pdfUrl = pdfUrl; }
    public String getDisableReviewStatus() { return disableReviewStatus; }
    public void setDisableReviewStatus(String disableReviewStatus) { this.disableReviewStatus = disableReviewStatus; }
    public String getDisableReviewId() { return disableReviewId; }
    public void setDisableReviewId(String disableReviewId) { this.disableReviewId = disableReviewId; }
    public String getReviewMessage() { return reviewMessage; }
    public void setReviewMessage(String reviewMessage) { this.reviewMessage = reviewMessage; }
}
