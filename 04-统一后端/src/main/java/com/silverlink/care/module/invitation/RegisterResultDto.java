package com.silverlink.care.module.invitation;

public class RegisterResultDto {
    private Boolean ok;
    private String token;
    private String message;
    private String messageKey;

    public RegisterResultDto() {}

    public RegisterResultDto(Boolean ok, String token, String message) {
        this(ok, token, message, null);
    }

    public RegisterResultDto(Boolean ok, String token, String message, String messageKey) {
        this.ok = ok;
        this.token = token;
        this.message = message;
        this.messageKey = messageKey;
    }

    public Boolean getOk() { return ok; }
    public boolean isSuccess() { return Boolean.TRUE.equals(ok); }
    public void setOk(Boolean ok) { this.ok = ok; }
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getMessageKey() { return messageKey; }
    public void setMessageKey(String messageKey) { this.messageKey = messageKey; }
}
