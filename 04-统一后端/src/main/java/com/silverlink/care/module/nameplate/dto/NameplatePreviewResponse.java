package com.silverlink.care.module.nameplate.dto;

public class NameplatePreviewResponse {
    private String elderId;
    private String archiveNo;
    private String frontName;
    private String frontAge;
    private String frontPhone;
    private String backQrToken;
    private String backArchiveNo;
    private String backHint;
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
    public String getBackArchiveNo() { return backArchiveNo; }
    public void setBackArchiveNo(String backArchiveNo) { this.backArchiveNo = backArchiveNo; }
    public String getBackHint() { return backHint; }
    public void setBackHint(String backHint) { this.backHint = backHint; }
    public boolean isBlankTemplate() { return blankTemplate; }
    public void setBlankTemplate(boolean blankTemplate) { this.blankTemplate = blankTemplate; }
}
