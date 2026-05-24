package com.silverlink.care.module.scan;

import com.silverlink.care.common.BizException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

@Service
public class WeChatAuthService {

    @Value("${silverlink.wechat.openid-salt:demo-wechat-openid-salt}")
    private String openidSalt;

    @Value("${silverlink.wechat.app-id:}")
    private String appId;

    @Value("${silverlink.wechat.app-secret:}")
    private String appSecret;

    @Value("${silverlink.wechat.code2session-url:https://api.weixin.qq.com/sns/jscode2session}")
    private String code2sessionUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public String resolveOpenId(String code) {
        if (code == null || code.isBlank()) {
            throw new BizException(400, "missing wechat auth code");
        }
        String normalizedCode = code.trim();
        if (!appId.isBlank() && !appSecret.isBlank()) {
            return resolveRemoteOpenId(normalizedCode);
        }
        return resolveLocalOpenId(normalizedCode);
    }

    private String resolveRemoteOpenId(String code) {
        try {
            String requestUrl = UriComponentsBuilder
                    .fromHttpUrl(code2sessionUrl)
                    .queryParam("appid", appId)
                    .queryParam("secret", appSecret)
                    .queryParam("js_code", code)
                    .queryParam("grant_type", "authorization_code")
                    .toUriString();
            Map<?, ?> body = restTemplate.getForObject(requestUrl, Map.class);
            if (body == null) {
                throw new BizException(502, "wechat auth empty response");
            }
            Object openid = body.get("openid");
            if (openid != null && !String.valueOf(openid).isBlank()) {
                return String.valueOf(openid);
            }
            Object errMsg = body.get("errmsg");
            Object errCode = body.get("errcode");
            throw new BizException(502, "wechat auth failed: " + (errMsg == null ? errCode : errMsg));
        } catch (Exception ex) {
            if (ex instanceof BizException bizException) {
                throw bizException;
            }
            throw new BizException(502, "failed to resolve wechat openid");
        }
    }

    private String resolveLocalOpenId(String code) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest((openidSalt + ":" + code).getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder("wx_");
            for (int i = 0; i < 12 && i < hash.length; i++) {
                builder.append(String.format("%02x", hash[i]));
            }
            return builder.toString();
        } catch (Exception ex) {
            throw new BizException(500, "failed to resolve openid");
        }
    }
}
