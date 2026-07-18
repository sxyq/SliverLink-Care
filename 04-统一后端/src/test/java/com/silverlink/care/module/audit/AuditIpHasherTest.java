package com.silverlink.care.module.audit;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.*;

class AuditIpHasherTest {

    private static final String KEY = Base64.getEncoder().encodeToString(
            "0123456789abcdef0123456789abcdef".getBytes(StandardCharsets.UTF_8));

    @Test
    void hashesNormalizedIpWithoutExposingPlaintext() {
        AuditIpHasher hasher = new AuditIpHasher(KEY, 3);

        byte[] first = hasher.hash(" 2001:DB8::1 ");
        byte[] second = hasher.hash("2001:db8::1");

        assertArrayEquals(first, second);
        assertEquals(32, first.length);
        assertFalse(new String(first, StandardCharsets.UTF_8).contains("2001"));
        assertEquals(3, hasher.keyVersion());
    }

    @Test
    void rejectsShortOrInvalidKeys() {
        assertThrows(IllegalStateException.class, () -> new AuditIpHasher("not-base64", 1));
        String shortKey = Base64.getEncoder().encodeToString("short".getBytes(StandardCharsets.UTF_8));
        assertThrows(IllegalStateException.class, () -> new AuditIpHasher(shortKey, 1));
    }
}
