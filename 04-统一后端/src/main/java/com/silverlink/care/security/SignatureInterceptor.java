package com.silverlink.care.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SignatureInterceptor implements HandlerInterceptor {

    @Value("${silverlink.security.signature-window-seconds:300}")
    private long signatureWindowSeconds;

    @Value("${silverlink.security.admin-signature-secret}")
    private String adminSignatureSecret;

    private final ConcurrentHashMap<String, Long> nonceStore = new ConcurrentHashMap<>();

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String timestamp = request.getHeader("X-Timestamp");
        String nonce = request.getHeader("X-Nonce");
        String signature = request.getHeader("X-Signature");

        if (timestamp == null || nonce == null || signature == null) {
            if (isHighRiskPath(request.getRequestURI())) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                response.getWriter().write("{\"code\":400,\"message\":\"missing signature headers\"}");
                return false;
            }
            return true;
        }

        long ts;
        try {
            ts = Long.parseLong(timestamp);
        } catch (NumberFormatException ex) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().write("{\"code\":400,\"message\":\"invalid timestamp\"}");
            return false;
        }
        long now = System.currentTimeMillis() / 1000;
        if (Math.abs(now - ts) > signatureWindowSeconds) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().write("{\"code\":400,\"message\":\"timestamp expired\"}");
            return false;
        }

        evictExpiredNonces(now);
        Long previous = nonceStore.putIfAbsent(nonce, ts);
        if (previous != null) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().write("{\"code\":400,\"message\":\"nonce already used\"}");
            return false;
        }

        String canonical = request.getMethod() + "\n" + request.getRequestURI() + "\n" + timestamp + "\n" + nonce;
        String expectedSignature = hmacSha256Hex(canonical, adminSignatureSecret);
        if (!MessageDigest.isEqual(expectedSignature.getBytes(StandardCharsets.UTF_8), signature.getBytes(StandardCharsets.UTF_8))) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().write("{\"code\":400,\"message\":\"invalid signature\"}");
            return false;
        }

        return true;
    }

    private void evictExpiredNonces(long nowSeconds) {
        for (Map.Entry<String, Long> entry : nonceStore.entrySet()) {
            if (Math.abs(nowSeconds - entry.getValue()) > signatureWindowSeconds) {
                nonceStore.remove(entry.getKey(), entry.getValue());
            }
        }
    }

    private String hmacSha256Hex(String value, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] digest = mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
        StringBuilder builder = new StringBuilder(digest.length * 2);
        for (byte item : digest) {
            builder.append(String.format("%02x", item));
        }
        return builder.toString();
    }

    private boolean isHighRiskPath(String uri) {
        return uri.contains("/admin/") || uri.contains("/qrcodes/");
    }
}
