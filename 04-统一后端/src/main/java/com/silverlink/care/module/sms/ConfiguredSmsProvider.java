package com.silverlink.care.module.sms;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class ConfiguredSmsProvider implements SmsProvider {

    @Value("${silverlink.sms.provider:configured}")
    private String provider;

    @Value("${silverlink.sms.access-key:}")
    private String accessKey;

    @Value("${silverlink.sms.secret:}")
    private String secret;

    @Value("${silverlink.sms.sign-name:}")
    private String signName;

    @Value("${silverlink.sms.template-code:}")
    private String templateCode;

    @Value("${silverlink.sms.mock-enabled:false}")
    private boolean mockEnabled;

    @Value("${silverlink.sms.http-endpoint:}")
    private String httpEndpoint;

    @Value("${silverlink.sms.http-auth-header:Authorization}")
    private String httpAuthHeader;

    @Value("${silverlink.sms.http-auth-token:}")
    private String httpAuthToken;

    @Value("${silverlink.sms.http-timeout-seconds:10}")
    private long httpTimeoutSeconds;

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder().build();

    public ConfiguredSmsProvider(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void sendCode(String phone, String code) {
        if (mockEnabled || "mock".equalsIgnoreCase(provider)) {
            System.out.println("[silverlink-sms] mock send to " + phone + " code=" + code);
            return;
        }
        if (accessKey.isBlank() || secret.isBlank() || signName.isBlank() || templateCode.isBlank()) {
            if (httpEndpoint.isBlank()) {
                throw new RuntimeException("短信服务未配置");
            }
        }
        if (!httpEndpoint.isBlank()) {
            sendByHttpGateway(phone, code);
            return;
        }
        throw new RuntimeException("短信服务商适配器未启用：" + provider);
    }

    private void sendByHttpGateway(String phone, String code) {
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("phone", phone);
            payload.put("code", code);
            payload.put("provider", provider);
            payload.put("signName", signName);
            payload.put("templateCode", templateCode);
            payload.put("accessKey", accessKey);
            payload.put("secret", secret);

            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create(httpEndpoint))
                    .timeout(Duration.ofSeconds(Math.max(httpTimeoutSeconds, 1)))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)));

            if (!httpAuthToken.isBlank()) {
                builder.header(httpAuthHeader, httpAuthToken);
            }

            HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new RuntimeException("短信网关请求失败: HTTP " + response.statusCode());
            }
        } catch (Exception ex) {
            throw new RuntimeException("短信发送失败: " + ex.getMessage(), ex);
        }
    }
}
