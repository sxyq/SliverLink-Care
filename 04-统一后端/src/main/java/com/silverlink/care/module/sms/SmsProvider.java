package com.silverlink.care.module.sms;

public interface SmsProvider {
    void sendCode(String phone, String code);
}
