package com.silverlink.care.module.audit;

public class AuditLogEntity {
    private String id;
    private String operator;
    private String role;
    private String time;
    private String sourceIp;
    private String target;
    private String action;
    private String verificationMethod;
    private String visitorName;
    private String visitorPhone;
    private String visitorPhoneMasked;
    private String visitorIdCard;
    private String visitorIdCardMasked;
    private String result;
    private String failReason;
    private String requestId;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getOperator() { return operator; }
    public void setOperator(String operator) { this.operator = operator; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }
    public String getSourceIp() { return sourceIp; }
    public void setSourceIp(String sourceIp) { this.sourceIp = sourceIp; }
    public String getTarget() { return target; }
    public void setTarget(String target) { this.target = target; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getVerificationMethod() { return verificationMethod; }
    public void setVerificationMethod(String verificationMethod) { this.verificationMethod = verificationMethod; }
    public String getVisitorName() { return visitorName; }
    public void setVisitorName(String visitorName) { this.visitorName = visitorName; }
    public String getVisitorPhone() { return visitorPhone; }
    public void setVisitorPhone(String visitorPhone) { this.visitorPhone = visitorPhone; }
    public String getVisitorPhoneMasked() { return visitorPhoneMasked; }
    public void setVisitorPhoneMasked(String visitorPhoneMasked) { this.visitorPhoneMasked = visitorPhoneMasked; }
    public String getVisitorIdCard() { return visitorIdCard; }
    public void setVisitorIdCard(String visitorIdCard) { this.visitorIdCard = visitorIdCard; }
    public String getVisitorIdCardMasked() { return visitorIdCardMasked; }
    public void setVisitorIdCardMasked(String visitorIdCardMasked) { this.visitorIdCardMasked = visitorIdCardMasked; }
    public String getResult() { return result; }
    public void setResult(String result) { this.result = result; }
    public String getFailReason() { return failReason; }
    public void setFailReason(String failReason) { this.failReason = failReason; }
    public String getRequestId() { return requestId; }
    public void setRequestId(String requestId) { this.requestId = requestId; }
}
