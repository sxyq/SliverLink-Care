package com.silverlink.care.module.scan;

import com.silverlink.care.common.BizException;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class WeChatAuthServiceTest {

    @Test
    void shouldGenerateStableOpenId() {
        WeChatAuthService service = new WeChatAuthService();
        ReflectionTestUtils.setField(service, "openidSalt", "test-salt");
        ReflectionTestUtils.setField(service, "appId", "");
        ReflectionTestUtils.setField(service, "appSecret", "");

        String first = service.resolveOpenId("auth-code-1");
        String second = service.resolveOpenId("auth-code-1");

        Assertions.assertEquals(first, second);
        Assertions.assertTrue(first.startsWith("wx_"));
    }

    @Test
    void shouldRejectMissingCode() {
        WeChatAuthService service = new WeChatAuthService();
        ReflectionTestUtils.setField(service, "openidSalt", "test-salt");
        ReflectionTestUtils.setField(service, "appId", "");
        ReflectionTestUtils.setField(service, "appSecret", "");

        BizException ex = Assertions.assertThrows(BizException.class, () -> service.resolveOpenId(""));
        Assertions.assertEquals(400, ex.getCode());
    }
}
