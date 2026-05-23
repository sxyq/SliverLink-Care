package com.silverlink.care.module.invitation;

public class CreateInvitationRequest {
    private String elderId;
    private Integer expiresInDays = 7;
    private Integer maxUses = 1;

    public CreateInvitationRequest() {}

    public String getElderId() { return elderId; }
    public void setElderId(String elderId) { this.elderId = elderId; }
    public Integer getExpiresInDays() { return expiresInDays; }
    public void setExpiresInDays(Integer expiresInDays) { this.expiresInDays = expiresInDays; }
    public Integer getMaxUses() { return maxUses; }
    public void setMaxUses(Integer maxUses) { this.maxUses = maxUses; }
}
