package com.silverlink.care.module.audit;

public class AuditLogEntity {
    private String id;
    private String operator;
    private String role;
    private String time;
    private String sourceIp;
    private String target;
    private String action;
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
    public String getResult() { return result; }
    public void setResult(String result) { this.result = result; }
    public String getFailReason() { return failReason; }
    public void setFailReason(String failReason) { this.failReason = failReason; }
    public String getRequestId() { return requestId; }
    public void setRequestId(String requestId) { this.requestId = requestId; }
}
