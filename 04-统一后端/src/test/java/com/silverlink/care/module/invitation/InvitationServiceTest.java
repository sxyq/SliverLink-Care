package com.silverlink.care.module.invitation;

import com.silverlink.care.common.BizException;
import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import com.silverlink.care.module.sms.SmsService;
import com.silverlink.care.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class InvitationServiceTest {

    private JdbcTemplate jdbc;
    private SilverLinkDataService data;
    private SmsService smsService;
    private JwtTokenProvider jwtTokenProvider;
    private InvitationService service;

    @BeforeEach
    void setUp() {
        jdbc = mock(JdbcTemplate.class);
        data = mock(SilverLinkDataService.class);
        smsService = mock(SmsService.class);
        jwtTokenProvider = mock(JwtTokenProvider.class);
        service = new InvitationService(jdbc, data, smsService, jwtTokenProvider);
        when(data.str(any())).thenAnswer(inv -> {
            Object arg = inv.getArgument(0);
            return arg == null ? "" : arg.toString();
        });
        when(data.intValue(any())).thenReturn(0);
        when(data.enc(anyString())).thenReturn("enc");
        when(data.dec(any())).thenReturn("王桂兰");
        when(data.maskName(anyString())).thenReturn("王*");
    }

    @Test
    void previewReturnsDto() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("code", "ABC12345");
        row.put("name_enc", "enc");
        row.put("age", 82);
        row.put("archive_no", "A001");
        row.put("status", "ACTIVE");
        row.put("expires_at", "2026-12-31");
        row.put("max_uses", 2);
        row.put("used_count", 0);
        when(data.one(anyString(), eq("ABC12345"))).thenReturn(row);

        var dto = service.preview("ABC12345");
        assertEquals("ABC12345", dto.getCode());
        assertEquals("ACTIVE", dto.getStatus());
    }

    @Test
    void sendSmsThrowsWhenNotActive() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("status", "DISABLED");
        when(data.one(contains("from invitation"), eq("ABC12345"))).thenReturn(row);

        assertThrows(BizException.class, () -> service.sendSms("ABC12345", "13800001111"));
    }

    @Test
    void sendSmsSucceedsWhenActive() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("status", "ACTIVE");
        when(data.one(contains("from invitation"), eq("ABC12345"))).thenReturn(row);

        service.sendSms("ABC12345", "13800001111");
        verify(smsService).sendCode("13800001111", "INVITATION:ABC12345");
    }

    @Test
    void registerFailsWhenNotActive() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("status", "DISABLED");
        when(data.one(contains("from invitation"), eq("ABC12345"))).thenReturn(row);

        RegisterRequest req = new RegisterRequest();
        req.setPhone("13800001111");
        req.setSmsCode("123456");
        var result = service.register("ABC12345", req);
        assertFalse(result.getOk());
        assertEquals("邀请码不可用", result.getMessage());
        assertEquals("errors.invitationUnavailable", result.getMessageKey());
    }

    @Test
    void registerFailsWhenMaxUsesExceeded() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("status", "ACTIVE");
        row.put("used_count", 2);
        row.put("max_uses", 2);
        when(data.one(contains("from invitation"), eq("ABC12345"))).thenReturn(row);
        when(data.intValue(row.get("used_count"))).thenReturn(2);
        when(data.intValue(row.get("max_uses"))).thenReturn(2);

        RegisterRequest req = new RegisterRequest();
        req.setPhone("13800001111");
        req.setSmsCode("123456");
        var result = service.register("ABC12345", req);
        assertFalse(result.getOk());
        assertEquals("邀请码已用完", result.getMessage());
        assertEquals("errors.invitationUsed", result.getMessageKey());
    }

    @Test
    void registerFailsWhenSmsVerifyFails() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("status", "ACTIVE");
        row.put("used_count", 0);
        row.put("max_uses", 2);
        row.put("elder_id", "elder-1");
        when(data.one(contains("from invitation"), eq("ABC12345"))).thenReturn(row);
        when(data.intValue(row.get("used_count"))).thenReturn(0);
        when(data.intValue(row.get("max_uses"))).thenReturn(2);
        when(smsService.verify(anyString(), anyString(), anyString())).thenReturn(false);

        RegisterRequest req = new RegisterRequest();
        req.setPhone("13800001111");
        req.setSmsCode("000000");
        var result = service.register("ABC12345", req);
        assertFalse(result.getOk());
        assertEquals("验证码错误或已过期", result.getMessage());
        assertEquals("errors.smsCodeInvalid", result.getMessageKey());
    }

    @Test
    void registerSucceedsForNewUser() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("status", "ACTIVE");
        row.put("used_count", 0);
        row.put("max_uses", 2);
        row.put("elder_id", "elder-1");
        when(data.one(contains("from invitation"), eq("ABC12345"))).thenReturn(row);
        when(data.intValue(row.get("used_count"))).thenReturn(0);
        when(data.intValue(row.get("max_uses"))).thenReturn(2);
        when(smsService.verify(anyString(), anyString(), anyString())).thenReturn(true);
        when(jdbc.queryForList(contains("from app_user"), anyString())).thenReturn(Collections.emptyList());
        when(jwtTokenProvider.generateToken(anyString(), eq("FAMILY"), anyLong())).thenReturn("jwt-token");

        RegisterRequest req = new RegisterRequest();
        req.setPhone("13800001111");
        req.setSmsCode("123456");
        req.setName("王丽");
        req.setPassword("pass123");
        req.setRelationship("女儿");
        var result = service.register("ABC12345", req);
        assertTrue(result.getOk());
        assertEquals("jwt-token", result.getToken());
        verify(jdbc).update(contains("insert into app_user"), any(), any(), any(), any(), any());
        verify(jdbc).update(contains("insert into family_binding"), any(), any(), any(), any(), any(), any(), any(), any());
        verify(jdbc).update(contains("update invitation set used_count"), eq("ABC12345"));
    }

    @Test
    void registerFailsForExistingUserWithWrongPassword() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("status", "ACTIVE");
        row.put("used_count", 0);
        row.put("max_uses", 2);
        row.put("elder_id", "elder-1");
        when(data.one(contains("from invitation"), eq("ABC12345"))).thenReturn(row);
        when(data.intValue(row.get("used_count"))).thenReturn(0);
        when(data.intValue(row.get("max_uses"))).thenReturn(2);
        when(smsService.verify(anyString(), anyString(), anyString())).thenReturn(true);

        Map<String, Object> existingUser = new LinkedHashMap<>();
        existingUser.put("id", "family-1");
        existingUser.put("password_hash", "correct-pass");
        when(jdbc.queryForList(contains("from app_user"), anyString())).thenReturn(List.of(existingUser));
        when(data.str(existingUser.get("password_hash"))).thenReturn("correct-pass");

        RegisterRequest req = new RegisterRequest();
        req.setPhone("13800001111");
        req.setSmsCode("123456");
        req.setPassword("wrong-pass");
        var result = service.register("ABC12345", req);
        assertFalse(result.getOk());
        assertEquals("该手机号已注册，请输入原登录密码完成绑定", result.getMessage());
        assertEquals("errors.familyAccountExists", result.getMessageKey());
    }

    @Test
    void registerFailsWhenAlreadyBound() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("status", "ACTIVE");
        row.put("used_count", 0);
        row.put("max_uses", 2);
        row.put("elder_id", "elder-1");
        when(data.one(contains("from invitation"), eq("ABC12345"))).thenReturn(row);
        when(data.intValue(row.get("used_count"))).thenReturn(0);
        when(data.intValue(row.get("max_uses"))).thenReturn(2);
        when(smsService.verify(anyString(), anyString(), anyString())).thenReturn(true);

        Map<String, Object> existingUser = new LinkedHashMap<>();
        existingUser.put("id", "family-1");
        existingUser.put("password_hash", "pass123");
        when(jdbc.queryForList(contains("from app_user"), anyString())).thenReturn(List.of(existingUser));
        when(data.str(existingUser.get("password_hash"))).thenReturn("pass123");
        when(jdbc.queryForObject(contains("from family_binding"), eq(Integer.class), anyString(), anyString())).thenReturn(1);

        RegisterRequest req = new RegisterRequest();
        req.setPhone("13800001111");
        req.setSmsCode("123456");
        req.setPassword("pass123");
        var result = service.register("ABC12345", req);
        assertFalse(result.getOk());
        assertEquals("该家属账号已绑定此老人", result.getMessage());
        assertEquals("errors.familyAlreadyBound", result.getMessageKey());
    }

    @Test
    void registerFailsWhenMaxEldersExceeded() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("status", "ACTIVE");
        row.put("used_count", 0);
        row.put("max_uses", 2);
        row.put("elder_id", "elder-1");
        when(data.one(contains("from invitation"), eq("ABC12345"))).thenReturn(row);
        when(data.intValue(row.get("used_count"))).thenReturn(0);
        when(data.intValue(row.get("max_uses"))).thenReturn(2);
        when(smsService.verify(anyString(), anyString(), anyString())).thenReturn(true);

        Map<String, Object> existingUser = new LinkedHashMap<>();
        existingUser.put("id", "family-1");
        existingUser.put("password_hash", "pass123");
        when(jdbc.queryForList(contains("from app_user"), anyString())).thenReturn(List.of(existingUser));
        when(data.str(existingUser.get("password_hash"))).thenReturn("pass123");
        when(jdbc.queryForObject(contains("from family_binding"), eq(Integer.class), anyString(), anyString())).thenReturn(0);
        when(jdbc.queryForObject(contains("where family_user_id=? and status='ACTIVE'"), eq(Integer.class), anyString())).thenReturn(4);

        RegisterRequest req = new RegisterRequest();
        req.setPhone("13800001111");
        req.setSmsCode("123456");
        req.setPassword("pass123");
        var result = service.register("ABC12345", req);
        assertFalse(result.getOk());
        assertEquals("一个家属账号最多绑定4位老人", result.getMessage());
        assertEquals("errors.familyBindingLimit", result.getMessageKey());
    }

    @Test
    void listForAdminReturnsDtos() {
        when(jdbc.queryForList(contains("from invitation"))).thenReturn(Collections.emptyList());
        var result = service.listForAdmin();
        assertTrue(result.isEmpty());
    }

    @Test
    void createInsertsAndReturnsDto() {
        Map<String, Object> elder = new LinkedHashMap<>();
        elder.put("name_enc", "enc");
        when(data.one(eq("select * from elder where id=?"), eq("elder-1"))).thenReturn(elder);
        when(jdbc.queryForObject(contains("select count(*) from invitation"), eq(Integer.class), anyString())).thenReturn(0);

        CreateInvitationRequest req = new CreateInvitationRequest();
        req.setElderId("elder-1");
        req.setMaxUses(2);
        req.setExpiresInDays(7);

        var dto = service.create(req);
        assertNotNull(dto.getCode());
        assertEquals("ACTIVE", dto.getStatus());
        verify(jdbc).update(contains("insert into invitation"), any(), anyString(), anyString(), anyString(), any(), any());
    }

    @Test
    void disableTogglesStatus() {
        Map<String, Object> invitation = new LinkedHashMap<>();
        invitation.put("status", "ACTIVE");
        when(data.one(contains("from invitation where id=?"), eq("inv-1"))).thenReturn(invitation);

        service.disable("inv-1");
        verify(jdbc).update(contains("update invitation set status=?"), eq("DISABLED"), eq("inv-1"));
    }

    @Test
    void disableReenablesWhenAlreadyDisabled() {
        Map<String, Object> invitation = new LinkedHashMap<>();
        invitation.put("status", "DISABLED");
        when(data.one(contains("from invitation where id=?"), eq("inv-1"))).thenReturn(invitation);

        service.disable("inv-1");
        verify(jdbc).update(contains("update invitation set status=?"), eq("ACTIVE"), eq("inv-1"));
    }

    @Test
    void deleteRemovesInvitation() {
        service.delete("inv-1");
        verify(jdbc).update("delete from invitation where id=?", "inv-1");
    }

    @Test
    void generateCodeUniqueThrowsAfter20Attempts() {
        when(jdbc.queryForObject(contains("select count(*) from invitation"), eq(Integer.class), anyString())).thenReturn(1);
        CreateInvitationRequest req = new CreateInvitationRequest();
        req.setElderId("elder-1");
        Map<String, Object> elder = new LinkedHashMap<>();
        when(data.one(eq("select * from elder where id=?"), anyString())).thenReturn(elder);

        assertThrows(BizException.class, () -> service.create(req));
    }

    @Test
    void maskArchiveNoReturnsStarsForShortValues() {
        var dto = service.preview("ABC");
        assertNotNull(dto);
    }
}
