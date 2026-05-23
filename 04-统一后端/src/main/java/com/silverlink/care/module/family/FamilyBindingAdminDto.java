package com.silverlink.care.module.family;

public class FamilyBindingAdminDto {
    private String id;
    private String familyName;
    private String familyPhoneMasked;
    private String relationship;
    private String elderName;
    private String elderArchiveNo;
    private String invitationCode;
    private String boundAt;
    private String status;

    public FamilyBindingAdminDto() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getFamilyName() { return familyName; }
    public void setFamilyName(String familyName) { this.familyName = familyName; }
    public String getFamilyPhoneMasked() { return familyPhoneMasked; }
    public void setFamilyPhoneMasked(String familyPhoneMasked) { this.familyPhoneMasked = familyPhoneMasked; }
    public String getRelationship() { return relationship; }
    public void setRelationship(String relationship) { this.relationship = relationship; }
    public String getElderName() { return elderName; }
    public void setElderName(String elderName) { this.elderName = elderName; }
    public String getElderArchiveNo() { return elderArchiveNo; }
    public void setElderArchiveNo(String elderArchiveNo) { this.elderArchiveNo = elderArchiveNo; }
    public String getInvitationCode() { return invitationCode; }
    public void setInvitationCode(String invitationCode) { this.invitationCode = invitationCode; }
    public String getBoundAt() { return boundAt; }
    public void setBoundAt(String boundAt) { this.boundAt = boundAt; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
