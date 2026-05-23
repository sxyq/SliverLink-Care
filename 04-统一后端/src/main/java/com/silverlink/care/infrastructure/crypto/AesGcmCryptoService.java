package com.silverlink.care.infrastructure.crypto;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

@Service
public class AesGcmCryptoService {

    private static final String ALGORITHM = "AES";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int IV_LENGTH = 12;
    private static final int TAG_LENGTH = 128;

    @Value("${silverlink.security.aes-key-id:demo-key-v1}")
    private String keyId;

    @Value("${silverlink.security.aes-key-base64:}")
    private String aesKeyBase64;

    private SecretKey secretKey() {
        byte[] key = Base64.getDecoder().decode(aesKeyBase64);
        return new SecretKeySpec(key, ALGORITHM);
    }

    public String encrypt(String plaintext) throws Exception {
        byte[] iv = new byte[IV_LENGTH];
        new SecureRandom().nextBytes(iv);
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.ENCRYPT_MODE, secretKey(), new GCMParameterSpec(TAG_LENGTH, iv));
        byte[] cipherText = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
        ByteBuffer bb = ByteBuffer.allocate(iv.length + cipherText.length);
        bb.put(iv);
        bb.put(cipherText);
        String combined = Base64.getUrlEncoder().withoutPadding().encodeToString(bb.array());
        return keyId + "." + combined;
    }

    public String decrypt(String token) throws Exception {
        int dot = token.indexOf('.');
        String payload = dot >= 0 ? token.substring(dot + 1) : token;
        byte[] decoded = Base64.getUrlDecoder().decode(payload);
        ByteBuffer bb = ByteBuffer.wrap(decoded);
        byte[] iv = new byte[IV_LENGTH];
        bb.get(iv);
        byte[] cipherText = new byte[bb.remaining()];
        bb.get(cipherText);
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.DECRYPT_MODE, secretKey(), new GCMParameterSpec(TAG_LENGTH, iv));
        byte[] plain = cipher.doFinal(cipherText);
        return new String(plain, StandardCharsets.UTF_8);
    }
}
