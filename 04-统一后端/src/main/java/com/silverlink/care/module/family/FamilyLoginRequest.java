package com.silverlink.care.module.family;

public class FamilyLoginRequest {
    private String phone;
    private String password;

    public FamilyLoginRequest() {}

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
