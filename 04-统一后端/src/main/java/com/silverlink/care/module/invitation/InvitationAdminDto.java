package com.silverlink.care.module.invitation;

public class InvitationAdminDto {
    private String id;
    private String code;
    private String elderName;
    private String archiveNo;
    private String expiresAt;
    private Integer maxUses;
    private Integer usedCount;
    private String status;
    private String createdAt;

    public InvitationAdminDto() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getElderName() { return elderName; }
    public void setElderName(String elderName) { this.elderName = elderName; }
    public String getArchiveNo() { return archiveNo; }
    public void setArchiveNo(String archiveNo) { this.archiveNo = archiveNo; }
    public String getExpiresAt() { return expiresAt; }
    public void setExpiresAt(String expiresAt) { this.expiresAt = expiresAt; }
    public Integer getMaxUses() { return maxUses; }
    public void setMaxUses(Integer maxUses) { this.maxUses = maxUses; }
    public Integer getUsedCount() { return usedCount; }
    public void setUsedCount(Integer usedCount) { this.usedCount = usedCount; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
