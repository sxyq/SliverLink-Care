package com.silverlink.care.common;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

public final class CursorCodec {
    private static final ObjectMapper JSON = new ObjectMapper();

    private CursorCodec() {
    }

    public static String encode(Map<String, String> fields) {
        try {
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(JSON.writeValueAsBytes(fields));
        } catch (Exception exception) {
            throw new BizException(400, "无法生成分页游标");
        }
    }

    @SuppressWarnings("unchecked")
    public static Map<String, String> decode(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return Map.of();
        }
        try {
            byte[] decoded = Base64.getUrlDecoder().decode(cursor.getBytes(StandardCharsets.US_ASCII));
            Map<String, Object> raw = JSON.readValue(decoded, Map.class);
            return raw.entrySet().stream().collect(java.util.stream.Collectors.toUnmodifiableMap(
                    Map.Entry::getKey,
                    entry -> String.valueOf(entry.getValue())
            ));
        } catch (Exception exception) {
            throw new BizException(400, "分页游标无效");
        }
    }
}
