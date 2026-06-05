package com.silverlink.care.module.scan;

import com.silverlink.care.common.BizException;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

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

    @Test
    void shouldResolveRemoteOpenIdWhenWechatCredentialsExist() {
        WeChatAuthService service = new WeChatAuthService();
        RestTemplate restTemplate = mock(RestTemplate.class);
        ReflectionTestUtils.setField(service, "appId", "wx-app");
        ReflectionTestUtils.setField(service, "appSecret", "wx-secret");
        ReflectionTestUtils.setField(service, "code2sessionUrl", "https://example.com/code2session");
        ReflectionTestUtils.setField(service, "restTemplate", restTemplate);
        when(restTemplate.getForObject(anyString(), eq(Map.class))).thenReturn(Map.of("openid", "openid-1"));

        Assertions.assertEquals("openid-1", service.resolveOpenId(" code-1 "));
    }

    @Test
    void shouldFailWhenRemoteWechatResponseIsEmptyOrReturnsError() {
        WeChatAuthService service = new WeChatAuthService();
        RestTemplate restTemplate = mock(RestTemplate.class);
        ReflectionTestUtils.setField(service, "appId", "wx-app");
        ReflectionTestUtils.setField(service, "appSecret", "wx-secret");
        ReflectionTestUtils.setField(service, "restTemplate", restTemplate);

        when(restTemplate.getForObject(anyString(), eq(Map.class))).thenReturn(null);
        BizException empty = Assertions.assertThrows(BizException.class, () -> service.resolveOpenId("code-1"));
        Assertions.assertEquals(502, empty.getCode());

        when(restTemplate.getForObject(anyString(), eq(Map.class))).thenReturn(Map.of("errcode", 40125, "errmsg", "invalid appid"));
        BizException failure = Assertions.assertThrows(BizException.class, () -> service.resolveOpenId("code-2"));
        Assertions.assertEquals(502, failure.getCode());
    }
}
