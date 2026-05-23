package com.silverlink.care.security;

public class CurrentUser {
    private String userId;
    private String account;
    private String role;

    public CurrentUser(String userId, String account, String role) {
        this.userId = userId;
        this.account = account;
        this.role = role;
    }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getAccount() { return account; }
    public void setAccount(String account) { this.account = account; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}
