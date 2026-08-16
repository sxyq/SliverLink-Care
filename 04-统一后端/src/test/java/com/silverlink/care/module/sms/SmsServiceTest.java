package com.silverlink.care.module.sms;

import com.silverlink.care.common.BizException;
import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class SmsServiceTest {

    private JdbcTemplate jdbc;
    private SilverLinkDataService data;
    private SmsProvider smsProvider;
    private SmsService service;

    @BeforeEach
    void setUp() throws Exception {
        jdbc = mock(JdbcTemplate.class);
        data = mock(SilverLinkDataService.class);
        smsProvider = mock(SmsProvider.class);
        service = new SmsService(jdbc, data, smsProvider);
        when(data.hash(anyString())).thenAnswer(inv -> "hash-" + inv.getArgument(0));
        when(data.str(any())).thenAnswer(inv -> {
            Object arg = inv.getArgument(0);
            return arg == null ? "" : arg.toString();
        });
        when(data.intValue(any())).thenReturn(0);
        var bypassField = SmsService.class.getDeclaredField("universalBypassCode");
        bypassField.setAccessible(true);
        bypassField.set(service, "");
        var maxAttemptsField = SmsService.class.getDeclaredField("maxAttempts");
        maxAttemptsField.setAccessible(true);
        maxAttemptsField.setInt(service, 5);
        var codeTtlField = SmsService.class.getDeclaredField("codeTtlSeconds");
        codeTtlField.setAccessible(true);
        codeTtlField.setLong(service, 300L);
    }

    @Test
    void sendCodeSendsAndInsertsRecord() {
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyString(), anyString(), any(Timestamp.class)))
                .thenReturn(0);

        String code = service.sendCode("13800001111");
        assertNotNull(code);
        assertEquals(6, code.length());
        verify(smsProvider).sendCode(eq("13800001111"), anyString());
        verify(jdbc).update(contains("insert into sms_code"), anyString(), anyString(), anyString(), anyString(), any(Timestamp.class));
    }

    @Test
    void sendCodeWithSceneSendsAndInsertsRecord() {
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyString(), anyString(), any(Timestamp.class)))
                .thenReturn(0);

        String code = service.sendCode("13800001111", "FAMILY");
        assertNotNull(code);
        verify(smsProvider).sendCode(eq("13800001111"), anyString());
    }

    @Test
    void sendCodeThrowsWhenTooFrequent() {
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyString(), anyString(), any(Timestamp.class)))
                .thenReturn(1);

        BizException exception = assertThrows(BizException.class, () -> service.sendCode("13800001111"));
        assertEquals(429, exception.getCode());
        assertEquals("errors.smsRateLimited", exception.getMessageKey());
    }

    @Test
    void verifyReturnsTrueWhenCodeMatches() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", "sms-1");
        row.put("code_hash", "hash-123456");
        row.put("expires_at", Timestamp.from(Instant.now().plusSeconds(300)));
        row.put("attempts", 0);
        when(jdbc.queryForList(anyString(), anyString(), anyString())).thenReturn(List.of(row));
        when(data.hash("123456")).thenReturn("hash-123456");

        assertTrue(service.verify("13800001111", "123456"));
        verify(jdbc).update(contains("delete from sms_code"), eq("sms-1"));
    }

    @Test
    void verifyReturnsFalseWhenNoRecord() {
        when(jdbc.queryForList(anyString(), anyString(), anyString())).thenReturn(Collections.emptyList());
        assertFalse(service.verify("13800001111", "123456"));
    }

    @Test
    void verifyReturnsFalseWhenExpired() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", "sms-2");
        row.put("code_hash", "hash-123456");
        row.put("expires_at", Timestamp.from(Instant.now().minusSeconds(10)));
        row.put("attempts", 0);
        when(jdbc.queryForList(anyString(), anyString(), anyString())).thenReturn(List.of(row));

        assertFalse(service.verify("13800001111", "123456"));
        verify(jdbc).update(contains("delete from sms_code"), eq("sms-2"));
    }

    @Test
    void verifyReturnsFalseWhenMaxAttemptsExceeded() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", "sms-3");
        row.put("code_hash", "hash-123456");
        row.put("expires_at", Timestamp.from(Instant.now().plusSeconds(300)));
        row.put("attempts", 5);
        when(jdbc.queryForList(anyString(), anyString(), anyString())).thenReturn(List.of(row));
        when(data.intValue(any())).thenReturn(5);

        assertFalse(service.verify("13800001111", "123456"));
        verify(jdbc).update(contains("delete from sms_code"), eq("sms-3"));
    }

    @Test
    void verifyIncrementsAttemptsOnWrongCode() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", "sms-4");
        row.put("code_hash", "hash-123456");
        row.put("expires_at", Timestamp.from(Instant.now().plusSeconds(300)));
        row.put("attempts", 0);
        when(jdbc.queryForList(anyString(), anyString(), anyString())).thenReturn(List.of(row));
        when(data.hash("000000")).thenReturn("hash-000000");

        assertFalse(service.verify("13800001111", "000000"));
        verify(jdbc).update(contains("update sms_code set attempts=attempts+1"), eq("sms-4"));
    }

    @Test
    void verifyWithSceneReturnsTrueWhenCodeMatches() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", "sms-5");
        row.put("code_hash", "hash-654321");
        row.put("expires_at", Timestamp.from(Instant.now().plusSeconds(300)));
        row.put("attempts", 0);
        when(jdbc.queryForList(anyString(), anyString(), anyString())).thenReturn(List.of(row));
        when(data.hash("654321")).thenReturn("hash-654321");

        assertTrue(service.verify("13800001111", "654321", "FAMILY"));
    }

    @Test
    void verifyReturnsTrueForUniversalBypassCode() {
        var field = Arrays.stream(SmsService.class.getDeclaredFields())
                .filter(f -> f.getName().equals("universalBypassCode"))
                .findFirst();
        assertTrue(field.isPresent());
        field.get().setAccessible(true);
        try {
            field.get().set(service, "BYPASS");
        } catch (IllegalAccessException e) {
            fail("Cannot set universalBypassCode");
        }

        assertTrue(service.verify("13800001111", "BYPASS"));
    }
}
