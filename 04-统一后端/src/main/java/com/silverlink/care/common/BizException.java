package com.silverlink.care.common;

public class BizException extends RuntimeException {
    private final int code;
    private final String messageKey;

    public BizException(int code, String message) {
        this(code, message, null);
    }

    public BizException(int code, String message, String messageKey) {
        super(message);
        this.code = code;
        this.messageKey = messageKey;
    }

    public int getCode() {
        return code;
    }

    public String getMessageKey() {
        return messageKey;
    }
}
