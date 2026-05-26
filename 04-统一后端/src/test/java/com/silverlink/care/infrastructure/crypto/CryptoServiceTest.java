package com.silverlink.care.infrastructure.crypto;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.security.SecureRandom;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CryptoServiceTest {

    @Test
    void sha256ReturnsStableUrlSafeDigest() {
        HashService service = new HashService();

        String first = service.sha256("elder-001");
        String second = service.sha256("elder-001");

        assertEquals(first, second);
        assertNotEquals(first, service.sha256("elder-002"));
        assertTrue(first.matches("[A-Za-z0-9_-]+"));
    }

    @Test
    void aesGcmEncryptsWithKeyPrefixAndDecryptsRoundTrip() throws Exception {
        byte[] key = new byte[16];
        new SecureRandom(new byte[] {1, 2, 3, 4}).nextBytes(key);
        AesGcmCryptoService service = new AesGcmCryptoService();
        ReflectionTestUtils.setField(service, "keyId", "test-key");
        ReflectionTestUtils.setField(service, "aesKeyBase64", Base64.getEncoder().encodeToString(key));

        String token = service.encrypt("elder-001");

        assertTrue(token.startsWith("test-key."));
        assertEquals("elder-001", service.decrypt(token));
        assertEquals("elder-001", service.decrypt(token.substring("test-key.".length())));
    }
}
