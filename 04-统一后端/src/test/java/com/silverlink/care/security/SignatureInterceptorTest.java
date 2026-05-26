package com.silverlink.care.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SignatureInterceptorTest {

    @Test
    void allowsLowRiskRequestsWithoutSignatureHeaders() throws Exception {
        SignatureInterceptor interceptor = interceptor();
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/scan/resolve");
        MockHttpServletResponse response = new MockHttpServletResponse();

        assertTrue(interceptor.preHandle(request, response, new Object()));
        assertEquals(200, response.getStatus());
    }

    @Test
    void rejectsHighRiskRequestsWithoutSignatureHeaders() throws Exception {
        SignatureInterceptor interceptor = interceptor();
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/admin/elders");
        MockHttpServletResponse response = new MockHttpServletResponse();

        assertFalse(interceptor.preHandle(request, response, new Object()));
        assertEquals(400, response.getStatus());
        assertTrue(response.getContentAsString().contains("missing signature headers"));
    }

    @Test
    void validatesSignatureAndRejectsNonceReplay() throws Exception {
        SignatureInterceptor interceptor = interceptor();
        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
        MockHttpServletRequest request = signedRequest("GET", "/api/admin/elders", timestamp, "nonce-1", "secret-1");
        MockHttpServletResponse response = new MockHttpServletResponse();

        assertTrue(interceptor.preHandle(request, response, new Object()));

        MockHttpServletResponse replayResponse = new MockHttpServletResponse();
        assertFalse(interceptor.preHandle(request, replayResponse, new Object()));
        assertTrue(replayResponse.getContentAsString().contains("nonce already used"));
    }

    @Test
    void rejectsInvalidTimestampExpiredTimestampAndInvalidSignature() throws Exception {
        SignatureInterceptor interceptor = interceptor();

        MockHttpServletRequest invalidTimestamp = new MockHttpServletRequest("GET", "/api/admin/elders");
        invalidTimestamp.addHeader("X-Timestamp", "bad");
        invalidTimestamp.addHeader("X-Nonce", "nonce-bad");
        invalidTimestamp.addHeader("X-Signature", "signature");
        MockHttpServletResponse invalidTimestampResponse = new MockHttpServletResponse();
        assertFalse(interceptor.preHandle(invalidTimestamp, invalidTimestampResponse, new Object()));
        assertTrue(invalidTimestampResponse.getContentAsString().contains("invalid timestamp"));

        String expired = String.valueOf((System.currentTimeMillis() / 1000) - 1000);
        MockHttpServletResponse expiredResponse = new MockHttpServletResponse();
        assertFalse(interceptor.preHandle(signedRequest("GET", "/api/admin/elders", expired, "nonce-expired", "secret-1"), expiredResponse, new Object()));
        assertTrue(expiredResponse.getContentAsString().contains("timestamp expired"));

        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
        MockHttpServletResponse invalidSignatureResponse = new MockHttpServletResponse();
        assertFalse(interceptor.preHandle(signedRequest("GET", "/api/admin/elders", timestamp, "nonce-invalid", "wrong-secret"), invalidSignatureResponse, new Object()));
        assertTrue(invalidSignatureResponse.getContentAsString().contains("invalid signature"));
    }

    private static SignatureInterceptor interceptor() {
        SignatureInterceptor interceptor = new SignatureInterceptor();
        ReflectionTestUtils.setField(interceptor, "signatureWindowSeconds", 300L);
        ReflectionTestUtils.setField(interceptor, "adminSignatureSecret", "secret-1");
        return interceptor;
    }

    private static MockHttpServletRequest signedRequest(
            String method,
            String uri,
            String timestamp,
            String nonce,
            String secret
    ) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(method, uri);
        request.addHeader("X-Timestamp", timestamp);
        request.addHeader("X-Nonce", nonce);
        request.addHeader("X-Signature", hmacSha256Hex(method + "\n" + uri + "\n" + timestamp + "\n" + nonce, secret));
        return request;
    }

    private static String hmacSha256Hex(String value, String secret) throws Exception {
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
