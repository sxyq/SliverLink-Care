package com.silverlink.care.common;

public class ApiResponse<T> {
    private int code;
    private String message;
    private String messageKey;
    private T data;

    public ApiResponse() {}

    public ApiResponse(int code, String message, T data) {
        this(code, message, null, data);
    }

    public ApiResponse(int code, String message, String messageKey, T data) {
        this.code = code;
        this.message = message;
        this.messageKey = messageKey;
        this.data = data;
    }

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(200, "success", data);
    }

    public static <T> ApiResponse<T> ok() {
        return new ApiResponse<>(200, "success", null);
    }

    public static <T> ApiResponse<T> fail(int code, String message) {
        return new ApiResponse<>(code, message, null, null);
    }

    public static <T> ApiResponse<T> fail(int code, String message, String messageKey) {
        return new ApiResponse<>(code, message, messageKey, null);
    }

    public int getCode() { return code; }
    public void setCode(int code) { this.code = code; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getMessageKey() { return messageKey; }
    public void setMessageKey(String messageKey) { this.messageKey = messageKey; }
    public T getData() { return data; }
    public void setData(T data) { this.data = data; }
}
