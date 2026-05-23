package com.silverlink.care.module.invitation;

public class InvitationPreviewDto {
    private String code;
    private String elderName;
    private Integer elderAge;
    private String elderArchiveNo;
    private String status;
    private String expiresAt;
    private Integer maxUses;
    private Integer usedCount;

    public InvitationPreviewDto() {}

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getElderName() { return elderName; }
    public void setElderName(String elderName) { this.elderName = elderName; }
    public Integer getElderAge() { return elderAge; }
    public void setElderAge(Integer elderAge) { this.elderAge = elderAge; }
    public String getElderArchiveNo() { return elderArchiveNo; }
    public void setElderArchiveNo(String elderArchiveNo) { this.elderArchiveNo = elderArchiveNo; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getExpiresAt() { return expiresAt; }
    public void setExpiresAt(String expiresAt) { this.expiresAt = expiresAt; }
    public Integer getMaxUses() { return maxUses; }
    public void setMaxUses(Integer maxUses) { this.maxUses = maxUses; }
    public Integer getUsedCount() { return usedCount; }
    public void setUsedCount(Integer usedCount) { this.usedCount = usedCount; }
}
