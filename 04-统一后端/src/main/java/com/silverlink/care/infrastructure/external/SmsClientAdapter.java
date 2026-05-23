package com.silverlink.care.infrastructure.external;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class SmsClientAdapter {

    private static final Logger log = LoggerFactory.getLogger(SmsClientAdapter.class);

    public String sendCode(String phone, String code) {
        log.info("[SmsClientAdapter] 发送验证码 {} 到 {}", code, phone);
        return "success";
    }
}
