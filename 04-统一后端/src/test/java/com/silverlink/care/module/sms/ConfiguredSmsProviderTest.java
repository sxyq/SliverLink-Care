package com.silverlink.care.module.sms;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.net.http.HttpClient;
import java.net.http.HttpResponse;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ConfiguredSmsProviderTest {

    private ConfiguredSmsProvider provider;

    @BeforeEach
    void setUp() {
        provider = new ConfiguredSmsProvider(new ObjectMapper());
        ReflectionTestUtils.setField(provider, "provider", "configured");
        ReflectionTestUtils.setField(provider, "accessKey", "");
        ReflectionTestUtils.setField(provider, "secret", "");
        ReflectionTestUtils.setField(provider, "signName", "");
        ReflectionTestUtils.setField(provider, "templateCode", "");
        ReflectionTestUtils.setField(provider, "mockEnabled", false);
        ReflectionTestUtils.setField(provider, "httpEndpoint", "");
        ReflectionTestUtils.setField(provider, "httpAuthHeader", "Authorization");
        ReflectionTestUtils.setField(provider, "httpAuthToken", "");
        ReflectionTestUtils.setField(provider, "httpTimeoutSeconds", 10L);
    }

    @Test
    void sendCode_mockEnabled_returnsNormally() {
        ReflectionTestUtils.setField(provider, "mockEnabled", true);

        assertDoesNotThrow(() -> provider.sendCode("13800138000", "123456"));
    }

    @Test
    void sendCode_providerMock_returnsNormally() {
        ReflectionTestUtils.setField(provider, "provider", "mock");

        assertDoesNotThrow(() -> provider.sendCode("13800138000", "123456"));
    }

    @Test
    void sendCode_providerMockCaseInsensitive_returnsNormally() {
        ReflectionTestUtils.setField(provider, "provider", "MOCK");

        assertDoesNotThrow(() -> provider.sendCode("13800138000", "123456"));
    }

    @Test
    void sendCode_noConfigNoEndpoint_throwsRuntimeException() {
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> provider.sendCode("13800138000", "123456"));
        assertEquals("短信服务未配置", ex.getMessage());
    }

    @Test
    void sendCode_partialConfigNoEndpoint_throwsRuntimeException() {
        ReflectionTestUtils.setField(provider, "accessKey", "some-key");
        ReflectionTestUtils.setField(provider, "secret", "");
        ReflectionTestUtils.setField(provider, "signName", "签名");
        ReflectionTestUtils.setField(provider, "templateCode", "TPL_001");

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> provider.sendCode("13800138000", "123456"));
        assertEquals("短信服务未配置", ex.getMessage());
    }

    @Test
    void sendCode_fullConfigNoEndpoint_throwsProviderNotEnabled() {
        ReflectionTestUtils.setField(provider, "accessKey", "some-key");
        ReflectionTestUtils.setField(provider, "secret", "some-secret");
        ReflectionTestUtils.setField(provider, "signName", "签名");
        ReflectionTestUtils.setField(provider, "templateCode", "TPL_001");

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> provider.sendCode("13800138000", "123456"));
        assertTrue(ex.getMessage().contains("短信服务商适配器未启用"));
    }

    @Test
    void sendCode_fullConfigNoEndpoint_customProvider_throwsWithProviderName() {
        ReflectionTestUtils.setField(provider, "provider", "aliyun");
        ReflectionTestUtils.setField(provider, "accessKey", "some-key");
        ReflectionTestUtils.setField(provider, "secret", "some-secret");
        ReflectionTestUtils.setField(provider, "signName", "签名");
        ReflectionTestUtils.setField(provider, "templateCode", "TPL_001");

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> provider.sendCode("13800138000", "123456"));
        assertTrue(ex.getMessage().contains("aliyun"));
    }

    @Test
    void sendCode_withHttpEndpoint_callsGateway() throws Exception {
        ReflectionTestUtils.setField(provider, "httpEndpoint", "http://localhost:9999/sms");
        ReflectionTestUtils.setField(provider, "accessKey", "key");
        ReflectionTestUtils.setField(provider, "secret", "secret");
        ReflectionTestUtils.setField(provider, "signName", "签名");
        ReflectionTestUtils.setField(provider, "templateCode", "TPL_001");

        HttpClient mockClient = mock(HttpClient.class);
        @SuppressWarnings("unchecked")
        HttpResponse<String> mockResponse = mock(HttpResponse.class);
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockClient.send(any(), any(HttpResponse.BodyHandler.class))).thenReturn(mockResponse);
        ReflectionTestUtils.setField(provider, "httpClient", mockClient);

        assertDoesNotThrow(() -> provider.sendCode("13800138000", "123456"));
        verify(mockClient).send(any(), any(HttpResponse.BodyHandler.class));
    }

    @Test
    void sendCode_withHttpEndpoint_non2xx_throwsRuntimeException() throws Exception {
        ReflectionTestUtils.setField(provider, "httpEndpoint", "http://localhost:9999/sms");
        ReflectionTestUtils.setField(provider, "accessKey", "key");
        ReflectionTestUtils.setField(provider, "secret", "secret");
        ReflectionTestUtils.setField(provider, "signName", "签名");
        ReflectionTestUtils.setField(provider, "templateCode", "TPL_001");

        HttpClient mockClient = mock(HttpClient.class);
        @SuppressWarnings("unchecked")
        HttpResponse<String> mockResponse = mock(HttpResponse.class);
        when(mockResponse.statusCode()).thenReturn(500);
        when(mockClient.send(any(), any(HttpResponse.BodyHandler.class))).thenReturn(mockResponse);
        ReflectionTestUtils.setField(provider, "httpClient", mockClient);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> provider.sendCode("13800138000", "123456"));
        assertTrue(ex.getMessage().contains("短信发送失败"));
    }

    @Test
    void sendCode_withHttpEndpoint_httpClientThrows_throwsRuntimeException() throws Exception {
        ReflectionTestUtils.setField(provider, "httpEndpoint", "http://localhost:9999/sms");
        ReflectionTestUtils.setField(provider, "accessKey", "key");
        ReflectionTestUtils.setField(provider, "secret", "secret");
        ReflectionTestUtils.setField(provider, "signName", "签名");
        ReflectionTestUtils.setField(provider, "templateCode", "TPL_001");

        HttpClient mockClient = mock(HttpClient.class);
        when(mockClient.send(any(), any(HttpResponse.BodyHandler.class)))
                .thenThrow(new java.net.ConnectException("Connection refused"));
        ReflectionTestUtils.setField(provider, "httpClient", mockClient);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> provider.sendCode("13800138000", "123456"));
        assertTrue(ex.getMessage().contains("短信发送失败"));
    }

    @Test
    void sendCode_withHttpEndpoint_andAuthToken_sendsWithAuth() throws Exception {
        ReflectionTestUtils.setField(provider, "httpEndpoint", "http://localhost:9999/sms");
        ReflectionTestUtils.setField(provider, "accessKey", "key");
        ReflectionTestUtils.setField(provider, "secret", "secret");
        ReflectionTestUtils.setField(provider, "signName", "签名");
        ReflectionTestUtils.setField(provider, "templateCode", "TPL_001");
        ReflectionTestUtils.setField(provider, "httpAuthToken", "Bearer my-token");
        ReflectionTestUtils.setField(provider, "httpAuthHeader", "X-Auth-Token");

        HttpClient mockClient = mock(HttpClient.class);
        @SuppressWarnings("unchecked")
        HttpResponse<String> mockResponse = mock(HttpResponse.class);
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockClient.send(any(), any(HttpResponse.BodyHandler.class))).thenReturn(mockResponse);
        ReflectionTestUtils.setField(provider, "httpClient", mockClient);

        assertDoesNotThrow(() -> provider.sendCode("13800138000", "123456"));
        verify(mockClient).send(any(), any(HttpResponse.BodyHandler.class));
    }

    @Test
    void sendCode_noConfigButHasEndpoint_callsGateway() throws Exception {
        ReflectionTestUtils.setField(provider, "httpEndpoint", "http://localhost:9999/sms");

        HttpClient mockClient = mock(HttpClient.class);
        @SuppressWarnings("unchecked")
        HttpResponse<String> mockResponse = mock(HttpResponse.class);
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockClient.send(any(), any(HttpResponse.BodyHandler.class))).thenReturn(mockResponse);
        ReflectionTestUtils.setField(provider, "httpClient", mockClient);

        assertDoesNotThrow(() -> provider.sendCode("13800138000", "123456"));
        verify(mockClient).send(any(), any(HttpResponse.BodyHandler.class));
    }

    @Test
    void sendCode_mockEnabledTakesPrecedenceOverEndpoint() {
        ReflectionTestUtils.setField(provider, "mockEnabled", true);
        ReflectionTestUtils.setField(provider, "httpEndpoint", "http://localhost:9999/sms");

        assertDoesNotThrow(() -> provider.sendCode("13800138000", "123456"));
    }
}
