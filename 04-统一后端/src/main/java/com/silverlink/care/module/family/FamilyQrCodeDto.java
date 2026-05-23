package com.silverlink.care.module.family;

public class FamilyQrCodeDto {
    private String token;
    private String status;
    private String createdAt;
    private String pdfUrl;

    public FamilyQrCodeDto() {}

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
    public String getPdfUrl() { return pdfUrl; }
    public void setPdfUrl(String pdfUrl) { this.pdfUrl = pdfUrl; }
}
