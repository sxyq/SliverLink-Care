package com.silverlink.care.infrastructure.external;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class SmsClientAdapterTest {

    private final SmsClientAdapter adapter = new SmsClientAdapter();

    @Test
    void sendCode_returnsSuccess() {
        String result = adapter.sendCode("13800138000", "123456");

        assertEquals("success", result);
    }

    @Test
    void sendCode_differentPhone_returnsSuccess() {
        String result = adapter.sendCode("13900139000", "654321");

        assertEquals("success", result);
    }

    @Test
    void sendCode_differentCode_returnsSuccess() {
        String result = adapter.sendCode("13800138000", "000000");

        assertEquals("success", result);
    }

    @Test
    void sendCode_doesNotThrow() {
        assertDoesNotThrow(() -> adapter.sendCode("13800138000", "123456"));
    }

    @Test
    void sendCode_emptyPhone_returnsSuccess() {
        String result = adapter.sendCode("", "123456");

        assertEquals("success", result);
    }

    @Test
    void sendCode_emptyCode_returnsSuccess() {
        String result = adapter.sendCode("13800138000", "");

        assertEquals("success", result);
    }
}
