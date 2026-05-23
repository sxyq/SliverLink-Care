package com.silverlink.care.module.invitation;

public class RegisterRequest {
    private String name;
    private String phone;
    private String relationship;
    private String password;
    private String smsCode;

    public RegisterRequest() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getRelationship() { return relationship; }
    public void setRelationship(String relationship) { this.relationship = relationship; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getSmsCode() { return smsCode; }
    public void setSmsCode(String smsCode) { this.smsCode = smsCode; }
}
