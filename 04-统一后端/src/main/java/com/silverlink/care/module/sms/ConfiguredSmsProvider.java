package com.silverlink.care.module.sms;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ConfiguredSmsProvider implements SmsProvider {

    @Value("${silverlink.sms.provider:configured}")
    private String provider;

    @Value("${silverlink.sms.access-key:}")
    private String accessKey;

    @Value("${silverlink.sms.secret:}")
    private String secret;

    @Value("${silverlink.sms.sign-name:}")
    private String signName;

    @Value("${silverlink.sms.template-code:}")
    private String templateCode;

    @Override
    public void sendCode(String phone, String code) {
        if (accessKey.isBlank() || secret.isBlank() || signName.isBlank() || templateCode.isBlank()) {
            throw new RuntimeException("短信服务未配置");
        }
        // The adapter boundary is ready for Aliyun/Tencent SDK wiring. Credentials
        // are deliberately required so production does not silently use mock SMS.
        throw new RuntimeException("短信服务商适配器未启用：" + provider);
    }
}
