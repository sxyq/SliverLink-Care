package com.silverlink.care.module.audit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Locale;

@Component
public class AuditIpHasher {

    private static final String ALGORITHM = "HmacSHA256";

    private final byte[] key;
    private final int keyVersion;

    public AuditIpHasher(
            @Value("${silverlink.audit.ip-hmac-key-base64:${silverlink.security.aes-key-base64:}}") String keyBase64,
            @Value("${silverlink.audit.ip-hmac-key-version:1}") int keyVersion
    ) {
        try {
            this.key = Base64.getDecoder().decode(keyBase64 == null ? "" : keyBase64.trim());
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException("审计 IP HMAC 密钥不是有效的 Base64", exception);
        }
        if (key.length < 32) {
            throw new IllegalStateException("审计 IP HMAC 密钥至少需要 32 字节");
        }
        if (keyVersion < 1) {
            throw new IllegalStateException("审计 IP HMAC 密钥版本必须大于 0");
        }
        this.keyVersion = keyVersion;
    }

    public byte[] hash(String sourceIp) {
        try {
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(new SecretKeySpec(key, ALGORITHM));
            return mac.doFinal(normalize(sourceIp).getBytes(StandardCharsets.UTF_8));
        } catch (Exception exception) {
            throw new IllegalStateException("无法计算审计 IP HMAC", exception);
        }
    }

    public int keyVersion() {
        return keyVersion;
    }

    private String normalize(String sourceIp) {
        return sourceIp == null ? "" : sourceIp.trim().toLowerCase(Locale.ROOT);
    }
}
