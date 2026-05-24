package com.silverlink.care.module.smsrelay;

public record RelaySignatureHeaders(
        String timestamp,
        String nonce,
        String signature
) {
}
