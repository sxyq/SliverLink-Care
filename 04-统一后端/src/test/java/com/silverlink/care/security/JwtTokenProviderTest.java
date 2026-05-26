package com.silverlink.care.security;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    @Test
    void generatesAndParsesToken() {
        JwtTokenProvider provider = provider();

        String token = provider.generateToken("admin", "SYSTEM_ADMIN", 60_000L);

        assertTrue(provider.validateToken(token));
        assertEquals("admin", provider.getSubject(token));
        assertEquals("SYSTEM_ADMIN", provider.getRole(token));
    }

    @Test
    void rejectsInvalidToken() {
        JwtTokenProvider provider = provider();

        assertFalse(provider.validateToken("not-a-token"));
    }

    private static JwtTokenProvider provider() {
        JwtTokenProvider provider = new JwtTokenProvider();
        ReflectionTestUtils.setField(
                provider,
                "jwtSecret",
                "test-jwt-secret-key-2026-silverlink-care-must-be-32-bytes!!"
        );
        return provider;
    }
}
