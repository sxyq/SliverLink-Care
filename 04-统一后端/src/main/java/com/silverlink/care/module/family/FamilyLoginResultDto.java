package com.silverlink.care.module.family;

public class FamilyLoginResultDto {
    private Boolean ok;
    private String token;
    private String message;

    public FamilyLoginResultDto() {}

    public FamilyLoginResultDto(Boolean ok, String token, String message) {
        this.ok = ok;
        this.token = token;
        this.message = message;
    }

    public Boolean getOk() { return ok; }
    public void setOk(Boolean ok) { this.ok = ok; }
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
