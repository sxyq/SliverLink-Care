package com.silverlink.care.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SignatureInterceptorTest {

    @Test
    void accepts_valid_signature() throws Exception {
        SignatureInterceptor interceptor = new SignatureInterceptor();
        ReflectionTestUtils.setField(interceptor, "adminSignatureSecret", "test-secret");
        ReflectionTestUtils.setField(interceptor, "signatureWindowSeconds", 300L);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod("GET");
        request.setRequestURI("/api/admin/elders");
        request.addHeader("X-Timestamp", String.valueOf(System.currentTimeMillis() / 1000));
        request.addHeader("X-Nonce", "nonce-1");
        request.addHeader("X-Signature", sign("GET\n/api/admin/elders\n" + request.getHeader("X-Timestamp") + "\nnonce-1", "test-secret"));

        MockHttpServletResponse response = new MockHttpServletResponse();

        assertTrue(interceptor.preHandle(request, response, new Object()));
    }

    @Test
    void rejects_invalid_signature() throws Exception {
        SignatureInterceptor interceptor = new SignatureInterceptor();
        ReflectionTestUtils.setField(interceptor, "adminSignatureSecret", "test-secret");
        ReflectionTestUtils.setField(interceptor, "signatureWindowSeconds", 300L);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod("GET");
        request.setRequestURI("/api/admin/elders");
        request.addHeader("X-Timestamp", String.valueOf(System.currentTimeMillis() / 1000));
        request.addHeader("X-Nonce", "nonce-2");
        request.addHeader("X-Signature", "bad-signature");

        MockHttpServletResponse response = new MockHttpServletResponse();

        assertFalse(interceptor.preHandle(request, response, new Object()));
        org.junit.jupiter.api.Assertions.assertEquals(400, response.getStatus());
    }

    private static String sign(String value, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] digest = mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
        StringBuilder builder = new StringBuilder(digest.length * 2);
        for (byte item : digest) {
            builder.append(String.format("%02x", item));
        }
        return builder.toString();
    }
}
