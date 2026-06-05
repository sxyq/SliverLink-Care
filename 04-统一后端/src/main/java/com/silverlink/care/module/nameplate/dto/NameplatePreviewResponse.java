package com.silverlink.care.module.nameplate.dto;

public class NameplatePreviewResponse {
    private String elderId;
    private String archiveNo;
    private String frontName;
    private String frontAge;
    private String frontPhone;
    private String backQrToken;
    private String backQrUrl;
    private String backQrPayload;
    private String backQrImageBase64;
    private String backArchiveNo;
    private String backHint;
    private String pdfPreviewImageBase64;
    private boolean blankTemplate;

    public String getElderId() { return elderId; }
    public void setElderId(String elderId) { this.elderId = elderId; }
    public String getArchiveNo() { return archiveNo; }
    public void setArchiveNo(String archiveNo) { this.archiveNo = archiveNo; }
    public String getFrontName() { return frontName; }
    public void setFrontName(String frontName) { this.frontName = frontName; }
    public String getFrontAge() { return frontAge; }
    public void setFrontAge(String frontAge) { this.frontAge = frontAge; }
    public String getFrontPhone() { return frontPhone; }
    public void setFrontPhone(String frontPhone) { this.frontPhone = frontPhone; }
    public String getBackQrToken() { return backQrToken; }
    public void setBackQrToken(String backQrToken) { this.backQrToken = backQrToken; }
    public String getBackQrUrl() { return backQrUrl; }
    public void setBackQrUrl(String backQrUrl) { this.backQrUrl = backQrUrl; }
    public String getBackQrPayload() { return backQrPayload; }
    public void setBackQrPayload(String backQrPayload) { this.backQrPayload = backQrPayload; }
    public String getBackQrImageBase64() { return backQrImageBase64; }
    public void setBackQrImageBase64(String backQrImageBase64) { this.backQrImageBase64 = backQrImageBase64; }
    public String getBackArchiveNo() { return backArchiveNo; }
    public void setBackArchiveNo(String backArchiveNo) { this.backArchiveNo = backArchiveNo; }
    public String getBackHint() { return backHint; }
    public void setBackHint(String backHint) { this.backHint = backHint; }
    public String getPdfPreviewImageBase64() { return pdfPreviewImageBase64; }
    public void setPdfPreviewImageBase64(String pdfPreviewImageBase64) { this.pdfPreviewImageBase64 = pdfPreviewImageBase64; }
    public boolean isBlankTemplate() { return blankTemplate; }
    public void setBlankTemplate(boolean blankTemplate) { this.blankTemplate = blankTemplate; }
}
